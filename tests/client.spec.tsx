// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandCodeSettingsCard } from '../src/client/CommandCodeSettingsCard.tsx'
import { en } from '../src/client/locales.ts'
import type { CommandCodeSettingsView } from '../src/client-contract.ts'
import type { CommandCodeSettingsCardProps } from '../src/client/CommandCodeSettingsCard.tsx'

afterEach(() => cleanup())

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

function props(overrides: Record<string, unknown> = {}, settingsValue: CommandCodeSettingsView = settings): CommandCodeSettingsCardProps {
  const snapshot = { status: 'ready' as const, value: settingsValue, base: {}, user: {}, revision: 1, writable: true, mode: 'host' as const }
  const face = {
    t: (key: keyof typeof en) => en[key],
    useCommandCodeSettings: (selector: (value: typeof snapshot) => unknown) => selector(snapshot),
    describeCredential: vi.fn(async () => ({ configured: true, writable: true })),
    storeApiKey: vi.fn(async () => {}),
    beginModelPicker: vi.fn(),
    completeModelPicker: vi.fn(),
    failModelPicker: vi.fn(),
    closeModelPicker: vi.fn(),
    saveConfiguration: vi.fn(async () => ({ settings, revision: 2 })),
    discoverModels: vi.fn(async () => ({ models: [{ id: 'new-model', contextWindow: 1_048_576, inputModalities: ['text'] }], warnings: [] })),
    fetchUsage: vi.fn(async () => ({
      status: 'ok' as const,
      usage: {
        fetchedAt: '2026-08-26T00:00:00.000Z',
        failures: [],
        account: { userName: 'demo-user' },
        plan: { name: 'Provider', status: 'active' },
        credits: {
          monthlyCredits: 15,
          purchasedCredits: 4,
          freeCredits: 1,
          fiveHour: { used: 3, cap: 10, exceeded: false, resetAt: '2026-08-27T00:00:00.000Z' },
          weekly: { used: 8, cap: 20 },
        },
        summary: { totalCost: 1.25, totalTokensIn: 100, totalTokensOut: 50 },
      },
    })),
    ...overrides,
  }
  return face as unknown as CommandCodeSettingsCardProps
}

describe('CommandCodeSettingsCard', () => {
  it('renders exact context metadata and account quota in the page content', async () => {
    render(<CommandCodeSettingsCard {...props()} />)
    expect(screen.queryByText('Connection')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Expand: Command Code/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Model catalog' }))
    fireEvent.click(screen.getByRole('button', { name: /Model details/ }))
    expect(screen.getByDisplayValue('1050000')).toBeTruthy()
    expect(screen.getByText('Low · Medium · High · Extra high · Max')).toBeTruthy()
    expect((screen.getByRole('combobox', { name: 'Default effort' }) as HTMLSelectElement).value).toBe('max')
    expect(screen.queryByText('Image input')).toBeNull()
    expect(screen.queryByText('Protocol')).toBeNull()
    expect((screen.getByRole('textbox', { name: 'Provider API URL' }) as HTMLInputElement).disabled).toBe(true)
    await waitFor(() => expect(screen.getByText(/demo-user/)).toBeTruthy())
    expect(screen.getByText(/\$15\.00/)).toBeTruthy()
    expect(screen.getByText(/\$3\.00 \/ \$10\.00/)).toBeTruthy()
    expect(screen.getByText(/Provider \(active\)/)).toBeTruthy()
  })

  it('refreshes the quota through the Host-facing face', async () => {
    const fetchUsage = vi.fn(async () => ({ status: 'unsupported' as const }))
    render(<CommandCodeSettingsCard {...props({ fetchUsage })} />)
    fireEvent.click(screen.getByRole('button', { name: /Expand: Command Code/ }))
    await waitFor(() => expect(fetchUsage).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(fetchUsage).toHaveBeenCalledTimes(2))
  })

  it('marks a newly entered key dirty so Save persists it', async () => {
    const saveConfiguration = vi.fn(async () => ({ settings, revision: 2 }))
    render(<CommandCodeSettingsCard {...props({ saveConfiguration })} />)
    fireEvent.click(screen.getByRole('button', { name: /Expand: Command Code/ }))
    fireEvent.change(screen.getByPlaceholderText('Enter Command Code API key'), { target: { value: 'new-secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saveConfiguration).toHaveBeenCalledWith({ ...settings, models: [{ ...settings.models[0]!, defaultEffort: 'max' }] }, 'new-secret'))
  })

  it('keeps public discovery credential-free and endpoint-free', async () => {
    const storeApiKey = vi.fn(async () => {})
    const discoverModels = vi.fn(async () => ({ models: [{ id: 'new-model', contextWindow: 1048576, inputModalities: ['text'] }], warnings: [] }))
    render(<CommandCodeSettingsCard {...props({ storeApiKey, discoverModels }, { ...settings, usageEnabled: false })} />)
    fireEvent.click(screen.getByRole('button', { name: /Expand: Command Code/ }))
    fireEvent.change(screen.getByPlaceholderText('Enter Command Code API key'), { target: { value: 'new-secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fetch models' }))
    await waitFor(() => expect(discoverModels).toHaveBeenCalled())
    expect(storeApiKey).not.toHaveBeenCalled()
    expect(discoverModels.mock.calls[0]?.[0]).toEqual({})
  })
})
