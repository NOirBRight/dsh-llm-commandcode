// @vitest-environment jsdom
// Collapsed header quota: usage loads without expansion, expansion never refires, failures stay truthful.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandCodeSettingsCard } from '../src/client/CommandCodeSettingsCard.tsx'
import type { CommandCodeSettingsCardProps } from '../src/client/CommandCodeSettingsCard.tsx'
import { en } from '../src/client/locales.ts'
import { clearProviderUsageCache, peekCachedUsage, rememberHeadlineQuota } from 'dsh-llm-providers-ui/usage-readers'
import type { CommandCodeSettingsView } from '../src/client-contract.ts'

afterEach(() => { cleanup(); clearProviderUsageCache() })

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

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(value => {
    resolve = value
  })
  return { promise, resolve }
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
    await waitFor(() => { expect(document.querySelector('[data-provider-quota-mini] [data-provider-quota-missing]')).not.toBeNull() })
    expect(screen.queryByRole('meter')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: en.expand + ': ' + en.title }))
    await screen.findByText('quota boom')
    expect(fetchUsage).toHaveBeenCalledTimes(1)
  })

  it('ignores seeded cache when the endpoint reports unsupported', async () => {
    rememberHeadlineQuota('llm-commandcode', 'CommandCode', { remainingPercent: 80, label: 'seeded' })
    const fetchUsage = vi.fn(async () => ({ status: 'unsupported' as const }))
    render(<CommandCodeSettingsCard {...props({ fetchUsage })} />)

    await waitFor(() => { expect(document.querySelector('[data-provider-quota-mini] [data-provider-quota-missing]')).not.toBeNull() })
    expect(screen.queryByRole('meter')).toBeNull()
  })

  it('shows seeded cache in a loading placeholder before the snapshot is ready', async () => {
    rememberHeadlineQuota('llm-commandcode', 'CommandCode', { remainingPercent: 64, label: 'seeded' })
    const useCommandCodeSettings = (selector: (value: unknown) => unknown): unknown =>
      selector({ status: 'loading', value: undefined, base: {}, user: {}, revision: 0, writable: true, mode: 'host' })
    render(<CommandCodeSettingsCard {...props({ useCommandCodeSettings })} />)

    expect(document.querySelector('[data-provider-card-header]')).not.toBeNull()
    expect(document.querySelector('[data-provider-header-status]')).not.toBeNull()
    const meter = await screen.findByRole('meter', { name: 'seeded' })
    expect(meter.getAttribute('aria-valuenow')).toBe('64')
  })

  it('shows seeded cache while credential is still unknown', async () => {
    rememberHeadlineQuota('llm-commandcode', 'CommandCode', { remainingPercent: 64, label: 'seeded' })
    const describeCredential = vi.fn(() => new Promise<never>(() => {}))
    render(<CommandCodeSettingsCard {...props({ describeCredential })} />)

    const meter = await screen.findByRole('meter', { name: 'seeded' })
    expect(meter.getAttribute('aria-valuenow')).toBe('64')
  })

  it('drops a superseded read so old-account usage cannot resurrect', async () => {
    const usageA = { status: 'ok' as const, usage: { ...usageOk.usage, credits: { weekly: { used: 80, cap: 100 } } } }
    const usageB = { status: 'ok' as const, usage: { ...usageOk.usage, credits: { weekly: { used: 10, cap: 100 } } } }
    const first = deferred<typeof usageA>()
    const second = deferred<typeof usageB>()
    const fetchUsage = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const saveConfiguration = vi.fn((next: unknown) => Promise.resolve({ settings: next, revision: 2 }))
    render(<CommandCodeSettingsCard {...props({ fetchUsage, saveConfiguration })} />)
    await waitFor(() => { expect(fetchUsage).toHaveBeenCalledTimes(1) })
    fireEvent.click(screen.getByRole('button', { name: en.expand + ': ' + en.title }))
    fireEvent.change(screen.getByLabelText(en.apiKey), { target: { value: 'new-key' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => { expect(fetchUsage).toHaveBeenCalledTimes(2) })
    second.resolve(usageB)
    await waitFor(() => { expect(screen.getAllByRole('meter', { name: en.weekly }).map(meter => meter.getAttribute('aria-valuenow'))).toEqual(['90', '90']) })
    first.resolve(usageA)
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(screen.getAllByRole('meter', { name: en.weekly }).every(meter => meter.getAttribute('aria-valuenow') === '90')).toBe(true)
  })

  it.each(['success', 'failure'] as const)('retires old usage while saving a key, including save %s', async outcome => {
    const first = deferred<typeof usageOk>()
    const saveGate = deferred<void>()
    const fresh = { ...usageOk, usage: { ...usageOk.usage, credits: { weekly: { used: 10, cap: 100 } } } }
    const fetchUsage = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(fresh)
    const storeApiKey = vi.fn(async () => {
      await saveGate.promise
      if (outcome === 'failure') throw new Error('key rejected')
    })
    render(<CommandCodeSettingsCard {...props({ fetchUsage, storeApiKey })} />)
    await waitFor(() => { expect(fetchUsage).toHaveBeenCalledTimes(1) })
    fireEvent.click(screen.getByRole('button', { name: en.expand + ': ' + en.title }))
    fireEvent.change(screen.getByLabelText(en.apiKey), { target: { value: 'new-key' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => { expect(storeApiKey).toHaveBeenCalledTimes(1) })
    await act(async () => { first.resolve(usageOk) })
    expect(peekCachedUsage('llm-commandcode')).toBeUndefined()
    expect(screen.queryByRole('meter')).toBeNull()
    await act(async () => { saveGate.resolve() })
    if (outcome === 'failure') {
      expect(screen.getAllByText('key rejected').length).toBeGreaterThan(0)
      expect(fetchUsage).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: en.quotaRefresh }).hasAttribute('disabled')).toBe(false)
    } else {
      await waitFor(() => { expect(screen.getAllByRole('meter', { name: en.weekly }).map(meter => meter.getAttribute('aria-valuenow'))).toEqual(['90', '90']) })
    }
    expect(storeApiKey).toHaveBeenCalledTimes(1)
  })

  it('drops a late read after unmount without caching it', async () => {
    expect(peekCachedUsage('llm-commandcode')).toBeUndefined()
    const gate = deferred<typeof usageOk>()
    const fetchUsage = vi.fn(() => gate.promise)
    const view = render(<CommandCodeSettingsCard {...props({ fetchUsage })} />)
    await waitFor(() => { expect(fetchUsage).toHaveBeenCalledTimes(1) })
    view.unmount()
    gate.resolve(usageOk)
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(peekCachedUsage('llm-commandcode')).toBeUndefined()
  })

  it('shows a dash after a refresh fails following a success, never stale live quota', async () => {
    let mode: 'ok' | 'fail' = 'ok'
    const fetchUsage = vi.fn(() => mode === 'ok'
      ? Promise.resolve(usageOk)
      : Promise.reject(new Error('refresh boom')))
    render(<CommandCodeSettingsCard {...props({ fetchUsage })} />)
    expect((await screen.findByRole('meter', { name: en.weekly })).getAttribute('aria-valuenow')).toBe('80')
    fireEvent.click(screen.getByRole('button', { name: en.expand + ': ' + en.title }))
    await screen.findByRole('button', { name: en.quotaRefresh })
    mode = 'fail'
    fireEvent.click(screen.getByRole('button', { name: en.quotaRefresh }))
    await waitFor(() => { expect(document.querySelector('[data-provider-quota-mini] [data-provider-quota-missing]')).not.toBeNull() })
    expect(document.querySelector('[data-provider-quota-mini] [data-provider-quota-meter]')).toBeNull()
  })

  it('drops a stale credential read after save-new-key without hiding quota', async () => {
    let resolveCredential!: (value: unknown) => void
    const credentialGate = new Promise<unknown>(value => {
      resolveCredential = value
    })
    const describeCredential = vi.fn()
      .mockReturnValueOnce(credentialGate)
      .mockResolvedValue({ configured: true, writable: true })
    const saveConfiguration = vi.fn((next: unknown) => Promise.resolve({ settings: next, revision: 2 }))
    render(<CommandCodeSettingsCard {...props({ describeCredential, saveConfiguration })} />)
    await waitFor(() => { expect(describeCredential).toHaveBeenCalledTimes(1) })
    fireEvent.click(screen.getByRole('button', { name: en.expand + ': ' + en.title }))
    fireEvent.change(screen.getByLabelText(en.apiKey), { target: { value: 'new-key' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => { expect(describeCredential).toHaveBeenCalledTimes(2) })
    await screen.findByText(en.saved)
    await waitFor(() => { expect(screen.getAllByRole('meter', { name: en.weekly }).map(meter => meter.getAttribute('aria-valuenow'))).toEqual(['80', '80']) })
    resolveCredential({ configured: false, writable: true })
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(screen.getAllByRole('meter', { name: en.weekly }).every(meter => meter.getAttribute('aria-valuenow') === '80')).toBe(true)
  })

  it('hides seeded cache once credential is known false', async () => {
    rememberHeadlineQuota('llm-commandcode', 'CommandCode', { remainingPercent: 64, label: 'seeded' })
    const describeCredential = vi.fn(async () => ({ configured: false, writable: true }))
    render(<CommandCodeSettingsCard {...props({ describeCredential })} />)

    await waitFor(() => { expect(screen.queryByRole('meter')).toBeNull() })
    expect(document.querySelector('[data-provider-quota]')).toBeNull()
  })
})
