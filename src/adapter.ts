/** Command Code adapter delegated to DSH's mixed-protocol PiAiAdapter. */

import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import type {
  GenerateOptions,
  LlmModelInfo,
  LlmProviderInfo,
  LlmResolvedModelInfo,
  PreparedAdapterCall,
  ResolvedRetryPolicy,
  StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'
import { COMMANDCODE_PROVIDER } from './client-contract.ts'
import type { CommandCodeAdapterOptions, CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts'
import { createCommandCodePiAiProfile } from './pi-ai-profile.ts'
import { createCommandCodePiAiAuth } from './pi-ai-auth.ts'
import { applyCommandCodeReasoningMetadata } from './reasoning.ts'

export {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_TOKENS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  PUBLIC_PROVIDER_BASE_URL,
} from './client-contract.ts'

/** Compatibility helper retained for package callers and diagnostics. */
export function httpErrorCode(status: number, body?: unknown): string {
  const text = JSON.stringify(body ?? '')
  if (status === 401) return 'INVALID_CREDENTIAL'
  if (status === 403) return 'PROVIDER_FORBIDDEN'
  if (status === 422 && /cmd_zdr_no_providers/iu.test(text)) return 'ZDR_UNAVAILABLE'
  if (status === 400 || status === 422) return 'INVALID_REQUEST'
  if (status === 429) return 'RATE_LIMIT'
  if (status >= 500) return 'SERVER'
  return 'HTTP_' + String(status)
}

function configuredModel(connection: CommandCodeConnectionOptions, id: string): CommandCodeModelConfig | undefined {
  return connection.models.find(model => model.id === id)
}

function classifyCommandCodeError(chunk: StreamChunk): StreamChunk {
  if (chunk.type !== 'finish' || chunk.reason.kind !== 'error') return chunk
  const message = chunk.reason.failure.message
  const code = /cmd_zdr_no_providers/iu.test(message)
    ? 'ZDR_UNAVAILABLE'
    : /upgrade_required/iu.test(message)
      ? 'PROVIDER_FORBIDDEN'
      : /unsupported_model|not supported on this endpoint/iu.test(message)
        ? 'INVALID_REQUEST'
        : undefined
  if (code === undefined) return chunk
  return { ...chunk, reason: { ...chunk.reason, failure: { ...chunk.reason.failure, code } } }
}

const SANDBOX_MODE_RANK: Record<string, number> = {
  'read-only': 0,
  'workspace-write': 1,
  'danger-full-access': 2,
}

/**
 * Remove sandbox escalation choices that cannot be strictly wider than the
 * current DSH policy. Core still validates every retained request; this only
 * prevents Codex from selecting an impossible optional enum value.
 */
export function narrowCommandCodeEscalationSchemas(options: GenerateOptions): GenerateOptions {
  const mode = sandboxModeOf(options)
  const currentRank = mode === undefined ? undefined : SANDBOX_MODE_RANK[mode]
  if (currentRank === undefined || options.tools === undefined) return options
  let changed = false
  const tools = options.tools.map((tool) => {
    const parameters = tool.parameters
    const properties = isRecord(parameters.properties) ? parameters.properties : undefined
    const permission = properties === undefined || !isRecord(properties.sandbox_permissions)
      ? undefined
      : properties.sandbox_permissions
    if (permission === undefined || !Array.isArray(permission.enum)) return tool
    const wider = permission.enum.filter((candidate): candidate is string => {
      return typeof candidate === 'string' && (SANDBOX_MODE_RANK[candidate] ?? -1) > currentRank
    })
    if (wider.length === permission.enum.length) return tool
    changed = true
    const nextProperties = { ...properties }
    if (wider.length === 0) {
      delete nextProperties.sandbox_permissions
      delete nextProperties.justification
    } else {
      nextProperties.sandbox_permissions = { ...permission, enum: wider }
    }
    const required = Array.isArray(parameters.required)
      ? parameters.required.filter(name => name !== 'sandbox_permissions' && name !== 'justification')
      : undefined
    return {
      ...tool,
      parameters: {
        ...parameters,
        properties: nextProperties,
        ...(required === undefined ? {} : { required }),
      },
    }
  })
  return changed ? { ...options, tools } : options
}

function sandboxModeOf(options: GenerateOptions): string | undefined {
  for (let index = options.messages.length - 1; index >= 0; index -= 1) {
    const message = options.messages[index]
    if (!isRecord(message)) continue
    const found = sandboxModeIn(message.content)
    if (found !== undefined) return found
  }
  return sandboxModeIn(options.system)
}

function sandboxModeIn(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return /Current DSH file policy:\s*(read-only|workspace-write|danger-full-access)\./u.exec(value)?.[1]
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = sandboxModeIn(item)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (!isRecord(value)) return undefined
  return sandboxModeIn(value.text) ?? sandboxModeIn(value.content)
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** One DSH provider route backed by a pi-ai provider with per-model api dispatch. */
export class CommandCodeAdapter extends LlmAdapter {
  private readonly auth = createCommandCodePiAiAuth()
  private snapshot: { options: CommandCodeConnectionOptions; adapter: PiAiAdapter } | undefined

  constructor(private readonly config: CommandCodeAdapterOptions) {
    super()
  }

  private current(): PiAiAdapter {
    const options = this.config.options()
    if (this.snapshot?.options === options) return this.snapshot.adapter
    const profile = createCommandCodePiAiProfile(options)
    const profiles = new Map<string, ResolvedPiAiProviderProfile>([[COMMANDCODE_PROVIDER, profile]])
    const adapter = new PiAiAdapter({
      profiles: () => profiles,
      resolveApiKey: () => this.config.resolveApiKey(options),
      auth: this.auth,
      ...(this.config.resolveAttachments === undefined ? {} : { resolveAttachments: this.config.resolveAttachments }),
    })
    this.snapshot = { options, adapter }
    return adapter
  }

  override providerInfo(provider: string): LlmProviderInfo {
    return this.current().providerInfo(provider)
  }

  override providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined {
    return this.current().providerRetryPolicy(provider)
  }

  /**
   * Declare neutral request-image pricing so the Host uses heuristic image pricing.
   * @param _provider - provider route.
   * @param _model - model id.
   * @returns `undefined` so the Host uses heuristic image pricing.
   */
  override imageRequestPricing(_provider: string, _model: string): undefined {
    return undefined
  }

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return this.current().listModels(provider)
  }

  override async resolveModel(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo> {
    const info = await this.current().resolveModel(provider, model, signal)
    const configured = configuredModel(this.config.options(), model)
    return configured === undefined ? info : applyCommandCodeReasoningMetadata(info, configured)
  }

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    for await (const chunk of this.current().stream(narrowCommandCodeEscalationSchemas(options))) yield classifyCommandCodeError(chunk)
  }

  override async prepareCall(provider: string, model: string, signal?: AbortSignal): Promise<PreparedAdapterCall> {
    const delegate = this.current()
    const prepared = await delegate.prepareCall(provider, model, signal)
    const configured = configuredModel(this.config.options(), model)
    return {
      model: configured === undefined ? prepared.model : applyCommandCodeReasoningMetadata(prepared.model, configured),
      stream: async function* (options: GenerateOptions) {
        for await (const chunk of prepared.stream(narrowCommandCodeEscalationSchemas(options))) yield classifyCommandCodeError(chunk)
      },
    }
  }
}

export type { CommandCodeApi, CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts'
