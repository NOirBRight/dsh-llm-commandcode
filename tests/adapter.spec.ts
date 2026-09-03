import { describe, expect, it } from 'vitest'
import { CommandCodeAdapter, httpErrorCode } from '../src/adapter.ts'
import { resolveAdapterOptions } from '../src/index.ts'
import { createCommandCodePiAiProfile } from '../src/pi-ai-profile.ts'

function options() {
  return resolveAdapterOptions({
    apiKeyEnv: 'COMMANDCODE_API_KEY',
    zeroDataRetention: true,
    models: [
      {
        id: 'gpt-5.6-luna', contextWindow: 1_050_000,
      },
      {
        id: 'claude-sonnet-4-6', contextWindow: 1_000_000,
        defaultEffort: 'xhigh',
      },
    ],
  })
}

describe('CommandCodeAdapter via PiAiAdapter', () => {
  it('builds one mixed provider with model-level OpenAI and Anthropic dispatch', () => {
    const profile = createCommandCodePiAiProfile(options())
    const models = profile.piProvider.getModels()
    expect(models.map(model => [model.id, model.api])).toEqual([
      ['gpt-5.6-luna', 'openai-completions'],
      ['claude-sonnet-4-6', 'anthropic-messages'],
    ])
    expect(profile.piProvider.headers).toMatchObject({ 'x-cmd-zdr': '1' })
    expect(models[0]?.thinkingLevelMap).toMatchObject({ low: 'low', max: 'max' })
    expect(models[1]?.compat).toMatchObject({ forceAdaptiveThinking: true })
  })

  it('resolves exact context and selectable/default effort metadata', async () => {
    const connection = options()
    const adapter = new CommandCodeAdapter({ options: () => connection, resolveApiKey: async () => 'key' })
    await expect(adapter.resolveModel('commandcode', 'gpt-5.6-luna')).resolves.toMatchObject({
      context: { contextWindow: 1_050_000 },
      reasoning: {
        defaultEffort: 'max',
        efforts: [
          { id: 'low', name: 'Low' },
          { id: 'medium', name: 'Medium' },
          { id: 'high', name: 'High' },
          { id: 'xhigh', name: 'Extra high' },
          { id: 'max', name: 'Max' },
        ],
      },
    })
  })

  it('projects official modalities and new-model effort metadata', () => {
    const connection = resolveAdapterOptions({
      apiKeyEnv: 'COMMANDCODE_API_KEY',
      models: [
        { id: 'Qwen/Qwen3.8-Max-0902', contextWindow: 1_000_000 },
        { id: 'meta/muse-spark-1.3-contributor', contextWindow: 1_048_576 },
        { id: 'meituan/LongCat-2.0:free', contextWindow: 1_048_576, thinking: true },
      ],
    })
    const models = createCommandCodePiAiProfile(connection).piProvider.getModels()
    expect(models.find(model => model.id === 'Qwen/Qwen3.8-Max-0902')).toMatchObject({
      input: ['text', 'image'],
      thinkingLevelMap: { low: 'low', medium: 'medium', xhigh: 'xhigh' },
    })
    expect(models.find(model => model.id === 'meta/muse-spark-1.3-contributor')).toMatchObject({
      input: ['text', 'image'],
      thinkingLevelMap: { max: 'max' },
    })
    expect(models.find(model => model.id === 'meituan/LongCat-2.0:free')).toMatchObject({ reasoning: false, input: ['text'] })
  })

  it('has no configurable provider endpoint surface', () => {
    const legacy = { providerBaseURL: 'https://evil.example/provider/v1' } as unknown as Parameters<typeof resolveAdapterOptions>[0]
    expect(resolveAdapterOptions(legacy).providerBaseURL).toBe('https://api.commandcode.ai/provider/v1')
  })

  it('retains provider-specific error classification helpers', () => {
    expect(httpErrorCode(401)).toBe('INVALID_CREDENTIAL')
    expect(httpErrorCode(422, { error: { code: 'cmd_zdr_no_providers' } })).toBe('ZDR_UNAVAILABLE')
    expect(httpErrorCode(429)).toBe('RATE_LIMIT')
  })

  it('declares neutral imageRequestPricing for alpha hosts', () => {
    expect(Object.hasOwn(CommandCodeAdapter.prototype, 'imageRequestPricing')).toBe(true)
    const connection = options()
    const adapter = new CommandCodeAdapter({ options: () => connection, resolveApiKey: async () => 'key' })
    expect(adapter.imageRequestPricing('commandcode', 'gpt-5.6-luna')).toBeUndefined()
  })
})
