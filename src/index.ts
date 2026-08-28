/** Command Code plugin entry: route registration, settings, discovery, and quota RPC. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-client-connection'
import { assertUsableApiKey, LlmError, resolveRetryPolicy, RetryPolicySchema } from '@deepseek-ai/dsh-llm'
import type { RetryPolicyConfig } from '@deepseek-ai/dsh-llm'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { deepEqualJson, installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import type { SettingsPathOp } from '@deepseek-ai/dsh-settings'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'
import {
  COMMANDCODE_SETTINGS_READ_ENDPOINT,
  COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT,
  COMMANDCODE_CREDENTIAL_SET_ENDPOINT,
  COMMANDCODE_DISCOVER_ENDPOINT,
  COMMANDCODE_PROVIDER,
  COMMANDCODE_RPC_CHANNEL,
  COMMANDCODE_SAVE_ENDPOINT,
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
  decodeCommandCodeSaveRequest,
  decodeCommandCodeSettings,
  decodeCommandCodeUsageRequest,
} from './client-contract.ts'
import type { CommandCodeSettingsView } from './client-contract.ts'
import { CommandCodeAdapter } from './adapter.ts'
import type { CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts'
import { discoverModels } from './discovery.ts'
import { readCommandCodeUsage } from './usage.ts'
import { defaultEffortForCommandCodeModel, effortsForCommandCodeModel } from './reasoning-catalog.ts'
import { isPositiveInteger } from './numbers.ts'

export {
  COMMANDCODE_PROVIDER,
  COMMANDCODE_SETTINGS_READ_ENDPOINT,
  COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT,
  COMMANDCODE_CREDENTIAL_SET_ENDPOINT,
  COMMANDCODE_RPC_CHANNEL,
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
  decodeCommandCodeSaveRequest,
  decodeCommandCodeSaveResult,
  decodeCommandCodeSettings,
  decodeCommandCodeSettingsReadResult,
  decodeCommandCodeUsageReply,
  decodeCommandCodeUsageRequest,
  decodeCommandCodeUsageView,
} from './client-contract.ts'
export type {
  CommandCodeDiscoveryRequest,
  CommandCodeDiscoveryResult,
  CommandCodeSaveRequest,
  CommandCodeSaveResult,
  CommandCodeUsageReply,
  CommandCodeUsageRequest,
} from './client-contract.ts'

export const name = 'llm-commandcode'
export const inject = ['llm']

const NS = settingsNamespace(COMMANDCODE_SETTINGS_NAMESPACE)
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
  defaultEffort: z.string(),
  inputModalities: z.array(z.union(MODEL_MODALITIES)).default(['text']),
})

export interface Config {
  apiKeyEnv?: string
  models?: CommandCodeModelConfig[]
  defaultContextWindow?: number
  defaultMaxTokens?: number
  requestTimeoutMs?: number
  streamIdleTimeoutMs?: number
  zeroDataRetention?: boolean
  usageEnabled?: boolean
  retryPolicy?: RetryPolicyConfig
  /** Expose provider management to configured trusted hosts; disabled keeps loopback-only RPC. */
  remoteManagement?: boolean
}

export const Config: z<Config> = z.object({
  apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
  models: z.array(catalogModel).default(DEFAULT_MODELS),
  defaultContextWindow: z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW),
  defaultMaxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_TOKENS),
  requestTimeoutMs: z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).default(DEFAULT_REQUEST_TIMEOUT_MS),
  streamIdleTimeoutMs: z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).default(DEFAULT_STREAM_IDLE_TIMEOUT_MS),
  zeroDataRetention: z.boolean().default(false),
  usageEnabled: z.boolean().default(true),
  retryPolicy: RetryPolicySchema,
  remoteManagement: z.boolean().default(false),
})

function resolveModels(models: readonly CommandCodeModelConfig[] | undefined): CommandCodeModelConfig[] {
  const seen = new Set<string>()
  return [...models ?? DEFAULT_MODELS].map(model => {
    if (model.id.length === 0) throw new Error('llm-commandcode: model ids must be non-empty')
    if (seen.has(model.id)) throw new Error('llm-commandcode: duplicate model id ' + model.id)
    seen.add(model.id)
    if (model.contextWindow !== undefined && !isPositiveInteger(model.contextWindow)) throw new Error('llm-commandcode: invalid contextWindow for ' + model.id)
    if (model.contextWindowOverride !== undefined && !isPositiveInteger(model.contextWindowOverride)) throw new Error('llm-commandcode: invalid contextWindowOverride for ' + model.id)
    if (model.maxTokens !== undefined && !isPositiveInteger(model.maxTokens)) throw new Error('llm-commandcode: invalid maxTokens for ' + model.id)
    const efforts = effortsForCommandCodeModel(model)
    const defaultEffort = defaultEffortForCommandCodeModel(model)
    if (model.defaultEffort !== undefined && !efforts.includes(model.defaultEffort)) throw new Error('llm-commandcode: defaultEffort is not offered for ' + model.id)
    const input = model.inputModalities === undefined || model.inputModalities.length === 0 ? ['text'] as const : model.inputModalities
    if (new Set(input).size !== input.length || input.some(item => !MODEL_MODALITIES.includes(item))) throw new Error('llm-commandcode: invalid inputModalities for ' + model.id)
    return {
      id: model.id,
      ...(model.name === undefined ? {} : { name: model.name }),
      ...(model.description === undefined ? {} : { description: model.description }),
      ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
      ...(model.contextWindowOverride === undefined ? {} : { contextWindowOverride: model.contextWindowOverride }),
      ...(model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens }),
      ...(defaultEffort === undefined ? {} : { defaultEffort }),
      inputModalities: [...input],
    }
  })
}

export function resolveAdapterOptions(config: Config): CommandCodeConnectionOptions {
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

function failure(message: string) {
  return { ok: false as const, error: { code: 'internal' as const, message, details: {} } }
}

export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config
  let lastRaw: Config | undefined
  let lastGood: CommandCodeConnectionOptions | undefined
  const options = (): CommandCodeConnectionOptions => {
    const raw = current()
    if (raw === lastRaw && lastGood !== undefined) return lastGood
    try {
      const next = resolveAdapterOptions(raw)
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

  ctx.llm.registerModelDiscovery(NS, async request => {
    return (await discoverModels({
      ...(request.signal === undefined ? {} : { signal: request.signal }),
    })).models
  })

  ctx.inject(['connection'], connectionCtx => {
    connectionCtx.connection.rpc.handle(
      COMMANDCODE_RPC_CHANNEL,
      async (endpoint, payload, signal) => {
        if (endpoint === COMMANDCODE_SETTINGS_READ_ENDPOINT) {
          const descriptor = ctx.get('settings')?.describe().find(item => item.ns === NS)
          const settings = decodeCommandCodeSettings(descriptor?.value)
          if (descriptor === undefined || settings === undefined) return failure('Command Code settings are unavailable')
          return { ok: true as const, value: { settings, revision: descriptor.revision, credential: await credentialStatus() } }
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
          } catch {
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
          if (!options().usageEnabled) return { ok: true as const, value: { status: 'unsupported' as const } }
          try {
            const result = await readCommandCodeUsage({ signal }, storedApiKey)
            return { ok: true as const, value: result }
          } catch (error: unknown) {
            return failure(error instanceof Error ? error.message : 'Command Code usage read failed')
          }
        }
        if (endpoint === COMMANDCODE_SAVE_ENDPOINT) {
          const request = decodeCommandCodeSaveRequest(payload)
          if (request === undefined) return failure('invalid Command Code settings request')
          const settings = ctx.get('settings')
          if (settings === undefined) return failure('Command Code settings are unavailable')
          try {
            const before = settings.describe().find(descriptor => descriptor.ns === NS)
            if (before === undefined) return failure('Command Code settings are unavailable')
            const currentSettings = decodeCommandCodeSettings(before.value)
            if (currentSettings === undefined) return failure('Command Code settings are invalid')
            const next = { ...currentSettings, ...request.settings, apiKeyEnv: currentSettings.apiKeyEnv }
            const ops: SettingsPathOp[] = []
            for (const field of ['models', 'defaultContextWindow', 'defaultMaxTokens', 'requestTimeoutMs', 'streamIdleTimeoutMs', 'zeroDataRetention', 'usageEnabled'] as const) {
              if (!deepEqualJson(currentSettings[field], next[field])) ops.push({ op: 'set', path: [field], value: next[field] })
            }
            if (ops.length > 0) await settings.mutate(NS, ops, request.expectedRevision)
            const accepted = settings.describe().find(descriptor => descriptor.ns === NS)
            const acceptedSettings = decodeCommandCodeSettings(accepted?.value)
            if (accepted === undefined || acceptedSettings === undefined) return failure('Command Code settings could not be reloaded')
            return { ok: true as const, value: { settings: acceptedSettings, revision: accepted.revision } }
          } catch (error: unknown) {
            return failure(error instanceof Error ? error.message : 'Command Code settings save failed')
          }
        }
        return failure('unknown Command Code endpoint: ' + endpoint)
      },
      { authority: config.remoteManagement === true ? 'trusted-host' : 'loopback' },
    )
  })

  installSettingsSection(ctx, NS, Config, config, {
    setSource: source => { current = source },
    onChange: ensureRegistration,
    validate: value => { resolveAdapterOptions(value) },
  })
}

export type { CommandCodeSettingsView }
