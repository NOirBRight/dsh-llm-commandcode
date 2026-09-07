// @vitest-environment jsdom
// Collapsed header quota: usage loads without expansion, expansion never refires, failures stay truthful.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandCodeSettingsCard } from '../src/client/CommandCodeSettingsCard.tsx'
import type { CommandCodeSettingsCardProps } from '../src/client/CommandCodeSettingsCard.tsx'
import { en } from '../src/client/locales.ts'
import type { CommandCodeSettingsView } from '../src/client-contract.ts'

afterEach(() => { cleanup() })

const settings: CommandCodeSettingsView = {
  apiKeyEnv: 'COMMANDCODE_API_KEY',
  models: [{ id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', contextWindow: 1_050_000 }],
  defaultContextWindow: 1_000_000,
  defaultMaxTokens: 32768,
  requestTimeoutMs: 60000,
  streamIdleTimeoutMs: 300000,
  zeroDataRetention: false,
  usageEnabled: true,
}

const usageOk = {
  status: 'ok' as const,
  usage: { fetchedAt: '2026-09-01T00:00:00.000Z', failures: [], credits: { weekly: { used: 20, cap: 100 } } },
}

function props(overrides: Record<string, unknown> = {}): CommandCodeSettingsCardProps {
  const snapshot = { status: 'ready' as const, value: settings, base: {}, user: {}, revision: 1, writable: true, mode: 'host' as const }
  return {
    t: (key: keyof typeof en) => en[key],
    useCommandCodeSettings: (selector: (value: typeof snapshot) => unknown) => selector(snapshot),
    describeCredential: vi.fn(async () => ({ configured: true, writable: true })),
    storeApiKey: vi.fn(async () => {}),
    saveConfiguration: vi.fn(async () => ({ settings, revision: 2 })),
    discoverModels: vi.fn(async () => ({ models: [], warnings: [] })),
    fetchUsage: vi.fn(async () => usageOk),
    beginModelPicker: vi.fn(),
    completeModelPicker: vi.fn(),
    failModelPicker: vi.fn(),
    closeModelPicker: vi.fn(),
    ...overrides,
  } as unknown as CommandCodeSettingsCardProps
}

describe('CommandCodeSettingsCard collapsed quota', () => {
  it('shows header quota while collapsed and does not reload on expansion', async () => {
    const fetchUsage = vi.fn(async () => usageOk)
    render(<CommandCodeSettingsCard {...props({ fetchUsage })} />)

    const meter = await screen.findByRole('meter', { name: en.weekly })
    expect(meter.getAttribute('aria-valuenow')).toBe('80')
    expect(fetchUsage).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: en.expand + ': ' + en.title }))
    await screen.findByLabelText(en.apiKey)
    expect(screen.getAllByRole('meter', { name: en.weekly }).length).toBeGreaterThanOrEqual(2)
    expect(fetchUsage).toHaveBeenCalledTimes(1)
  })

  it('reports a usage read failure truthfully with a collapsed unavailable dash', async () => {
    const fetchUsage = vi.fn(async () => { throw new Error('quota boom') })
    render(<CommandCodeSettingsCard {...props({ fetchUsage })} />)

    await waitFor(() => { expect(fetchUsage).toHaveBeenCalledTimes(1) })
    // Truthful unavailable state: dash mini, never a fabricated percent.
    expect(document.querySelector('[data-provider-quota-mini] [data-provider-quota-missing]')).not.toBeNull()
    expect(screen.queryByRole('meter')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: en.expand + ': ' + en.title }))
    await screen.findByText('quota boom')
    expect(fetchUsage).toHaveBeenCalledTimes(1)
  })
})
