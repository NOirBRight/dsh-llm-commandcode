import { describe, expect, it } from 'vitest'
import { defaultEffortForCommandCodeModel, effortsForCommandCodeModel } from '../src/reasoning-catalog.ts'

describe('official Command Code effort catalog', () => {
  it('covers every model currently saved in the lab profile', () => {
    expect(effortsForCommandCodeModel({ id: 'z-ai/glm-5.3-flash' })).toEqual(['low', 'high', 'max'])
    expect(effortsForCommandCodeModel({ id: 'zai-org/GLM-5.3' })).toEqual(['low', 'high', 'max'])
    expect(effortsForCommandCodeModel({ id: 'deepseek/deepseek-v4-flash' })).toEqual(['high', 'max'])
    expect(effortsForCommandCodeModel({ id: 'deepseek/deepseek-v4-pro' })).toEqual(['high', 'max'])
    expect(effortsForCommandCodeModel({ id: 'deepseek/deepseek-v4-flash-vision-exp' })).toEqual(['high', 'max'])
    expect(defaultEffortForCommandCodeModel({ id: 'z-ai/glm-5.3-flash' })).toBe('max')
    expect(defaultEffortForCommandCodeModel({ id: 'zai-org/GLM-5.3' })).toBe('max')
    expect(defaultEffortForCommandCodeModel({ id: 'deepseek/deepseek-v4-flash' })).toBe('max')
    expect(defaultEffortForCommandCodeModel({ id: 'deepseek/deepseek-v4-pro' })).toBe('max')
    expect(defaultEffortForCommandCodeModel({ id: 'deepseek/deepseek-v4-flash-vision-exp' })).toBe('max')
  })

  it('matches Codex GPT defaults and highest Muse reasoning', () => {
    expect(defaultEffortForCommandCodeModel({ id: 'gpt-5.6-sol' })).toBe('high')
    expect(defaultEffortForCommandCodeModel({ id: 'gpt-5.6-terra' })).toBe('xhigh')
    expect(defaultEffortForCommandCodeModel({ id: 'gpt-5.6-luna' })).toBe('max')
    expect(defaultEffortForCommandCodeModel({ id: 'gpt-5.5' })).toBe('xhigh')
    expect(defaultEffortForCommandCodeModel({ id: 'gpt-5.4-mini' })).toBe('high')
    expect(defaultEffortForCommandCodeModel({ id: 'meta/muse-spark-1.2' })).toBe('xhigh')
    expect(defaultEffortForCommandCodeModel({ id: 'meta/muse-spark-1.2-contributor' })).toBe('xhigh')
    expect(effortsForCommandCodeModel({ id: 'meta/muse-spark-1.2' })).toEqual(['low', 'medium', 'high', 'xhigh'])
    expect(effortsForCommandCodeModel({ id: 'meta/muse-spark-1.1' })).toEqual(['low', 'medium', 'high', 'xhigh'])
  })

  it('freezes existing GPT and Grok effort sets and defaults', () => {
    expect(effortsForCommandCodeModel({ id: 'gpt-5.6-sol' })).toEqual(['low', 'medium', 'high', 'xhigh', 'max'])
    expect(effortsForCommandCodeModel({ id: 'gpt-5.5' })).toEqual(['low', 'medium', 'high', 'xhigh'])
    expect(effortsForCommandCodeModel({ id: 'gpt-5.4-mini' })).toEqual(['low', 'medium', 'high'])
    expect(effortsForCommandCodeModel({ id: 'xai/grok-4.5' })).toEqual(['low', 'medium', 'high'])
    expect(effortsForCommandCodeModel({ id: 'xai/grok-4.6' })).toEqual(['low', 'medium', 'high', 'xhigh'])
    expect(defaultEffortForCommandCodeModel({ id: 'gpt-5.6-sol' })).toBe('high')
    expect(defaultEffortForCommandCodeModel({ id: 'gpt-5.5' })).toBe('xhigh')
    expect(defaultEffortForCommandCodeModel({ id: 'gpt-5.4-mini' })).toBe('high')
    expect(defaultEffortForCommandCodeModel({ id: 'xai/grok-4.5' })).toBe('high')
    expect(defaultEffortForCommandCodeModel({ id: 'xai/grok-4.6' })).toBe('high')
  })

  it('covers the 1.44.0 additions and the Kimi K3 exception', () => {
    expect(effortsForCommandCodeModel({ id: 'claude-fable-5-1' })).toEqual(['low', 'medium', 'high', 'xhigh', 'max'])
    expect(defaultEffortForCommandCodeModel({ id: 'claude-fable-5-1' })).toBe('high')
    expect(effortsForCommandCodeModel({ id: 'deepseek/deepseek-v4-flash-fast' })).toEqual(['low', 'high', 'max'])
    expect(defaultEffortForCommandCodeModel({ id: 'deepseek/deepseek-v4-flash-fast' })).toBe('max')
    expect(effortsForCommandCodeModel({ id: 'moonshotai/Kimi-K3' })).toEqual(['low', 'high', 'max'])
    expect(defaultEffortForCommandCodeModel({ id: 'moonshotai/Kimi-K3' })).toBe('high')
    expect(effortsForCommandCodeModel({ id: 'Qwen/Qwen3.8-Max-0902' })).toEqual(['low', 'medium', 'xhigh'])
    expect(defaultEffortForCommandCodeModel({ id: 'Qwen/Qwen3.8-Max-0902' })).toBe('xhigh')
    expect(effortsForCommandCodeModel({ id: 'tencent/hy4-preview' })).toEqual(['low', 'medium', 'high'])
    expect(defaultEffortForCommandCodeModel({ id: 'tencent/hy4-preview' })).toBe('high')
    expect(effortsForCommandCodeModel({ id: 'google/gemini-3.8-flash' })).toEqual(['low', 'medium', 'high'])
    expect(defaultEffortForCommandCodeModel({ id: 'google/gemini-3.8-flash' })).toBe('high')
    expect(effortsForCommandCodeModel({ id: 'meta/muse-spark-1.3' })).toEqual(['low', 'medium', 'high', 'xhigh', 'max'])
    expect(defaultEffortForCommandCodeModel({ id: 'meta/muse-spark-1.3' })).toBe('max')
    expect(effortsForCommandCodeModel({ id: 'meta/muse-spark-1.3-contributor' })).toEqual(['low', 'medium', 'high', 'xhigh', 'max'])
    expect(defaultEffortForCommandCodeModel({ id: 'meta/muse-spark-1.3-contributor' })).toBe('max')
    expect(effortsForCommandCodeModel({ id: 'meituan/LongCat-2.0:free' })).toEqual([])
    expect(defaultEffortForCommandCodeModel({ id: 'meituan/LongCat-2.0:free' })).toBeUndefined()
  })

  it('ignores arbitrary effort lists while preserving valid saved defaults', () => {
    const injected = { id: 'future-model', reasoningEfforts: ['low', 'high'] } as unknown as Parameters<typeof effortsForCommandCodeModel>[0]
    expect(effortsForCommandCodeModel(injected)).toEqual([])
    expect(defaultEffortForCommandCodeModel({ id: 'future-model', defaultEffort: 'low' })).toBeUndefined()
    expect(defaultEffortForCommandCodeModel({ id: 'gpt-5.6-luna', defaultEffort: 'low' })).toBe('low')
  })
})
