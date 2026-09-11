import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { discoverModels, parseCommandCodeModels, protocolForModel } from '../src/discovery.ts'
import {
  clearCommandCodeModelsDevCache,
  loadCommandCodeModelsDev,
  MODELS_DEV_URL,
  parseCommandCodeModelsDev,
  setCommandCodeModelsDevCachePathForTests,
} from '../src/models-dev.ts'

afterEach(() => {
  vi.restoreAllMocks()
  clearCommandCodeModelsDevCache()
  setCommandCodeModelsDevCachePathForTests(undefined)
})

describe('Command Code model discovery', () => {
  it('preserves provider context_length exactly and routes Claude to Anthropic', () => {
    const result = parseCommandCodeModels({
      object: 'list',
      data: [
        { id: 'claude-haiku-4-5-20251001', name: 'Haiku', context_length: 200000 },
        { id: 'gpt-5.6-luna', context_length: 1050000 },
        { id: 'Qwen/Qwen3.8-27B', context_length: 262144 },
        { id: 'missing-context' },
        { id: 'missing-context' },
      ],
    })
    expect(result.models.map(model => [model.id, model.contextWindow])).toEqual([
      ['claude-haiku-4-5-20251001', 200000],
      ['gpt-5.6-luna', 1050000],
      ['Qwen/Qwen3.8-27B', 262144],
      ['missing-context', undefined],
    ])
    expect(result.models.find(model => model.id === 'gpt-5.6-luna')?.defaultEffort).toBe('max')
    expect(result.models.find(model => model.id === 'claude-haiku-4-5-20251001')?.defaultEffort).toBe('high')
    expect(result.warnings).toEqual(['missing-context has no valid context_length'])
  })

  it('does not substitute context_window for the required context_length', () => {
    const result = parseCommandCodeModels({ data: [{ id: 'x', context_window: 197000 }] })
    expect(result.models[0]?.contextWindow).toBeUndefined()
    expect(result.warnings).toEqual(['x has no valid context_length'])
    expect(protocolForModel('CLAUDE-custom')).toBe('anthropic-messages')
    expect(protocolForModel('gpt-5.6-luna')).toBe('openai-completions')
  })

  it('projects official image capabilities and native reasoning for current ids', () => {
    const result = parseCommandCodeModels({
      data: [
        { id: 'gpt-5.6-sol', context_length: 1_050_000 },
        { id: 'xai/grok-4.6', context_length: 500_000 },
        { id: 'z-ai/glm-5.3-flash', context_length: 1_048_576 },
        { id: 'deepseek/deepseek-v4-flash-vision-exp', context_length: 1_000_000 },
        { id: 'deepseek/deepseek-v4.1-flash', context_length: 1_000_000 },
        { id: 'Qwen/Qwen3.8-Max-0902', context_length: 1_000_000 },
        { id: 'meituan/LongCat-2.0:free', context_length: 1_048_576 },
        { id: 'zai-org/GLM-5.2-Fast', context_length: 1_000_000 },
      ],
    })
    expect(result.models).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'gpt-5.6-sol', inputModalities: ['text', 'image'] }),
      expect.objectContaining({ id: 'xai/grok-4.6', inputModalities: ['text', 'image'] }),
      expect.objectContaining({ id: 'z-ai/glm-5.3-flash', inputModalities: ['text', 'image'] }),
      expect.objectContaining({ id: 'deepseek/deepseek-v4-flash-vision-exp', inputModalities: ['text', 'image'] }),
      expect.objectContaining({
        id: 'deepseek/deepseek-v4.1-flash',
        inputModalities: ['text', 'image'],
        defaultEffort: 'max',
      }),
      expect.objectContaining({ id: 'Qwen/Qwen3.8-Max-0902', inputModalities: ['text', 'image'] }),
      expect.objectContaining({ id: 'meituan/LongCat-2.0:free', inputModalities: ['text'], thinking: true }),
      expect.objectContaining({ id: 'zai-org/GLM-5.2-Fast', inputModalities: ['text'] }),
    ]))
  })

  it('fills unknown ids from a models.dev overlay without inventing a window', () => {
    const overlay = parseCommandCodeModelsDev({
      openrouter: {
        models: {
          'deepseek/brand-new': {
            id: 'deepseek/brand-new',
            name: 'Brand New',
            attachment: true,
            reasoning: true,
            reasoning_options: [{ type: 'effort', values: ['low', 'high'] }],
            limit: { context: 32_000, output: 8_192 },
            modalities: { input: ['text', 'image'] },
          },
        },
      },
    })
    const result = parseCommandCodeModels({
      data: [{ id: 'deepseek/brand-new' }, { id: 'still-unknown' }],
    }, overlay)
    expect(result.models).toEqual([
      expect.objectContaining({
        id: 'deepseek/brand-new',
        name: 'Brand New',
        maxTokens: 8_192,
        inputModalities: ['text', 'image'],
        thinking: true,
        defaultEffort: 'high',
        thinkingEfforts: ['low', 'high'],
      }),
      expect.objectContaining({ id: 'still-unknown', inputModalities: ['text'] }),
    ])
    expect(result.models[0]?.contextWindow).toBeUndefined()
    expect(result.models[1]?.defaultEffort).toBeUndefined()
    expect(result.models[1]?.thinkingEfforts).toBeUndefined()
  })

  it('does not treat models.dev attachment as vision without image input', () => {
    const overlay = parseCommandCodeModelsDev({
      openrouter: {
        models: {
          'text-only': {
            id: 'text-only',
            attachment: true,
            reasoning: false,
            limit: { output: 100 },
            modalities: { input: ['text'] },
          },
        },
      },
    })
    const result = parseCommandCodeModels({ data: [{ id: 'text-only', context_length: 1000 }] }, overlay)
    expect(result.models[0]).toMatchObject({ id: 'text-only', inputModalities: ['text'], contextWindow: 1000 })
  })

  it('prefers OpenRouter over other same-id models.dev rows', () => {
    const overlay = parseCommandCodeModelsDev({
      'nano-gpt': {
        models: {
          'deepseek/brand-new': {
            id: 'deepseek/brand-new',
            reasoning: true,
            reasoning_options: [{ type: 'effort', values: ['none', 'low'] }],
            modalities: { input: ['text'] },
          },
        },
      },
      openrouter: {
        models: {
          'deepseek/brand-new': {
            id: 'deepseek/brand-new',
            reasoning: true,
            reasoning_options: [{ type: 'effort', values: ['low', 'high', 'max'] }],
            modalities: { input: ['text', 'image'] },
          },
        },
      },
    })
    const result = parseCommandCodeModels({ data: [{ id: 'deepseek/brand-new', context_length: 1_000_000 }] }, overlay)
    expect(result.models[0]).toMatchObject({
      id: 'deepseek/brand-new',
      inputModalities: ['text', 'image'],
      thinkingEfforts: ['low', 'high', 'max'],
      defaultEffort: 'max',
    })
  })

  it('fetches the public listing without transporting a credential', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === MODELS_DEV_URL) return new Response(JSON.stringify({}), { status: 200 })
      expect(url).toBe('https://api.commandcode.ai/provider/v1/models')
      expect(new Headers(init?.headers).get('authorization')).toBeNull()
      return new Response(JSON.stringify({ data: [{ id: 'gpt-test', context_length: 500000 }] }), { status: 200 })
    })
    const result = await discoverModels({}, fetchImpl)
    expect(result.models[0]?.contextWindow).toBe(500000)
    expect(result.models[0]?.inputModalities).toEqual(['text'])
  })

  it('merges models.dev capacities for ids the CLI snapshot does not know', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === MODELS_DEV_URL) {
        return new Response(JSON.stringify({
          openrouter: {
            models: {
              'deepseek/brand-new': {
                id: 'deepseek/brand-new',
                name: 'Brand New',
                attachment: true,
                reasoning: true,
                reasoning_options: [{ type: 'effort', values: ['low', 'high'] }],
                limit: { output: 4_000 },
                modalities: { input: ['text', 'image'] },
              },
            },
          },
        }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: [{ id: 'deepseek/brand-new', context_length: 99_000 }] }), { status: 200 })
    })
    const result = await discoverModels({}, fetchImpl)
    expect(result.models[0]).toMatchObject({
      id: 'deepseek/brand-new',
      name: 'Brand New',
      contextWindow: 99_000,
      maxTokens: 4_000,
      inputModalities: ['text', 'image'],
      thinking: true,
      defaultEffort: 'high',
      thinkingEfforts: ['low', 'high'],
    })
  })

  it('refreshes a warm overlay when GET /models has an unknown id', async () => {
    let modelsDevCalls = 0
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === MODELS_DEV_URL) {
        modelsDevCalls += 1
        const models = modelsDevCalls === 1
          ? { stale: { id: 'stale', limit: { output: 100 } } }
          : {
            stale: { id: 'stale', limit: { output: 100 } },
            'deepseek/brand-new': {
              id: 'deepseek/brand-new',
              name: 'Brand New',
              reasoning: true,
              reasoning_options: [{ type: 'effort', values: ['low', 'high'] }],
              limit: { output: 4_000 },
              modalities: { input: ['text'] },
            },
          }
        return new Response(JSON.stringify({ openrouter: { models } }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: [{ id: 'deepseek/brand-new', context_length: 1_000 }] }), { status: 200 })
    })
    await loadCommandCodeModelsDev(fetchImpl)
    const result = await discoverModels({}, fetchImpl)
    expect(modelsDevCalls).toBe(2)
    expect(result.models[0]).toMatchObject({
      id: 'deepseek/brand-new',
      name: 'Brand New',
      thinking: true,
      thinkingEfforts: ['low', 'high'],
    })
  })

  it('reuses a warm models.dev overlay without a second download', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      openrouter: { models: { 'deepseek/brand-new': { id: 'deepseek/brand-new', limit: { output: 100 } } } },
    }), { status: 200 }))
    await loadCommandCodeModelsDev(fetchImpl)
    await loadCommandCodeModelsDev(fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('reuses a disk overlay without a second download', async () => {
    const file = join(tmpdir(), `cc-models-dev-${String(process.pid)}-${String(Date.now())}.json`)
    setCommandCodeModelsDevCachePathForTests(file)
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      openrouter: { models: { 'deepseek/brand-new': { id: 'deepseek/brand-new', limit: { output: 1_000 } } } },
    }), { status: 200 }))
    try {
      await loadCommandCodeModelsDev(fetchImpl)
      clearCommandCodeModelsDevCache()
      setCommandCodeModelsDevCachePathForTests(file)
      const overlay = await loadCommandCodeModelsDev(fetchImpl)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(overlay.get('deepseek/brand-new')?.maxTokens).toBe(1_000)
    } finally {
      try { unlinkSync(file) } catch { /* test temp */ }
    }
  })

  it('does not stall Fetch when models.dev is slow', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === MODELS_DEV_URL) return await new Promise<Response>(() => undefined)
      return new Response(JSON.stringify({ data: [{ id: 'gpt-5.6-luna', context_length: 1_050_000 }] }), { status: 200 })
    })
    const started = Date.now()
    const result = await discoverModels({}, fetchImpl)
    expect(Date.now() - started).toBeLessThan(3_000)
    expect(result.models[0]).toMatchObject({ id: 'gpt-5.6-luna', defaultEffort: 'max' })
  })

  it('rejects a malformed listing', async () => {
    await expect(discoverModels({}, async () => new Response('{}'))).rejects.toMatchObject({ code: 'DISCOVERY_FAILED' })
  })
})
