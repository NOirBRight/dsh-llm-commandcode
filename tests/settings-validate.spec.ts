import { describe, expect, it } from 'vitest'
import * as Plugin from '../src/index.ts'

describe('Command Code configuration validation', () => {
  it('rejects duplicate model IDs before a provider route is registered', () => {
    expect(() => Plugin.resolveAdapterOptions(Plugin.Config({
      models: [
        { id: 'duplicate-model', contextWindow: 100_000 },
        { id: 'duplicate-model', contextWindow: 100_000 },
      ],
    }))).toThrow(/duplicate model id/)
  })

  it('rejects request timeouts beyond the runtime timer limit', () => {
    expect(() => Plugin.Config({ requestTimeoutMs: 2_147_483_648 })).toThrow()
  })
})
