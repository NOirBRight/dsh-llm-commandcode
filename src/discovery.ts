/** Live Command Code model catalog discovery. */

import { attributionHeaders, INVALID_CREDENTIAL_CODE, LlmError } from '@deepseek-ai/dsh-llm'
import type { CommandCodeDiscoveryRequest } from './client-contract.ts'
import { effectiveApi } from './types.ts'
import type { CommandCodeModelConfig } from './types.ts'
import { readBoundedText } from './http.ts'
import { defaultEffortForCommandCodeModel, effortsForCommandCodeModel } from './reasoning-catalog.ts'
import { hasNativeReasoningByDefault, inputModalitiesForCommandCodeModel } from './capability-catalog.ts'
import { positiveInteger } from './numbers.ts'
import { PUBLIC_PROVIDER_BASE_URL } from './client-contract.ts'
import {
  loadCommandCodeModelsDev,
  MODELS_DEV_WAIT_MS,
  peekCommandCodeModelsDev,
} from './models-dev.ts'
import type { CommandCodeModelsDevOverlay } from './models-dev.ts'

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

/** True when the CLI snapshot already knows vision, efforts, or native reasoning. */
export function hasCommandCodeCapabilitySnapshot(id: string): boolean {
  return effortsForCommandCodeModel({ id }).length > 0
    || hasNativeReasoningByDefault(id)
    || inputModalitiesForCommandCodeModel(id).includes('image')
}

/** Parse the provider's OpenAI-shaped model list without inventing capacity. */
export function parseCommandCodeModels(
  value: unknown,
  overlay: CommandCodeModelsDevOverlay = new Map(),
): { models: CommandCodeModelConfig[]; warnings: string[] } {
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
    const extra = overlay.get(id.toLowerCase())
    const contextWindow = positiveInteger(entry.context_length)
    if (contextWindow === undefined) warnings.push(id + ' has no valid context_length')
    const maxTokens = positiveInteger(entry.max_output_tokens) ?? positiveInteger(entry.max_tokens) ?? extra?.maxTokens
    const name = nonEmpty(entry.name) ?? extra?.name
    const snapshotImage = inputModalitiesForCommandCodeModel(id).includes('image')
    const overlayImage = extra?.inputModalities?.includes('image') === true
    const inputModalities = snapshotImage || overlayImage ? ['text' as const, 'image' as const] : ['text' as const]
    const snapshotEfforts = effortsForCommandCodeModel({ id })
    const thinkingEfforts = snapshotEfforts.length > 0 ? undefined : extra?.thinkingEfforts
    const effortModel = thinkingEfforts === undefined || thinkingEfforts.length === 0
      ? { id }
      : { id, thinkingEfforts }
    const defaultEffort = defaultEffortForCommandCodeModel(effortModel)
    const thinking = hasNativeReasoningByDefault(id) || extra?.thinking === true ? true : undefined
    models.push({
      id,
      ...(name === undefined ? {} : { name }),
      ...(contextWindow === undefined ? {} : { contextWindow }),
      ...(maxTokens === undefined ? {} : { maxTokens }),
      ...(defaultEffort === undefined ? {} : { defaultEffort }),
      ...(thinking === undefined ? {} : { thinking }),
      ...(thinkingEfforts === undefined || thinkingEfforts.length === 0 ? {} : { thinkingEfforts }),
      inputModalities,
    })
  }
  return { models, warnings }
}

function listingURL(): string {
  return PUBLIC_PROVIDER_BASE_URL + '/models'
}

/** Prefer a warm cache; otherwise wait briefly while models.dev fills in the background. */
async function overlayForListing(fetchImpl: typeof fetch): Promise<CommandCodeModelsDevOverlay> {
  const cached = peekCommandCodeModelsDev()
  const pending = loadCommandCodeModelsDev(fetchImpl)
  if (cached !== undefined) return cached
  const budget = AbortSignal.timeout(MODELS_DEV_WAIT_MS)
  return await Promise.race([
    pending,
    new Promise<CommandCodeModelsDevOverlay>((resolve) => {
      budget.addEventListener('abort', () => {
        resolve(peekCommandCodeModelsDev() ?? new Map())
      }, { once: true })
    }),
  ])
}

/** Fetch the current public model catalog. */
export async function discoverModels(
  request: CommandCodeDiscoveryOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{ models: CommandCodeModelConfig[]; warnings: string[] }> {
  const url = listingURL()
  const timeout = AbortSignal.timeout(DISCOVERY_TIMEOUT_MS)
  const signal = request.signal === undefined ? timeout : AbortSignal.any([request.signal, timeout])
  const overlayPromise = overlayForListing(fetchImpl)
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
  let overlay = await overlayPromise
  let parsed = parseCommandCodeModels(body, overlay)
  if (parsed.models.some(model => !overlay.has(model.id.toLowerCase()) && !hasCommandCodeCapabilitySnapshot(model.id))) {
    overlay = await loadCommandCodeModelsDev(fetchImpl, signal, { force: true })
    parsed = parseCommandCodeModels(body, overlay)
  }
  return parsed
}
