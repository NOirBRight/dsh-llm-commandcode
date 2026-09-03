/** Live Command Code model catalog discovery. */

import { attributionHeaders, INVALID_CREDENTIAL_CODE, LlmError } from '@deepseek-ai/dsh-llm'
import type { CommandCodeDiscoveryRequest } from './client-contract.ts'
import { effectiveApi } from './types.ts'
import type { CommandCodeModelConfig } from './types.ts'
import { readBoundedText } from './http.ts'
import { defaultEffortForCommandCodeModel } from './reasoning-catalog.ts'
import { hasNativeReasoningByDefault, inputModalitiesForCommandCodeModel } from './capability-catalog.ts'
import { positiveInteger } from './numbers.ts'
import { PUBLIC_PROVIDER_BASE_URL } from './client-contract.ts'

export const MAX_DISCOVERY_BYTES = 4 * 1024 * 1024
export const DISCOVERY_TIMEOUT_MS = 30_000

/** Discovery has no credential or endpoint input; only cancellation is caller-controlled. */
export interface CommandCodeDiscoveryOptions extends CommandCodeDiscoveryRequest {}

interface ListingEntry {
  id?: unknown
  name?: unknown
  context_length?: unknown
  max_tokens?: unknown
  max_output_tokens?: unknown
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function protocolForModel(id: string): 'openai-completions' | 'anthropic-messages' {
  return effectiveApi({ id })
}

/** Parse the provider's OpenAI-shaped model list without inventing capacity. */
export function parseCommandCodeModels(value: unknown): { models: CommandCodeModelConfig[]; warnings: string[] } {
  const data = record(value) ? value.data : undefined
  if (!Array.isArray(data)) throw new LlmError('Command Code model listing has no data array', 'DISCOVERY_FAILED')
  const models: CommandCodeModelConfig[] = []
  const warnings: string[] = []
  const seen = new Set<string>()
  for (const raw of data) {
    if (!record(raw)) continue
    const entry = raw as ListingEntry
    const id = nonEmpty(entry.id)
    if (id === undefined || seen.has(id)) continue
    seen.add(id)
    const contextWindow = positiveInteger(entry.context_length)
    if (contextWindow === undefined) warnings.push(id + ' has no valid context_length')
    const maxTokens = positiveInteger(entry.max_output_tokens) ?? positiveInteger(entry.max_tokens)
    const name = nonEmpty(entry.name)
    const defaultEffort = defaultEffortForCommandCodeModel({ id })
    models.push({
      id,
      ...(name === undefined ? {} : { name }),
      ...(contextWindow === undefined ? {} : { contextWindow }),
      ...(maxTokens === undefined ? {} : { maxTokens }),
      ...(defaultEffort === undefined ? {} : { defaultEffort }),
      ...(hasNativeReasoningByDefault(id) ? { thinking: true } : {}),
      inputModalities: inputModalitiesForCommandCodeModel(id),
    })
  }
  return { models, warnings }
}

function listingURL(): string {
  return PUBLIC_PROVIDER_BASE_URL + '/models'
}


/** Fetch the current public model catalog. */
export async function discoverModels(
  request: CommandCodeDiscoveryOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{ models: CommandCodeModelConfig[]; warnings: string[] }> {
  const url = listingURL()
  const timeout = AbortSignal.timeout(DISCOVERY_TIMEOUT_MS)
  const signal = request.signal === undefined ? timeout : AbortSignal.any([request.signal, timeout])
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...attributionHeaders(),
      },
      redirect: 'error',
      signal,
    })
  } catch (error: unknown) {
    if (request.signal?.aborted) throw new LlmError('Command Code model discovery aborted', 'ABORTED', { cause: error })
    throw new LlmError('Could not reach Command Code model catalog', 'DISCOVERY_FAILED', { cause: error })
  }
  if (!response.ok) {
    await response.body?.cancel()
    throw new LlmError('Command Code model catalog answered HTTP ' + String(response.status), response.status === 401 ? INVALID_CREDENTIAL_CODE : 'DISCOVERY_FAILED', { status: response.status })
  }
  let body: unknown
  try {
    body = JSON.parse(await readBoundedText(response, MAX_DISCOVERY_BYTES, url, 'DISCOVERY_FAILED', signal))
  } catch (error: unknown) {
    if (error instanceof LlmError) throw error
    throw new LlmError('Command Code model catalog did not return JSON', 'DISCOVERY_FAILED', { cause: error })
  }
  return parseCommandCodeModels(body)
}
