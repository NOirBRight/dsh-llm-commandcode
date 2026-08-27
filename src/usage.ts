/** Host-only Command Code account credit and quota reporting. */

import {
  attributionHeaders,
  INVALID_CREDENTIAL_CODE,
  LlmError,
  normalizeApiKey,
} from '@deepseek-ai/dsh-llm'
import type {
  CommandCodeUsageCredits,
  CommandCodeUsagePlan,
  CommandCodeUsageRead,
  CommandCodeUsageSummary,
  CommandCodeUsageView,
  CommandCodeUsageWindow,
} from './types.ts'
import { readBoundedText } from './http.ts'

export const USAGE_TIMEOUT_MS = 15_000
export const USAGE_UNSUPPORTED = 'COMMANDCODE_USAGE_UNSUPPORTED'
export const USAGE_FAILED = 'COMMANDCODE_USAGE_FAILED'
export const MAX_USAGE_BYTES = 2 * 1024 * 1024
const ACCOUNT_API_BASE_URL = 'https://api.commandcode.ai'

export interface CommandCodeUsageRequest {
  signal?: AbortSignal
}

interface FetchResult {
  body: Record<string, unknown>
  status: number
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function nestedRecord(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!record(value)) return undefined
  return record(value[key]) ? value[key] : undefined
}

function asEpoch(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }
  if (typeof value === 'string' && value.length > 0) {
    const time = Date.parse(value)
    return Number.isNaN(time) ? undefined : new Date(time).toISOString()
  }
  return undefined
}

function query(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, value)
  const encoded = search.toString()
  return encoded.length === 0 ? path : path + '?' + encoded
}

function usableKey(raw: string): string {
  const checked = normalizeApiKey(raw)
  if (checked.ok) return checked.value
  throw new LlmError(
    checked.reason === 'empty' ? 'Command Code API key is blank' : 'Command Code API key contains invalid header characters',
    INVALID_CREDENTIAL_CODE,
  )
}

function unwrapData(body: Record<string, unknown>): Record<string, unknown> {
  let value = body
  for (let index = 0; index < 3; index += 1) {
    if (!record(value.data)) break
    value = value.data
  }
  return value
}

function parseWindow(value: unknown): CommandCodeUsageWindow | undefined {
  if (!record(value)) return undefined
  const used = numberValue(value.used ?? value.usage ?? value.consumed)
  const cap = numberValue(value.cap ?? value.limit ?? value.total)
  if (used === undefined || cap === undefined) return undefined
  const resetAt = asEpoch(value.resetAt ?? value.reset_at ?? value.resetsAt ?? value.resets_at ?? value.reset)
  return {
    used,
    cap,
    ...(typeof value.exceeded === 'boolean' ? { exceeded: value.exceeded } : {}),
    ...(resetAt === undefined ? {} : { resetAt }),
  }
}

function parseCredits(body: Record<string, unknown>): CommandCodeUsageCredits | undefined {
  const root = unwrapData(body)
  const credits = nestedRecord(root, 'credits') ?? root
  const windowRoot = nestedRecord(root, 'windowLimits') ?? nestedRecord(credits, 'windowLimits')
  const fiveHour = parseWindow(windowRoot?.fiveHour ?? windowRoot?.five_hour)
  const weekly = parseWindow(windowRoot?.weekly)
  const monthlyCredits = numberValue(credits.monthlyCredits)
  const purchasedCredits = numberValue(credits.purchasedCredits)
  const freeCredits = numberValue(credits.freeCredits)
  const result: CommandCodeUsageCredits = {
    ...(monthlyCredits === undefined ? {} : { monthlyCredits }),
    ...(purchasedCredits === undefined ? {} : { purchasedCredits }),
    ...(freeCredits === undefined ? {} : { freeCredits }),
    ...(fiveHour === undefined ? {} : { fiveHour }),
    ...(weekly === undefined ? {} : { weekly }),
  }
  return Object.keys(result).length === 0 ? undefined : result
}

const PLAN_NAMES: Readonly<Record<string, string>> = {
  'individual-go': 'Go',
  'individual-goat': 'GOAT',
  'individual-pro': 'Pro',
  'individual-pro-v1': 'Pro',
  'individual-provider': 'Provider',
  'individual-max': 'Max',
  'individual-ultra': 'Ultra',
  'teams-pro': 'Teams Pro',
}

function planName(planId: string | undefined): string | undefined {
  if (planId === undefined) return undefined
  const key = Object.keys(PLAN_NAMES).sort((a, b) => b.length - a.length).find(item => planId.toLowerCase().startsWith(item))
  return key === undefined ? planId : PLAN_NAMES[key]
}

function parsePlan(body: Record<string, unknown>): CommandCodeUsagePlan | undefined {
  const value = unwrapData(body)
  const credits = nestedRecord(value, 'credits')
  const planId = stringValue(value.planId) ?? stringValue(credits?.planId)
  const name = stringValue(value.planName) ?? stringValue(value.name) ?? planName(planId)
  const status = stringValue(value.status)
  const currentPeriodEnd = asEpoch(value.currentPeriodEnd ?? value.current_period_end)
  if (planId === undefined && name === undefined && status === undefined && currentPeriodEnd === undefined) return undefined
  return {
    ...(planId === undefined ? {} : { planId }),
    ...(name === undefined ? {} : { name }),
    ...(status === undefined ? {} : { status }),
    ...(currentPeriodEnd === undefined ? {} : { currentPeriodEnd }),
  }
}

function parseSummary(body: Record<string, unknown>): CommandCodeUsageSummary | undefined {
  const value = unwrapData(body)
  const aliases: Record<keyof CommandCodeUsageSummary, readonly string[]> = {
    totalCost: ['totalCost', 'total_cost'],
    totalTokensIn: ['totalTokensIn', 'total_tokens_in', 'inputTokens'],
    totalTokensOut: ['totalTokensOut', 'total_tokens_out', 'outputTokens'],
    totalCount: ['totalCount', 'total_count'],
    completedCount: ['completedCount', 'completed_count'],
    failedCount: ['failedCount', 'failed_count'],
  }
  const result: CommandCodeUsageSummary = {}
  for (const key of Object.keys(aliases) as (keyof CommandCodeUsageSummary)[]) {
    const valueForKey = aliases[key].map(alias => numberValue(value[alias])).find(item => item !== undefined)
    if (valueForKey !== undefined) result[key] = valueForKey
  }
  return Object.keys(result).length === 0 ? undefined : result
}

function parseAccount(body: Record<string, unknown>): { name?: string; userName?: string } | undefined {
  const user = nestedRecord(body, 'user') ?? nestedRecord(unwrapData(body), 'user')
  if (user === undefined) return undefined
  const name = stringValue(user.name)
  const userName = stringValue(user.userName) ?? stringValue(user.username)
  if (name === undefined && userName === undefined) return undefined
  return {
    ...(name === undefined ? {} : { name }),
    ...(userName === undefined ? {} : { userName }),
  }
}

function orgId(body: Record<string, unknown>): string | undefined {
  const org = nestedRecord(body, 'org') ?? nestedRecord(unwrapData(body), 'org')
  return stringValue(org?.id)
}

function periodStart(body: Record<string, unknown>): string | undefined {
  const value = unwrapData(body)
  return asEpoch(value.currentPeriodStart ?? value.current_period_start)
}

async function fetchJSON(
  url: string,
  apiKey: string,
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
): Promise<FetchResult> {
  const timeout = AbortSignal.timeout(USAGE_TIMEOUT_MS)
  const combined = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: 'Bearer ' + apiKey,
      ...attributionHeaders(),
    },
    redirect: 'error',
    signal: combined,
  })
  if (!response.ok) {
    await response.body?.cancel()
    return { body: {}, status: response.status }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(await readBoundedText(response, MAX_USAGE_BYTES, url, USAGE_FAILED, combined))
  } catch (error: unknown) {
    if (error instanceof LlmError) throw error
    throw new LlmError('Command Code usage endpoint did not return JSON', USAGE_FAILED, { cause: error })
  }
  if (!record(parsed)) throw new LlmError('Command Code usage endpoint returned a non-object response', USAGE_FAILED)
  return { body: parsed, status: response.status }
}

/** Parse a report from endpoint bodies; exported for deterministic unit tests. */
export function parseCommandCodeUsageBodies(input: {
  whoami?: Record<string, unknown>
  credits?: Record<string, unknown>
  subscription?: Record<string, unknown>
  summary?: Record<string, unknown>
  failures?: string[]
  now?: string
}): CommandCodeUsageView {
  const view: CommandCodeUsageView = {
    fetchedAt: input.now ?? new Date().toISOString(),
    failures: [...input.failures ?? []],
  }
  if (input.whoami !== undefined) {
    const account = parseAccount(input.whoami)
    if (account !== undefined) view.account = account
  }
  if (input.credits !== undefined) {
    const credits = parseCredits(input.credits)
    if (credits !== undefined) view.credits = credits
  }
  const plan = input.subscription === undefined
    ? input.credits === undefined ? undefined : parsePlan(input.credits)
    : parsePlan(input.subscription)
  if (plan !== undefined) view.plan = plan
  if (input.summary !== undefined) {
    const summary = parseSummary(input.summary)
    if (summary !== undefined) view.summary = summary
  }
  return view
}

/** Query account credits and rolling quota windows without making a model call. */
export async function readCommandCodeUsage(
  request: CommandCodeUsageRequest,
  resolveCredential: () => Promise<string | undefined>,
  fetchImpl: typeof fetch = fetch,
): Promise<CommandCodeUsageRead> {
  const supplied = await resolveCredential()
  if (supplied === undefined || supplied.trim().length === 0) {
    throw new LlmError('Command Code usage requires a configured API key', 'MISSING_CREDENTIAL')
  }
  const apiKey = usableKey(supplied)
  const base = ACCOUNT_API_BASE_URL
  const failures: string[] = []
  const statuses: number[] = []
  const get = async (path: string): Promise<Record<string, unknown> | undefined> => {
    try {
      const result = await fetchJSON(base + path, apiKey, request.signal, fetchImpl)
      if (result.status < 200 || result.status >= 300) {
        statuses.push(result.status)
        failures.push(path + ': HTTP ' + String(result.status))
        return undefined
      }
      return result.body
    } catch (error: unknown) {
      if (request.signal?.aborted) throw new LlmError('Command Code usage read aborted', 'ABORTED', { cause: error })
      if (error instanceof LlmError && error.code === USAGE_FAILED) {
        failures.push(path + ': ' + error.message)
      } else {
        failures.push(path + ': network error')
      }
      return undefined
    }
  }

  const whoami = await get('/alpha/whoami')
  const id = whoami === undefined ? undefined : orgId(whoami)
  const [credits, subscription] = await Promise.all([
    get(query('/alpha/billing/credits', { orgId: id })),
    get(query('/alpha/billing/subscriptions', { orgId: id })),
  ])
  const since = subscription === undefined ? undefined : periodStart(subscription)
  const summary = await get(query('/alpha/usage/summary', { orgId: id, since }))
  const view = parseCommandCodeUsageBodies({
    ...(whoami === undefined ? {} : { whoami }),
    ...(credits === undefined ? {} : { credits }),
    ...(subscription === undefined ? {} : { subscription }),
    ...(summary === undefined ? {} : { summary }),
    failures,
  })
  const hasData = view.account !== undefined || view.credits !== undefined || view.plan !== undefined || view.summary !== undefined
  if (!hasData && statuses.length > 0 && statuses.every(status => status === 404)) return { status: 'unsupported' }
  return { status: 'ok', usage: view }
}
