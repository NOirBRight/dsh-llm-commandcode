/** Command Code plugin entry: route registration, settings, discovery, and quota RPC. */

import type { Context, Volatile, VolatileSnapshot } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { clientRequestSchema } from '@deepseek-ai/dsh-client-connection'
import type { ConnectionRpcHandlerResult } from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-client-connection'
import { assertUsableApiKey, INVALID_CREDENTIAL_CODE, LlmError, resolveRetryPolicy, RetryPolicySchema } from '@deepseek-ai/dsh-llm'
import type { RetryPolicyConfig } from '@deepseek-ai/dsh-llm'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { deepEqualJson } from '@deepseek-ai/dsh-util-values'
import type {} from '@deepseek-ai/dsh-settings'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'
import { allowDshRuntime } from './compatibility.ts'
import {
  COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT,
  COMMANDCODE_CREDENTIAL_SET_ENDPOINT,
  COMMANDCODE_DISCOVER_ENDPOINT,
  COMMANDCODE_PROVIDER,
  COMMANDCODE_RPC_METHOD,
  COMMANDCODE_VALIDATE_ENDPOINT,
  COMMANDCODE_SETTINGS_NAMESPACE,
  COMMANDCODE_USAGE_ENDPOINT,
  DEFAULT_API_KEY_ENV,
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_TOKENS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  PUBLIC_PROVIDER_BASE_URL,
  decodeCommandCodeCredentialSetRequest,
  decodeCommandCodeDiscoveryRequest,
  decodeCommandCodeValidateRequest,
  decodeCommandCodeUsageRequest,
} from './client-contract.ts'
import type { CommandCodeSettingsView } from './client-contract.ts'
import { CommandCodeAdapter } from './adapter.ts'
import type { CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts'
import { discoverModels } from './discovery.ts'
import { readCommandCodeUsage } from './usage.ts'
import { canonCommandCodeEffort, defaultEffortForCommandCodeModel, effortsForCommandCodeModel } from './reasoning-catalog.ts'
import { inputModalitiesForCommandCodeModel } from './capability-catalog.ts'
import { isPositiveInteger } from './numbers.ts'

export {
  COMMANDCODE_PROVIDER,
  COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT,
  COMMANDCODE_CREDENTIAL_SET_ENDPOINT,
  COMMANDCODE_RPC_CHANNEL,
  COMMANDCODE_RPC_METHOD,
  COMMANDCODE_SETTINGS_NAMESPACE,
  DEFAULT_API_KEY_ENV,
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_TOKENS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  PUBLIC_PROVIDER_BASE_URL,
} from './client-contract.ts'
export { CommandCodeAdapter } from './adapter.ts'
export type { CommandCodeAdapterOptions } from './types.ts'
export type { CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts'
export { discoverModels, parseCommandCodeModels, protocolForModel } from './discovery.ts'
export { parseCommandCodeUsageBodies } from './usage.ts'
export type {
  CommandCodeUsageCredits,
  CommandCodeUsagePlan,
  CommandCodeUsageRead,
  CommandCodeUsageSummary,
  CommandCodeUsageView,
  CommandCodeUsageWindow,
} from './types.ts'
export {
  decodeCommandCodeCredentialSetRequest,
  decodeCommandCodeDiscoveryRequest,
  decodeCommandCodeDiscoveryResult,
  decodeCommandCodeModel,
  decodeCommandCodeValidateRequest,
  decodeCommandCodeSettings,
  decodeCommandCodeUsageReply,
  decodeCommandCodeUsageRequest,
  decodeCommandCodeUsageView,
} from './client-contract.ts'
export type {
  CommandCodeDiscoveryRequest,
  CommandCodeDiscoveryResult,
  CommandCodeValidateRequest,
  CommandCodeSaveResult,
  CommandCodeUsageReply,
  CommandCodeUsageRequest,
} from './client-contract.ts'

export const name = 'llm-commandcode'
export const inject = ['llm', 'webServer']

const NS = COMMANDCODE_SETTINGS_NAMESPACE
const DEFAULT_RETRY_POLICY: RetryPolicyConfig = { mode: 'normal', maxRetries: 3 }

/** No fabricated startup capacities: a model enters the route only after live discovery or explicit config. */
export const DEFAULT_MODELS: CommandCodeModelConfig[] = []

const MODEL_MODALITIES = ['text', 'image'] as const
const catalogModel: z<CommandCodeModelConfig> = z.object({
  id: z.string().required(),
  name: z.string(),
  description: z.string(),
  contextWindow: z.number().step(1).min(1),
  contextWindowOverride: z.number().step(1).min(1),
  maxTokens: z.number().step(1).min(1),
  thinking: z.boolean(),
  defaultEffort: z.string(),
  thinkingEfforts: z.array(z.string()),
  inputModalities: z.union([z.array(z.union(MODEL_MODALITIES)), z.never()]),
})

export interface Config {
  apiKeyEnv: string
  models: Volatile<CommandCodeModelConfig[] | undefined>
  defaultContextWindow: Volatile<number>
  defaultMaxTokens: Volatile<number>
  requestTimeoutMs: Volatile<number>
  streamIdleTimeoutMs: Volatile<number>
  zeroDataRetention: Volatile<boolean>
  usageEnabled: Volatile<boolean>
  retryPolicy?: RetryPolicyConfig
}

interface ConfigInput {
  apiKeyEnv?: string | null
  models?: CommandCodeModelConfig[] | null
  defaultContextWindow?: number | null
  defaultMaxTokens?: number | null
  requestTimeoutMs?: number | null
  streamIdleTimeoutMs?: number | null
  zeroDataRetention?: boolean | null
  usageEnabled?: boolean | null
  retryPolicy?: RetryPolicyConfig | null
}

export const Config: z<ConfigInput, Config> = z.object({
  apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
  models: z.array(catalogModel).default(DEFAULT_MODELS).volatile(),
  defaultContextWindow: z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW).volatile(),
  defaultMaxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_TOKENS).volatile(),
  requestTimeoutMs: z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).default(DEFAULT_REQUEST_TIMEOUT_MS).volatile(),
  streamIdleTimeoutMs: z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).default(DEFAULT_STREAM_IDLE_TIMEOUT_MS).volatile(),
  zeroDataRetention: z.boolean().default(false).volatile(),
  usageEnabled: z.boolean().default(true).volatile(),
  retryPolicy: RetryPolicySchema,
})

interface ConfigValues {
  apiKeyEnv: string | undefined
  models: VolatileSnapshot<CommandCodeModelConfig[] | undefined>
  defaultContextWindow: number | undefined
  defaultMaxTokens: number | undefined
  requestTimeoutMs: number | undefined
  streamIdleTimeoutMs: number | undefined
  zeroDataRetention: boolean | undefined
  usageEnabled: boolean | undefined
  retryPolicy: RetryPolicyConfig | undefined
}

const VOLATILE_CONFIG_FIELDS: Readonly<Record<string, true>> = {
  models: true,
  defaultContextWindow: true,
  defaultMaxTokens: true,
  requestTimeoutMs: true,
  streamIdleTimeoutMs: true,
  zeroDataRetention: true,
  usageEnabled: true,
}


function normalizeThinkingEfforts(values: readonly string[] | undefined): string[] | undefined {
  if (values === undefined || values.length === 0) return undefined
  const out: string[] = []
  for (const value of values) {
    const effort = canonCommandCodeEffort(value)
    if (effort === undefined) throw new Error('llm-commandcode: invalid thinkingEfforts token ' + value)
    if (out.includes(effort)) throw new Error('llm-commandcode: duplicate thinkingEfforts token ' + effort)
    out.push(effort)
  }
  return out
}

function resolveModels(models: VolatileSnapshot<CommandCodeModelConfig[] | undefined>): CommandCodeModelConfig[] {
  const seen = new Set<string>()
  return [...models ?? DEFAULT_MODELS].map(model => {
    if (model.id.length === 0) throw new Error('llm-commandcode: model ids must be non-empty')
    if (seen.has(model.id)) throw new Error('llm-commandcode: duplicate model id ' + model.id)
    seen.add(model.id)
    if (model.contextWindow !== undefined && !isPositiveInteger(model.contextWindow)) throw new Error('llm-commandcode: invalid contextWindow for ' + model.id)
    if (model.contextWindowOverride !== undefined && !isPositiveInteger(model.contextWindowOverride)) throw new Error('llm-commandcode: invalid contextWindowOverride for ' + model.id)
    if (model.maxTokens !== undefined && !isPositiveInteger(model.maxTokens)) throw new Error('llm-commandcode: invalid maxTokens for ' + model.id)
    if (model.thinking !== undefined && typeof model.thinking !== 'boolean') throw new Error('llm-commandcode: invalid thinking for ' + model.id)
    // Thinking persistence: when explicitly disabled, discard any persisted effort.
    const normalizedEffort = model.thinking === false ? undefined : model.defaultEffort
    const overlayEfforts = normalizeThinkingEfforts(model.thinkingEfforts)
    const effortModel = {
      id: model.id,
      ...(normalizedEffort === undefined ? {} : { defaultEffort: normalizedEffort }),
      ...(overlayEfforts === undefined ? {} : { thinkingEfforts: overlayEfforts }),
    }
    const efforts = effortsForCommandCodeModel(effortModel)
    const hasEfforts = efforts.length > 0
    // Migration: old configs without thinking keep their effort if the model supports it.
    const effectiveThinking = model.thinking ?? (hasEfforts ? undefined : undefined)
    // A saved effort the current table no longer offers must not brick the whole
    // provider: drop it and keep the model. The settings UI only offers valid levels.
    const offeredEffort = normalizedEffort !== undefined && efforts.includes(normalizedEffort) ? normalizedEffort : undefined
    const defaultEffort = model.thinking === false
      ? undefined
      : defaultEffortForCommandCodeModel({
        id: model.id,
        ...(offeredEffort === undefined ? {} : { defaultEffort: offeredEffort }),
        ...(overlayEfforts === undefined ? {} : { thinkingEfforts: overlayEfforts }),
      })
    const thinkingEfforts = effortsForCommandCodeModel({ id: model.id }).length > 0 ? undefined : overlayEfforts
    const input = model.inputModalities === undefined
      ? inputModalitiesForCommandCodeModel(model.id)
      : model.inputModalities.length === 0
        ? ['text'] as const
        : model.inputModalities
    if (new Set(input).size !== input.length || input.some(item => !MODEL_MODALITIES.includes(item))) throw new Error('llm-commandcode: invalid inputModalities for ' + model.id)
    // When thinking is explicitly false, ensure no stale effort is persisted.
    const persistedEffort = model.thinking === false ? undefined : defaultEffort
    return {
      id: model.id,
      ...(model.name === undefined ? {} : { name: model.name }),
      ...(model.description === undefined ? {} : { description: model.description }),
      ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
      ...(model.contextWindowOverride === undefined ? {} : { contextWindowOverride: model.contextWindowOverride }),
      ...(model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens }),
      ...(effectiveThinking === undefined ? {} : { thinking: effectiveThinking }),
      ...(persistedEffort === undefined ? {} : { defaultEffort: persistedEffort }),
      ...(thinkingEfforts === undefined ? {} : { thinkingEfforts }),
      inputModalities: [...input],
    }
  })
}


function failure(message: string) {
  return { ok: false as const, error: { code: 'internal' as const, message, details: {} } }
}

/** Failure codes that mean this route has no usable credential for its account. */
const CREDENTIAL_FAILURE_CODES: ReadonlySet<string> = new Set([INVALID_CREDENTIAL_CODE, 'MISSING_CREDENTIAL'])

/**
 * Answer one quota failure on the wire instead of throwing it out of the handler,
 * where the host would turn it into a gateway error. A missing or unusable
 * credential answers {@link INVALID_CREDENTIAL_CODE}, the only code the shared
 * provider-UI quota cache drops the previous account's entry for; any other
 * LlmError keeps its own code, and a non-LlmError failure stays internal.
 * @param error - thrown value from credential resolution or the account read.
 */
export function usageFailure(error: unknown) {
  if (!(error instanceof LlmError)) return failure(error instanceof Error ? error.message : 'Command Code usage read failed')
  return {
    ok: false as const,
    error: {
      code: CREDENTIAL_FAILURE_CODES.has(error.code) ? INVALID_CREDENTIAL_CODE : error.code,
      message: error.message,
      details: {},
    },
  }
}

function configValues(config: Config): ConfigValues {
  return {
    apiKeyEnv: config.apiKeyEnv,
    models: config.models.get(),
    defaultContextWindow: config.defaultContextWindow.get(),
    defaultMaxTokens: config.defaultMaxTokens.get(),
    requestTimeoutMs: config.requestTimeoutMs.get(),
    streamIdleTimeoutMs: config.streamIdleTimeoutMs.get(),
    zeroDataRetention: config.zeroDataRetention.get(),
    usageEnabled: config.usageEnabled.get(),
    retryPolicy: config.retryPolicy,
  }
}

function decodePluginCall(value: unknown): { endpoint: string; payload: unknown } | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const call = value as Record<string, unknown>
  const keys = Object.keys(call)
  if (keys.length < 1 || keys.length > 2 || keys.some(key => key !== 'endpoint' && key !== 'payload') || typeof call.endpoint !== 'string') return undefined
  return { endpoint: call.endpoint, payload: call.payload }
}

function pluginResponse(rpcId: string, result: ConnectionRpcHandlerResult): Response {
  if (!result.ok) return Response.json({ type: 'server-response', rpcId, result })
  const { attachments, ...success } = result
  const body = { type: 'server-response', rpcId, result: success }
  if (attachments === undefined || attachments.length === 0) return Response.json(body)

  const form = new FormData()
  const attachmentMetadata = attachments.map((attachment, index) => {
    const part = 'bytes-' + String(index)
    form.set(part, new Blob([new Uint8Array(attachment.bytes)]))
    return { path: [...attachment.path], codec: 'bytes', part }
  })
  form.set('metadata', JSON.stringify({ ...body, attachments: attachmentMetadata }))
  return new Response(form)
}

function badPluginRequest(status: 400 | 415): Response {
  return new Response(status === 415 ? 'Unsupported Media Type' : 'Bad Request', { status })
}

const COMMANDCODE_RPC_ROUTE = '/api/' + COMMANDCODE_RPC_METHOD

function resolveAdapterOptionsFromValues(config: ConfigValues): CommandCodeConnectionOptions {
  const defaultContextWindow = config.defaultContextWindow ?? DEFAULT_CONTEXT_WINDOW
  const defaultMaxTokens = config.defaultMaxTokens ?? DEFAULT_MAX_TOKENS
  const requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  const streamIdleTimeoutMs = config.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS
  if (!isPositiveInteger(defaultContextWindow)) throw new Error('llm-commandcode: defaultContextWindow must be positive')
  if (!isPositiveInteger(defaultMaxTokens)) throw new Error('llm-commandcode: defaultMaxTokens must be positive')
  if (!isPositiveInteger(requestTimeoutMs) || requestTimeoutMs > MAX_TIMER_DELAY_MS) throw new Error('llm-commandcode: requestTimeoutMs is invalid')
  if (!isPositiveInteger(streamIdleTimeoutMs) || streamIdleTimeoutMs > MAX_TIMER_DELAY_MS) throw new Error('llm-commandcode: streamIdleTimeoutMs is invalid')
  return {
    apiKeyEnv: credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV),
    providerBaseURL: PUBLIC_PROVIDER_BASE_URL,
    models: resolveModels(config.models),
    defaultContextWindow,
    defaultMaxTokens,
    requestTimeoutMs,
    streamIdleTimeoutMs,
    zeroDataRetention: config.zeroDataRetention ?? false,
    usageEnabled: config.usageEnabled ?? true,
    retryPolicy: resolveRetryPolicy(config.retryPolicy ?? DEFAULT_RETRY_POLICY, 'llm-commandcode: retryPolicy'),
  }
}

export function resolveAdapterOptions(config: Config): CommandCodeConnectionOptions {
  return resolveAdapterOptionsFromValues(configValues(config))
}
export function apply(ctx: Context, config: Config): void {
  if (!allowDshRuntime(ctx.logger, 'dsh-llm-commandcode', ['@deepseek-ai/dsh-llm'])) return

  let currentConfig = configValues(config)
  let lastRaw: ConfigValues | undefined
  let lastGood: CommandCodeConnectionOptions | undefined
  const options = (): CommandCodeConnectionOptions => {
    const raw = currentConfig
    if (raw === lastRaw && lastGood !== undefined) return lastGood
    try {
      const next = resolveAdapterOptionsFromValues(raw)
      lastRaw = raw
      lastGood = next
      return next
    } catch (error: unknown) {
      if (lastGood === undefined) throw error
      lastRaw = raw
      ctx.logger.error('llm-commandcode: keeping the last good configuration')
      ctx.logger.error(error)
      return lastGood
    }
  }
  options()

  const credentialValue = async (ref: CommandCodeConnectionOptions['apiKeyEnv']): Promise<string | undefined> => {
    const credentials = ctx.get('credentials')
    return credentials === undefined ? undefined : (await credentials.resolve(ref))?.value
  }
  const storedApiKey = (): Promise<string | undefined> => credentialValue(options().apiKeyEnv)
  const credentialStatus = async (): Promise<{ configured: boolean, writable: boolean }> => {
    const credentials = ctx.get('credentials')
    if (credentials === undefined) return { configured: false, writable: false }
    const info = await credentials.describe(options().apiKeyEnv)
    return { configured: info.configured, writable: info.writable }
  }
  const resolveApiKey = async (connection: CommandCodeConnectionOptions): Promise<string> => {
    const raw = await credentialValue(connection.apiKeyEnv)
    if (raw !== undefined && raw.length > 0) return assertUsableApiKey(raw, name, connection.apiKeyEnv)
    throw new LlmError('llm-commandcode: no DSH credential is configured for provider route "' + COMMANDCODE_PROVIDER + '"', 'MISSING_CREDENTIAL')
  }

  const adapter = new CommandCodeAdapter({ options, resolveApiKey, resolveAttachments: () => ctx.get('attachments') })
  ctx.llm.registerConfigurableProviders([{ provider: COMMANDCODE_PROVIDER, displayName: 'Command Code', settingsNs: NS, settingsPath: [] }])
  const registration = ctx.llm.registerAdapter([COMMANDCODE_PROVIDER], adapter)
  let registeredPolicy = options().retryPolicy
  const ensureRegistration = (): void => {
    const policy = options().retryPolicy
    if (deepEqualJson(policy, registeredPolicy)) return
    registration.replace([COMMANDCODE_PROVIDER])
    registeredPolicy = policy
  }

  ctx.on('loader/volatile-update', paths => {
    if (!paths.some(([field]) => field !== undefined && VOLATILE_CONFIG_FIELDS[field] === true)) return
    const next = configValues(config)
    try {
      resolveAdapterOptionsFromValues(next)
    } catch (error: unknown) {
      ctx.logger.error('llm-commandcode: rejecting invalid live configuration')
      ctx.logger.error(error)
      return
    }
    currentConfig = next
    options()
    ensureRegistration()
  })

  ctx.llm.registerModelDiscovery(NS, async (_request, signal) => {
    return (await discoverModels(signal === undefined ? {} : { signal })).models
  })

  const handleRpc = async (endpoint: string, payload: unknown, signal: AbortSignal, _operator: unknown): Promise<ConnectionRpcHandlerResult> => {
    if (endpoint === COMMANDCODE_VALIDATE_ENDPOINT) {
      const request = decodeCommandCodeValidateRequest(payload)
      if (request === undefined) return failure('invalid Command Code settings request')
      try {
        resolveAdapterOptions(Config({
          ...(currentConfig.apiKeyEnv === undefined ? {} : { apiKeyEnv: currentConfig.apiKeyEnv }),
          ...request.settings,
        }))
        return { ok: true as const, value: {} }
      } catch (error: unknown) {
        return failure(error instanceof Error ? error.message : 'Command Code settings are invalid')
      }
    }
    if (endpoint === COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT) {
      return { ok: true as const, value: await credentialStatus() }
    }
    if (endpoint === COMMANDCODE_CREDENTIAL_SET_ENDPOINT) {
      const request = decodeCommandCodeCredentialSetRequest(payload)
      if (request === undefined) return failure('invalid Command Code credential request')
      const credentials = ctx.get('credentials')
      if (credentials === undefined) return failure('Command Code credentials are unavailable')
      try {
        await credentials.set(options().apiKeyEnv, request.apiKey)
      } catch (error: unknown) {
        // Do not throw credential-store details through the RPC; return a stable wire failure instead.
        void error
        return failure('Command Code credential write failed')
      }
      return { ok: true as const, value: await credentialStatus() }
    }
    if (endpoint === COMMANDCODE_DISCOVER_ENDPOINT) {
      const request = decodeCommandCodeDiscoveryRequest(payload)
      if (request === undefined) return failure('invalid Command Code discovery request')
      try {
        const result = await discoverModels({ signal })
        return { ok: true as const, value: result }
      } catch (error: unknown) {
        return failure(error instanceof Error ? error.message : 'Command Code model discovery failed')
      }
    }
    if (endpoint === COMMANDCODE_USAGE_ENDPOINT) {
      const request = decodeCommandCodeUsageRequest(payload)
      if (request === undefined) return failure('invalid Command Code usage request')
      try {
        if (!options().usageEnabled) return { ok: true as const, value: { status: 'unsupported' as const } }
        const result = await readCommandCodeUsage({ signal }, storedApiKey)
        return { ok: true as const, value: result }
      } catch (error: unknown) {
        return usageFailure(error)
      }
    }
    return failure('unknown Command Code endpoint: ' + endpoint)
  }

  ctx.effect(() => {
    const connectionFiber = ctx.inject(['connection', 'webServer'], connectionCtx => {
      const operator = connectionCtx.connection.operator
      connectionCtx.effect(
        () => connectionCtx.connection.fetch.register({
          path: COMMANDCODE_RPC_ROUTE,
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: async request => {
            const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
            if (mediaType !== 'application/json') return badPluginRequest(415)
            let body: unknown
            try {
              body = await request.json()
            } catch {
              return badPluginRequest(400)
            }
            const parsed = clientRequestSchema.safeParse(body)
            if (!parsed.success || parsed.data.method !== COMMANDCODE_RPC_METHOD) return badPluginRequest(400)
            const call = decodePluginCall(parsed.data.payload)
            if (call === undefined) return badPluginRequest(400)
            try {
              const result = await handleRpc(call.endpoint, call.payload, request.signal, operator)
              return pluginResponse(parsed.data.rpcId, result)
            } catch {
              return new Response('Internal Server Error', { status: 500 })
            }
          },
        }),
        'llm-commandcode: authenticated Connection Fetch route',
      )
    })
    return connectionFiber.dispose
  }, 'llm-commandcode: Connection injection')
  ctx.inject(['settings'], settingsCtx => {
    settingsCtx.effect(
      () => settingsCtx.settings.configure({ auto: false }, ctx.fiber),
      'llm-commandcode: settings presentation',
    )
  })
}

export type { CommandCodeSettingsView }
