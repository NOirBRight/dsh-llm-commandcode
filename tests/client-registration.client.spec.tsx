// @vitest-environment jsdom

import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'

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

async function bench(): Promise<{ ctx: Context; slots: FakeSlots }> {
  const ctx = new Context()
  await ctx.plugin(FakeSlots).await()
  const slots = ctx.get('slots') as FakeSlots
  ctx.provide('locale', { register: () => () => undefined, bind: () => (key: string) => key })
  ctx.provide('connection', {
    isLoopback: true,
    rpc: { call: vi.fn(async () => ({ ok: true, value: { models: [], warnings: [] } })) },
  })
  return { ctx, slots }
}

async function dispose(ctx: Context, fiber: { dispose(): Promise<void> }): Promise<void> {
  await fiber.dispose()
  await ctx.fiber.dispose()
}

describe('CommandCode client registration', () => {
  it('declares its three client services', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection'])
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
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('install dsh-llm-providers-ui'))
    await dispose(ctx, fiber)
    expect(slots.entries('settings.provider.item')).toHaveLength(0)
    expect(slots.entries('settings.section')).toHaveLength(0)
    expect(slots.entries('shell.overlay')).toHaveLength(0)
    warning.mockRestore()
  })

  it('observes the public slot subscription when the owner appears later', async () => {
    const { ctx, slots } = await bench()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(warning).toHaveBeenCalledTimes(1)
    const ownerDispose = slots.register({
      name: 'settings.section',
      id: 'providers',
      children: { 'settings.provider.item': { kind: 'keyed', scope: 'root' } },
    }, {})
    expect(slots.entries('settings.provider.item')).toHaveLength(1)
    expect(warning).toHaveBeenCalledTimes(1)
    await dispose(ctx, fiber)
    ownerDispose()
    expect(warning).toHaveBeenCalledTimes(1)
    warning.mockRestore()
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
})
