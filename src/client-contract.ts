/** Browser-safe constants and JSON decoders for the Command Code plugin. */

import type {
  CommandCodeModelConfig,
  CommandCodeUsageRead,
  CommandCodeUsageView,
  CommandCodeUsageWindow,
} from './types.ts'
import { isPositiveInteger } from './numbers.ts'
import { effortsForCommandCodeModel } from './reasoning-catalog.ts'

export type {
  CommandCodeModelConfig,
  CommandCodeUsageRead,
  CommandCodeUsageView,
  CommandCodeUsageWindow,
} from './types.ts'

export const COMMANDCODE_SETTINGS_NAMESPACE = 'llm-commandcode'
export const COMMANDCODE_PROVIDER = 'commandcode'
export const DEFAULT_API_KEY_ENV = 'COMMANDCODE_API_KEY'
export const PUBLIC_PROVIDER_BASE_URL = 'https://api.commandcode.ai/provider/v1'
export const DEFAULT_CONTEXT_WINDOW = 1_000_000
export const DEFAULT_MAX_TOKENS = 32_768
export const DEFAULT_REQUEST_TIMEOUT_MS = 60_000
export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 300_000
export const COMMANDCODE_RPC_CHANNEL = '/commandcode'
export const COMMANDCODE_DISCOVER_ENDPOINT = 'models/discover'
export const COMMANDCODE_SAVE_ENDPOINT = 'settings/save'
export const COMMANDCODE_USAGE_ENDPOINT = 'usage/read'

/** Settings section mirrored to the browser without a secret. */
export interface CommandCodeSettingsView {
  apiKeyEnv: string
  models: CommandCodeModelConfig[]
  defaultContextWindow: number
  defaultMaxTokens: number
  requestTimeoutMs: number
  streamIdleTimeoutMs: number
  zeroDataRetention: boolean
  usageEnabled: boolean
}

export interface CommandCodeDiscoveryRequest {
  /** Host-only cancellation; omitted from browser JSON. */
  signal?: AbortSignal
}

export interface CommandCodeDiscoveryResult {
  models: CommandCodeModelConfig[]
  warnings: string[]
}

export interface CommandCodeSaveRequest {
  settings: Omit<CommandCodeSettingsView, 'apiKeyEnv'>
  expectedRevision: number
}

export interface CommandCodeSaveResult {
  settings: CommandCodeSettingsView
  revision: number
}

export interface CommandCodeUsageRequest {
  /** Reserved for a future server-owned usage query option; no endpoint is client-controlled. */
}

export interface CommandCodeUsageReply {
  status: 'ok' | 'unsupported'
  usage?: CommandCodeUsageView
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalPositiveInteger(value: unknown): value is number | undefined {
  return value === undefined || isPositiveInteger(value)
}

/** Decode one model while preserving only known JSON fields. */
export function decodeCommandCodeModel(value: unknown): CommandCodeModelConfig | undefined {
  if (!record(value) || typeof value.id !== 'string' || value.id.length === 0) return undefined
  if (value.name !== undefined && typeof value.name !== 'string') return undefined
  if (value.description !== undefined && typeof value.description !== 'string') return undefined
  if (!optionalPositiveInteger(value.contextWindow)) return undefined
  if (!optionalPositiveInteger(value.contextWindowOverride)) return undefined
  if (!optionalPositiveInteger(value.maxTokens)) return undefined
  if (value.reasoningEfforts !== undefined) return undefined
  if (value.defaultEffort !== undefined) {
    if (typeof value.defaultEffort !== 'string' || value.defaultEffort.length === 0) return undefined
    if (!effortsForCommandCodeModel({ id: value.id }).includes(value.defaultEffort)) return undefined
  }
  let modalities: ('text' | 'image')[] | undefined
  if (value.inputModalities !== undefined) {
    if (!Array.isArray(value.inputModalities)) return undefined
    const normalized = value.inputModalities.length === 0 ? ['text'] : value.inputModalities
    if (normalized.some(item => item !== 'text' && item !== 'image')) return undefined
    if (new Set(normalized).size !== normalized.length) return undefined
    modalities = [...normalized] as ('text' | 'image')[]
  }
  return {
    id: value.id,
    ...(value.name === undefined ? {} : { name: value.name }),
    ...(value.description === undefined ? {} : { description: value.description }),
    ...(value.contextWindow === undefined ? {} : { contextWindow: value.contextWindow }),
    ...(value.contextWindowOverride === undefined ? {} : { contextWindowOverride: value.contextWindowOverride }),
    ...(value.maxTokens === undefined ? {} : { maxTokens: value.maxTokens }),
    ...(value.defaultEffort === undefined ? {} : { defaultEffort: value.defaultEffort }),
    ...(modalities === undefined ? {} : { inputModalities: modalities }),
  }
}

export function decodeCommandCodeSettings(value: unknown): CommandCodeSettingsView | undefined {
  if (!record(value)) return undefined
  const modelsValue = value.models
  if (typeof value.apiKeyEnv !== 'string' || value.apiKeyEnv.length === 0) return undefined
  if (!Array.isArray(modelsValue)) return undefined
  if (!isPositiveInteger(value.defaultContextWindow) || !isPositiveInteger(value.defaultMaxTokens)) return undefined
  if (!isPositiveInteger(value.requestTimeoutMs) || !isPositiveInteger(value.streamIdleTimeoutMs)) return undefined
  if (typeof value.zeroDataRetention !== 'boolean' || typeof value.usageEnabled !== 'boolean') return undefined
  const models: CommandCodeModelConfig[] = []
  const ids = new Set<string>()
  for (const item of modelsValue) {
    const model = decodeCommandCodeModel(item)
    if (model === undefined || ids.has(model.id)) return undefined
    ids.add(model.id)
    models.push(model)
  }
  return {
    apiKeyEnv: value.apiKeyEnv,
    models,
    defaultContextWindow: value.defaultContextWindow,
    defaultMaxTokens: value.defaultMaxTokens,
    requestTimeoutMs: value.requestTimeoutMs,
    streamIdleTimeoutMs: value.streamIdleTimeoutMs,
    zeroDataRetention: value.zeroDataRetention,
    usageEnabled: value.usageEnabled,
  }
}

export function decodeCommandCodeDiscoveryRequest(value: unknown): CommandCodeDiscoveryRequest | undefined {
  if (!record(value) || Object.keys(value).length !== 0) return undefined
  return {}
}

export function decodeCommandCodeDiscoveryResult(value: unknown): CommandCodeDiscoveryResult | undefined {
  if (!record(value) || !Array.isArray(value.models) || !Array.isArray(value.warnings)) return undefined
  const models: CommandCodeModelConfig[] = []
  for (const item of value.models) {
    const model = decodeCommandCodeModel(item)
    if (model === undefined) return undefined
    models.push(model)
  }
  if (value.warnings.some(item => typeof item !== 'string')) return undefined
  return { models, warnings: [...value.warnings] }
}

export function decodeCommandCodeSaveRequest(value: unknown): CommandCodeSaveRequest | undefined {
  if (!record(value)) return undefined
  const expectedRevision = value.expectedRevision
  if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return undefined
  const settings = value.settings
  if (!record(settings)) return undefined
  const decoded = decodeCommandCodeSettings({ apiKeyEnv: DEFAULT_API_KEY_ENV, ...settings })
  if (decoded === undefined) return undefined
  const { apiKeyEnv: _apiKeyEnv, ...withoutKey } = decoded
  return { settings: withoutKey, expectedRevision: expectedRevision as number }
}

export function decodeCommandCodeSaveResult(value: unknown): CommandCodeSaveResult | undefined {
  if (!record(value)) return undefined
  const revision = value.revision
  if (!Number.isSafeInteger(revision) || (revision as number) < 0) return undefined
  const settings = decodeCommandCodeSettings(value.settings)
  return settings === undefined ? undefined : { settings, revision: revision as number }
}

function decodeUsageWindow(value: unknown): CommandCodeUsageWindow | undefined {
  if (!record(value) || !positiveOrZero(value.used) || !positiveOrZero(value.cap)) return undefined
  if (value.exceeded !== undefined && typeof value.exceeded !== 'boolean') return undefined
  if (value.resetAt !== undefined && typeof value.resetAt !== 'string') return undefined
  return {
    used: value.used,
    cap: value.cap,
    ...(value.exceeded === undefined ? {} : { exceeded: value.exceeded }),
    ...(value.resetAt === undefined ? {} : { resetAt: value.resetAt }),
  }
}

function positiveOrZero(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Decode the secret-free usage snapshot returned by the Host. */
export function decodeCommandCodeUsageView(value: unknown): CommandCodeUsageView | undefined {
  if (!record(value) || typeof value.fetchedAt !== 'string' || !Array.isArray(value.failures)) return undefined
  if (value.failures.some(item => typeof item !== 'string')) return undefined
  const usage: CommandCodeUsageView = { fetchedAt: value.fetchedAt, failures: [...value.failures] }
  if (value.account !== undefined) {
    if (!record(value.account)) return undefined
    if (value.account.name !== undefined && typeof value.account.name !== 'string') return undefined
    if (value.account.userName !== undefined && typeof value.account.userName !== 'string') return undefined
    usage.account = {
      ...(value.account.name === undefined ? {} : { name: value.account.name }),
      ...(value.account.userName === undefined ? {} : { userName: value.account.userName }),
    }
  }
  if (value.credits !== undefined) {
    if (!record(value.credits)) return undefined
    const credits = value.credits
    const monthlyCredits = credits.monthlyCredits
    const purchasedCredits = credits.purchasedCredits
    const freeCredits = credits.freeCredits
    if (!positiveOrZero(monthlyCredits) && monthlyCredits !== undefined) return undefined
    if (!positiveOrZero(purchasedCredits) && purchasedCredits !== undefined) return undefined
    if (!positiveOrZero(freeCredits) && freeCredits !== undefined) return undefined
    const decodedCredits: NonNullable<CommandCodeUsageView['credits']> = {
      ...(monthlyCredits === undefined ? {} : { monthlyCredits }),
      ...(purchasedCredits === undefined ? {} : { purchasedCredits }),
      ...(freeCredits === undefined ? {} : { freeCredits }),
    }
    for (const key of ['fiveHour', 'weekly'] as const) {
      if (credits[key] !== undefined) {
        const window = decodeUsageWindow(credits[key])
        if (window === undefined) return undefined
        decodedCredits[key] = window
      }
    }
    usage.credits = decodedCredits
  }
  if (value.plan !== undefined) {
    if (!record(value.plan)) return undefined
    for (const key of ['planId', 'name', 'status', 'currentPeriodEnd']) {
      if (value.plan[key] !== undefined && typeof value.plan[key] !== 'string') return undefined
    }
    const planId = value.plan.planId
    const planName = value.plan.name
    const planStatus = value.plan.status
    const periodEnd = value.plan.currentPeriodEnd
    usage.plan = {
      ...(planId === undefined ? {} : { planId: planId as string }),
      ...(planName === undefined ? {} : { name: planName as string }),
      ...(planStatus === undefined ? {} : { status: planStatus as string }),
      ...(periodEnd === undefined ? {} : { currentPeriodEnd: periodEnd as string }),
    }
  }
  if (value.summary !== undefined) {
    if (!record(value.summary)) return undefined
    for (const key of ['totalCost', 'totalTokensIn', 'totalTokensOut', 'totalCount', 'completedCount', 'failedCount']) {
      if (value.summary[key] !== undefined && !positiveOrZero(value.summary[key])) return undefined
    }
    usage.summary = {}
    for (const key of ['totalCost', 'totalTokensIn', 'totalTokensOut', 'totalCount', 'completedCount', 'failedCount'] as const) {
      if (value.summary[key] !== undefined) usage.summary[key] = value.summary[key] as number
    }
  }
  return usage
}

export function decodeCommandCodeUsageReply(value: unknown): CommandCodeUsageRead | undefined {
  if (!record(value) || (value.status !== 'ok' && value.status !== 'unsupported')) return undefined
  if (value.status === 'unsupported') return { status: 'unsupported' }
  const usage = decodeCommandCodeUsageView(value.usage)
  return usage === undefined ? undefined : { status: 'ok', usage }
}

export function decodeCommandCodeUsageRequest(value: unknown): CommandCodeUsageRequest | undefined {
  return record(value) ? {} : undefined
}
