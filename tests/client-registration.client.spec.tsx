// @vitest-environment jsdom

import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import {
  COMMANDCODE_CREDENTIAL_SET_ENDPOINT,
  COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT,
  COMMANDCODE_RPC_METHOD,
} from '../src/client-contract.ts'
import { clearProviderUsageCache, peekCachedUsage, rememberHeadlineQuota } from 'dsh-llm-providers-ui/usage-readers'

interface SlotEntry {
  options: Record<string, unknown>
  inject?: () => unknown
}

class FakeSlots extends Service {
  private readonly registered: SlotEntry[] = []
  private readonly listeners = new Map<string, Set<() => void>>()

  constructor(ctx: Context) { super(ctx, 'slots') }

  inject(_name: string, register: () => () => void): void { this.ctx.effect(register) }

  register(options: Record<string, unknown> & { inject?: () => unknown }, _component: unknown): () => void {
    const entry = { options, inject: options.inject }
    this.registered.push(entry)
    this.notify(String(options.name))
    return () => {
      const index = this.registered.indexOf(entry)
      if (index < 0) return
      this.registered.splice(index, 1)
      this.notify(String(options.name))
    }
  }

  entries(name: string): readonly SlotEntry[] { return this.registered.filter(entry => entry.options.name === name) }

  subscribe(name: string, listener: () => void): () => void {
    const listeners = this.listeners.get(name) ?? new Set<() => void>()
    listeners.add(listener)
    this.listeners.set(name, listeners)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this.listeners.delete(name)
    }
  }

  private notify(name: string): void {
    for (const listener of this.listeners.get(name) ?? []) listener()
  }
}

async function bench(call = vi.fn(async () => ({ ok: true, value: { models: [], warnings: [] } }))): Promise<{ ctx: Context; slots: FakeSlots }> {
  const ctx = new Context()
  await ctx.plugin(FakeSlots).await()
  const slots = ctx.get('slots') as FakeSlots
  ctx.provide('locale', { register: () => () => undefined, bind: () => (key: string) => key })
  ctx.provide('connection', {
    isLoopback: true,
    rpc: { call },
  })
  ctx.provide('configForms', {
    get: () => ({
      getSnapshot: () => ({
        status: 'ready' as const,
        value: {
          models: [],
          defaultContextWindow: 1_000_000,
          defaultMaxTokens: 32_768,
          requestTimeoutMs: 60_000,
          streamIdleTimeoutMs: 300_000,
          zeroDataRetention: false,
          usageEnabled: true,
        },
        base: {},
        user: {},
        revision: 1,
        writable: true,
        mode: 'host' as const,
      }),
      subscribe: () => () => undefined,
      mutate: async () => true,
      set: async () => true,
      unset: async () => true,
    }),
  } as never)
  ctx.provide('webServer', { register: () => () => {} } as never)
  return { ctx, slots }
}

async function dispose(ctx: Context, fiber: { dispose(): Promise<void> }): Promise<void> {
  await fiber.dispose()
  await ctx.fiber.dispose()
}

describe('CommandCode client registration', () => {
  it('declares all client services', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection', 'configForms'])
  })

  it('registers only its keyed provider card and disposes every contribution', async () => {
    const { ctx, slots } = await bench()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(slots.entries('settings.section')).toHaveLength(0)
    const entries = slots.entries('settings.provider.item')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.options).toMatchObject({ key: 'llm-commandcode' })
    const face = entries[0]?.inject?.() as { hooks: Record<string, unknown> }
    expect(Object.keys(face.hooks)).toEqual(['commandCodeSettings'])
    expect(slots.entries('shell.overlay').map(entry => entry.options.id)).toEqual(['commandcode-model-picker'])
    // The missing-owner warning is deferred: nothing is reported while the grace window is open.
    expect(warning).not.toHaveBeenCalled()
    await dispose(ctx, fiber)
    expect(slots.entries('settings.provider.item')).toHaveLength(0)
    expect(slots.entries('settings.section')).toHaveLength(0)
    expect(slots.entries('shell.overlay')).toHaveLength(0)
    warning.mockRestore()
  })

  it('observes the public slot subscription when the owner appears later', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const { ctx, slots } = await bench()
      const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const fiber = ctx.plugin({ inject: [...inject], apply })
      await fiber.await()
      expect(warning).not.toHaveBeenCalled()
      const ownerDispose = slots.register({
        name: 'settings.section',
        id: 'providers',
        children: { 'settings.provider.item': { kind: 'keyed', scope: 'root' } },
      }, {})
      expect(slots.entries('settings.provider.item')).toHaveLength(1)
      // The owner registered inside the grace window, so the deferred check is cancelled for good.
      await vi.advanceTimersByTimeAsync(15_000)
      expect(warning).not.toHaveBeenCalled()
      await dispose(ctx, fiber)
      ownerDispose()
      await vi.advanceTimersByTimeAsync(15_000)
      expect(warning).not.toHaveBeenCalled()
      warning.mockRestore()
    } finally {
      vi.useRealTimers()
    }
  })

  it('warns once after the grace window when no owner registers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const { ctx } = await bench()
      const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const fiber = ctx.plugin({ inject: [...inject], apply })
      await fiber.await()
      // 15_000 ms is MISSING_OWNER_GRACE_MS in src/client/index.ts, which stays module-private.
      await vi.advanceTimersByTimeAsync(14_999)
      expect(warning).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      expect(warning).toHaveBeenCalledTimes(1)
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('install dsh-llm-providers-ui'))
      await vi.advanceTimersByTimeAsync(60_000)
      expect(warning).toHaveBeenCalledTimes(1)
      await dispose(ctx, fiber)
      warning.mockRestore()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the keyed card independent of owner registration order', async () => {
    const first = await bench()
    const ownerFirst = first.slots.register({
      name: 'settings.section',
      id: 'providers',
      children: { 'settings.provider.item': { kind: 'keyed', scope: 'root' } },
    }, {})
    const firstFiber = first.ctx.plugin({ inject: [...inject], apply })
    await firstFiber.await()
    expect(first.slots.entries('settings.provider.item')).toHaveLength(1)
    await dispose(first.ctx, firstFiber)
    ownerFirst()

    const second = await bench()
    const secondFiber = second.ctx.plugin({ inject: [...inject], apply })
    await secondFiber.await()
    expect(second.slots.entries('settings.provider.item')).toHaveLength(1)
    const ownerLater = second.slots.register({
      name: 'settings.section',
      id: 'providers',
      children: { 'settings.provider.item': { kind: 'keyed', scope: 'root' } },
    }, {})
    expect(second.slots.entries('settings.section')).toHaveLength(1)
    await dispose(second.ctx, secondFiber)
    ownerLater()
  })

  it('purges persisted quota when the API key is stored without a provider directory', async () => {
    rememberHeadlineQuota('llm-commandcode', 'CommandCode', { label: 'W', remainingPercent: 70 })
    const { ctx, slots } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const face = slots.entries('settings.provider.item')[0]?.inject?.() as { storeApiKey: (value: string) => Promise<unknown> }
    await face.storeApiKey('new-key')
    expect(peekCachedUsage('llm-commandcode')).toBeUndefined()
    clearProviderUsageCache()
    await dispose(ctx, fiber)
  })

  it('shows an unconnected account without a legacy settings namespace', async () => {
    const call = vi.fn(async (_channel: string, _method: string, request: { endpoint?: string }) =>
      request.endpoint === COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT
        ? { ok: true, value: { configured: false, writable: true } }
        : { ok: false, error: { message: 'Command Code settings are unavailable' } })
    const { ctx } = await bench(call)
    let entry: { account(): { state: string } } | undefined
    ctx.provide('providerDirectory', {
      register: (next: typeof entry) => { entry = next; return () => undefined },
      update: vi.fn(),
      invalidateUsage: vi.fn(),
    } as never)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    await vi.waitFor(() => { expect(entry?.account().state).toBe('unconnected') })
    await dispose(ctx, fiber)
  })

  it('keeps a saved account when an older credential read finishes later', async () => {
    let resolveRead: (value: unknown) => void
    const olderRead = new Promise<unknown>(resolve => { resolveRead = resolve })
    const call = vi.fn((_channel: string, _method: string, request: { endpoint?: string }) => {
      if (request.endpoint === COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT) return olderRead
      if (request.endpoint === COMMANDCODE_CREDENTIAL_SET_ENDPOINT) {
        return Promise.resolve({ ok: true, value: { configured: true } })
      }
      return Promise.resolve({ ok: true, value: { models: [], warnings: [] } })
    })
    const { ctx, slots } = await bench(call)
    let entry: { account(): { state: string } } | undefined
    ctx.provide('providerDirectory', {
      register: (next: typeof entry) => { entry = next; return () => undefined },
      update: vi.fn(),
      invalidateUsage: vi.fn(),
    } as never)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    await vi.waitFor(() => {
      expect(call).toHaveBeenCalledWith('/api', COMMANDCODE_RPC_METHOD, { endpoint: COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT, payload: {} }, undefined)
    })
    const face = slots.entries('settings.provider.item')[0]?.inject?.() as {
      storeApiKey(value: string): Promise<void>
    }
    await face.storeApiKey('new-key')
    expect(entry?.account().state).toBe('configured')
    resolveRead({ ok: true, value: { configured: false, writable: true } })
    await vi.waitFor(() => { expect(entry?.account().state).toBe('configured') })
    await dispose(ctx, fiber)
  })
})
