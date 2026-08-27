import { describe, expect, it, vi } from 'vitest'
import { discoverModels, parseCommandCodeModels, protocolForModel } from '../src/discovery.ts'

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

  it('fetches the public listing without transporting a credential', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.commandcode.ai/provider/v1/models')
      expect(new Headers(init?.headers).get('authorization')).toBeNull()
      return new Response(JSON.stringify({ data: [{ id: 'gpt-test', context_length: 500000 }] }), { status: 200 })
    })
    const result = await discoverModels({}, fetchImpl)
    expect(result.models[0]?.contextWindow).toBe(500000)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('rejects a malformed listing', async () => {
    await expect(discoverModels({}, async () => new Response('{}'))).rejects.toMatchObject({ code: 'DISCOVERY_FAILED' })
  })
})
