import { describe, expect, it } from 'vitest'
import { groupCommandCodeModels, planGroupForModel } from '../src/catalog-groups.ts'

describe('Command Code model plan groups', () => {
  it('groups candidates by the official CLI subscription categories', () => {
    const groups = groupCommandCodeModels([
      { id: 'claude-sonnet-4-6', contextWindow: 1000000 },
      { id: 'claude-opus-5', contextWindow: 1000000 },
      { id: 'deepseek/deepseek-v4-flash', contextWindow: 1000000 },
      { id: 'unknown/model', contextWindow: 100000 },
    ])
    expect(groups.map(group => [group.id, group.models.map(model => model.id)])).toEqual([
      ['go', ['deepseek/deepseek-v4-flash']],
      ['pro', ['claude-sonnet-4-6']],
      ['provider', ['claude-opus-5']],
      ['other', ['unknown/model']],
    ])
  })

  it('falls back to an access-verification group for new ids', () => {
    expect(planGroupForModel('future/provider-model')).toBe('other')
  })
})
