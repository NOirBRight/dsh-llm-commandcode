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

  it('ignores arbitrary effort lists while preserving valid saved defaults', () => {
    const injected = { id: 'future-model', reasoningEfforts: ['low', 'high'] } as unknown as Parameters<typeof effortsForCommandCodeModel>[0]
    expect(effortsForCommandCodeModel(injected)).toEqual([])
    expect(defaultEffortForCommandCodeModel({ id: 'future-model', defaultEffort: 'low' })).toBeUndefined()
    expect(defaultEffortForCommandCodeModel({ id: 'gpt-5.6-luna', defaultEffort: 'low' })).toBe('low')
  })
})
