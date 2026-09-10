/** Live models.dev overlay for Command Code ids that GET /models does not describe. */

import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readBoundedText } from './http.ts'
import { decodeCommandCodeModel } from './client-contract.ts'
import type { CommandCodeModelConfig } from './types.ts'
import { canonCommandCodeEffort } from './reasoning-catalog.ts'
import { positiveInteger } from './numbers.ts'

/** Public models.dev catalog used to fill unknown Command Code capacities. */
export const MODELS_DEV_URL = 'https://models.dev/api.json'
export const MODELS_DEV_MAX_BYTES = 8 * 1024 * 1024
export const MODELS_DEV_TIMEOUT_MS = 15_000
/** How long Fetch will wait for models.dev before showing the CLI snapshot. */
export const MODELS_DEV_WAIT_MS = 800
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000

export type CommandCodeModelsDevOverlay = ReadonlyMap<string, CommandCodeModelConfig>

const PROVIDER_SCORE: Readonly<Record<string, number>> = {
  commandcode: 40,
  'command-code': 40,
  openrouter: 30,
  'opencode-go': 20,
  opencode: 15,
  'nano-gpt': 10,
}

let cache: { at: number, overlay: CommandCodeModelsDevOverlay } | undefined
let inflight: Promise<CommandCodeModelsDevOverlay> | undefined
let cachePathOverride: string | undefined

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Tests point the disk cache at a temp file; production uses tmpdir. */
export function setCommandCodeModelsDevCachePathForTests(path: string | undefined): void {
  cachePathOverride = path
}

function diskCachePath(): string | undefined {
  if (cachePathOverride !== undefined) return cachePathOverride
  if (process.env.VITEST !== undefined) return undefined
  return join(tmpdir(), 'dsh-llm-commandcode-models-dev.json')
}

function hydrateFromDisk(): void {
  if (cache !== undefined) return
  const path = diskCachePath()
  if (path === undefined) return
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (!record(parsed) || typeof parsed.at !== 'number' || !Array.isArray(parsed.models)) return
    const overlay = new Map<string, CommandCodeModelConfig>()
    for (const row of parsed.models) {
      const model = decodeCommandCodeModel(row)
      if (model === undefined) continue
      overlay.set(model.id.toLowerCase(), model)
    }
    cache = { at: parsed.at, overlay }
  } catch {
    // Missing or corrupt cache is fine; the next fetch rebuilds it.
  }
}

function writeDisk(at: number, overlay: CommandCodeModelsDevOverlay): void {
  const path = diskCachePath()
  if (path === undefined) return
  try {
    const tmp = path + '.tmp'
    writeFileSync(tmp, JSON.stringify({ at, models: [...overlay.values()] }))
    renameSync(tmp, path)
  } catch {
    // Cache writes are best-effort.
  }
}

/** Drop the process-local models.dev cache. Tests use this. */
export function clearCommandCodeModelsDevCache(): void {
  cache = undefined
  inflight = undefined
}

/** Return the cached overlay without fetching. */
export function peekCommandCodeModelsDev(): CommandCodeModelsDevOverlay | undefined {
  hydrateFromDisk()
  return cache?.overlay
}

function effortValues(value: unknown): string[] {
  if (!record(value)) return []
  const options = value.reasoning_options
  if (!Array.isArray(options)) return []
  const found: string[] = []
  for (const option of options) {
    if (!record(option) || !Array.isArray(option.values)) continue
    for (const item of option.values) {
      if (typeof item !== 'string') continue
      const effort = canonCommandCodeEffort(item)
      if (effort !== undefined && !found.includes(effort)) found.push(effort)
    }
  }
  return found
}

/** Vision follows input modalities, not the sloppy models.dev attachment flag. */
function visionOf(value: Record<string, unknown>): boolean | undefined {
  const modalities = record(value.modalities) ? value.modalities.input : undefined
  if (!Array.isArray(modalities)) return undefined
  return modalities.includes('image')
}

function rowScore(providerId: string, value: Record<string, unknown>): number {
  let score = PROVIDER_SCORE[providerId] ?? 0
  if (effortValues(value).length > 0) score += 10
  if (visionOf(value) === true) score += 5
  if (value.reasoning === true) score += 3
  return score
}

/** Parse one models.dev row into catalog fields. Exact id only; unknown stays unknown. */
export function parseCommandCodeModelsDevRow(id: string, value: unknown): CommandCodeModelConfig | undefined {
  if (!record(value)) return undefined
  const limit = record(value.limit) ? value.limit : undefined
  const maxTokens = limit === undefined ? undefined : positiveInteger(limit.output)
  const name = typeof value.name === 'string' && value.name.length > 0 ? value.name : undefined
  const efforts = effortValues(value)
  const thinking = typeof value.reasoning === 'boolean' ? value.reasoning : undefined
  const vision = visionOf(value)
  return {
    id,
    ...(name === undefined ? {} : { name }),
    ...(maxTokens === undefined ? {} : { maxTokens }),
    ...(vision === true ? { inputModalities: ['text', 'image'] as const } : vision === false ? { inputModalities: ['text'] as const } : {}),
    ...(thinking === undefined ? {} : { thinking }),
    ...(thinking === true && efforts.length > 0 ? { thinkingEfforts: efforts } : {}),
  }
}

/** Index models.dev by lowercase id. Prefer Command Code, then OpenRouter, then other same-id rows. */
export function parseCommandCodeModelsDev(value: unknown): CommandCodeModelsDevOverlay {
  if (!record(value)) return new Map()
  const scored = new Map<string, { score: number, model: CommandCodeModelConfig }>()
  for (const [providerId, provider] of Object.entries(value)) {
    const models = record(provider) ? provider.models : undefined
    if (!record(models)) continue
    for (const [id, row] of Object.entries(models)) {
      if (id.length === 0 || !record(row)) continue
      const parsed = parseCommandCodeModelsDevRow(id, row)
      if (parsed === undefined) continue
      const key = id.toLowerCase()
      const score = rowScore(providerId, row)
      const prev = scored.get(key)
      if (prev === undefined || score > prev.score) scored.set(key, { score, model: parsed })
    }
  }
  return new Map([...scored].map(([key, item]) => [key, item.model]))
}

async function fetchAndStore(
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
): Promise<CommandCodeModelsDevOverlay> {
  const timeout = AbortSignal.timeout(MODELS_DEV_TIMEOUT_MS)
  const requestSignal = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  try {
    const response = await fetchImpl(MODELS_DEV_URL, {
      method: 'GET',
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: requestSignal,
    })
    if (!response.ok) {
      await response.body?.cancel()
      return cache?.overlay ?? new Map()
    }
    const body = JSON.parse(await readBoundedText(
      response,
      MODELS_DEV_MAX_BYTES,
      MODELS_DEV_URL,
      'DISCOVERY_FAILED',
      requestSignal,
    )) as unknown
    const overlay = parseCommandCodeModelsDev(body)
    const at = Date.now()
    cache = { at, overlay }
    writeDisk(at, overlay)
    return overlay
  } catch {
    // Abort, network, HTTP, and JSON failures are non-fatal; GET /models still lists ids.
    return cache?.overlay ?? new Map()
  }
}

/** Fetch models.dev, returning an empty overlay when the document is unavailable. */
export async function loadCommandCodeModelsDev(
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
  options?: { force?: boolean },
): Promise<CommandCodeModelsDevOverlay> {
  hydrateFromDisk()
  const now = Date.now()
  const force = options?.force === true
  if (!force && cache !== undefined && now - cache.at < REFRESH_AFTER_MS) return cache.overlay
  if (inflight !== undefined) return inflight
  inflight = fetchAndStore(fetchImpl, signal).finally(() => { inflight = undefined })
  if (!force && cache !== undefined) {
    void inflight
    return cache.overlay
  }
  return await inflight
}
