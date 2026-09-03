/** Mixed OpenAI/Anthropic pi-ai profile for the Command Code Provider API. */

import { createProvider } from '@earendil-works/pi-ai'
import { anthropicMessagesApi } from '@earendil-works/pi-ai/api/anthropic-messages.lazy'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import type { Api, Model, Provider } from '@earendil-works/pi-ai'
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'
import { COMMANDCODE_PROVIDER } from './client-contract.ts'
import type { CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts'
import { effectiveApi, effectiveContext } from './types.ts'
import { effortsForCommandCodeModel } from './reasoning-catalog.ts'
import { inputModalitiesForCommandCodeModel } from './capability-catalog.ts'

const NO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
const DEFAULT_MAX_REQUEST_IMAGE_BYTES = 20 * 1024 * 1024

function providerAuth(): Provider['auth'] {
  return {
    apiKey: {
      name: 'Command Code API key',
      resolve: ({ credential }) => Promise.resolve({
        auth: credential?.key === undefined ? {} : { apiKey: credential.key },
        source: 'Command Code',
      }),
    },
  }
}

/** Anthropic SDK appends /v1/messages; the shared Command Code URL already ends in /v1. */
export function anthropicBaseURL(providerBaseURL: string): string {
  const normalized = providerBaseURL.replace(/\/+$/u, '')
  return normalized.endsWith('/v1') ? normalized.slice(0, -3) : normalized
}

function thinkingLevelMap(model: CommandCodeModelConfig) {
  if (model.thinking === false) return undefined
  const efforts = effortsForCommandCodeModel(model)
  if (efforts.length === 0) return undefined
  return Object.fromEntries(efforts.map(effort => [effort, effort]))
}

/** Build one pi-ai model whose api field selects the mixed provider implementation. */
export function toCommandCodePiAiModel(
  model: CommandCodeModelConfig,
  connection: CommandCodeConnectionOptions,
): Model<Api> {
  const api = effectiveApi(model)
  const levels = thinkingLevelMap(model)
  const reasoning = levels !== undefined
  return {
    id: model.id,
    name: model.name ?? model.id,
    api,
    provider: COMMANDCODE_PROVIDER,
    baseUrl: api === 'anthropic-messages' ? anthropicBaseURL(connection.providerBaseURL) : connection.providerBaseURL,
    reasoning,
    ...(levels === undefined ? {} : { thinkingLevelMap: levels }),
    input: model.inputModalities === undefined ? inputModalitiesForCommandCodeModel(model.id) : [...model.inputModalities],
    cost: NO_COST,
    contextWindow: effectiveContext(model, connection.defaultContextWindow),
    maxTokens: model.maxTokens ?? connection.defaultMaxTokens,
    compat: api === 'openai-completions'
      ? {
        supportsStore: false,
        supportsDeveloperRole: false,
        supportsReasoningEffort: reasoning,
        supportsUsageInStreaming: true,
        maxTokensField: 'max_tokens',
        thinkingFormat: 'openai',
      }
      : {
        forceAdaptiveThinking: reasoning,
        supportsEagerToolInputStreaming: true,
        supportsCacheControlOnTools: true,
        supportsStrictTools: false,
      },
  } as Model<Api>
}

/** Build the complete mixed-protocol profile for one immutable options snapshot. */
export function createCommandCodePiAiProfile(connection: CommandCodeConnectionOptions): ResolvedPiAiProviderProfile {
  const models = connection.models.map(model => toCommandCodePiAiModel(model, connection))
  const configuredMaxTokens = new Map<string, number>()
  for (const model of connection.models) if (model.maxTokens !== undefined) configuredMaxTokens.set(model.id, model.maxTokens)
  const piProvider = createProvider({
    id: COMMANDCODE_PROVIDER,
    name: 'Command Code',
    baseUrl: connection.providerBaseURL,
    ...(connection.zeroDataRetention ? { headers: { 'x-cmd-zdr': '1' } } : {}),
    auth: providerAuth(),
    models,
    api: {
      'openai-completions': openAICompletionsApi(),
      'anthropic-messages': anthropicMessagesApi(),
    },
  })
  return {
    provider: COMMANDCODE_PROVIDER,
    displayName: 'Command Code',
    apiKeyEnv: connection.apiKeyEnv,
    baseURL: connection.providerBaseURL,
    defaultContextWindow: connection.defaultContextWindow,
    defaultMaxTokens: connection.defaultMaxTokens,
    defaultInput: ['text'],
    streamIdleTimeoutMs: connection.streamIdleTimeoutMs,
    maxRequestImageBytes: DEFAULT_MAX_REQUEST_IMAGE_BYTES,
    requestImagePixelBudget: 2048 * 2048,
    requestImageMaxBytes: 1024 * 1024,
    retryPolicy: connection.retryPolicy,
    piProvider,
    configuredMaxTokens,
  }
}
