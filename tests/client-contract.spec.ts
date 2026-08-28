import { describe, expect, it } from 'vitest'
import {
  decodeCommandCodeCredentialSetRequest,
  decodeCommandCodeDiscoveryRequest,
  decodeCommandCodeSettings,
  decodeCommandCodeSettingsReadResult,
  decodeCommandCodeUsageReply,
} from '../src/client-contract.ts'

describe('Command Code browser contracts', () => {
  it('rejects malformed model context values and accepts exact capacities', () => {
    const base = {
      apiKeyEnv: 'COMMANDCODE_API_KEY',
      models: [{ id: 'gpt', contextWindow: 1_050_000, inputModalities: ['text'] }],
      defaultContextWindow: 1_000_000,
      defaultMaxTokens: 32768,
      requestTimeoutMs: 60000,
      streamIdleTimeoutMs: 300000,
      zeroDataRetention: false,
      usageEnabled: true,
    }
    expect(decodeCommandCodeSettings(base)?.models[0]?.contextWindow).toBe(1_050_000)
    expect(decodeCommandCodeSettings({ ...base, models: [{ id: 'gpt', contextWindow: 0 }] })).toBeUndefined()
    expect(decodeCommandCodeSettings({ ...base, models: [{ id: 'gpt-5.6-luna', contextWindow: 1_050_000, reasoningEfforts: ['low'] }] })).toBeUndefined()
    expect(decodeCommandCodeSettings({ ...base, providerBaseURL: 'https://evil.example/provider/v1' })).not.toHaveProperty('providerBaseURL')
  })

  it('decodes management snapshots without secrets and accepts only one-way key writes', () => {
    const settings = { apiKeyEnv: 'COMMANDCODE_API_KEY', models: [], defaultContextWindow: 1, defaultMaxTokens: 1, requestTimeoutMs: 1, streamIdleTimeoutMs: 1, zeroDataRetention: false, usageEnabled: true }
    expect(decodeCommandCodeSettingsReadResult({ settings, revision: 3, credential: { configured: true, writable: true } })).toMatchObject({ revision: 3, credential: { configured: true } })
    expect(decodeCommandCodeSettingsReadResult({ settings: { ...settings, apiKey: 'secret' }, revision: 3, credential: { configured: true, writable: true } })).toBeUndefined()
    expect(decodeCommandCodeCredentialSetRequest({ apiKey: 'secret' })).toEqual({ apiKey: 'secret' })
    expect(decodeCommandCodeCredentialSetRequest({ apiKey: 'secret', value: 'secret' })).toBeUndefined()
  })

  it('allows no browser-controlled discovery endpoint', () => {
    expect(decodeCommandCodeDiscoveryRequest({})).toEqual({})
    expect(decodeCommandCodeDiscoveryRequest({ providerBaseURL: 'https://evil.example/provider/v1' })).toBeUndefined()
  })

  it('decodes secret-free quota reply and rejects a malformed window', () => {
    expect(decodeCommandCodeUsageReply({
      status: 'ok',
      usage: {
        fetchedAt: '2026-08-26T00:00:00Z',
        failures: [],
        credits: { monthlyCredits: 10, fiveHour: { used: 2, cap: 10, resetAt: '2026-08-27T00:00:00Z' } },
      },
    })).toMatchObject({ status: 'ok' })
    expect(decodeCommandCodeUsageReply({
      status: 'ok', usage: { fetchedAt: 'x', failures: [], credits: { fiveHour: { used: 2 } } },
    })).toBeUndefined()
  })
})
