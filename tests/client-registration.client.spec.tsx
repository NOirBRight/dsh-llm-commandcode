// @vitest-environment jsdom

import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
interface SlotEntry { options: Record<string, unknown>; inject?: () => unknown }

class FakeSlots extends Service {
  private readonly registered: SlotEntry[] = []
  constructor(ctx: Context) { super(ctx, 'slots') }
  inject(_name: string, register: () => () => void): void { this.ctx.effect(register) }
  register(options: Record<string, unknown> & { inject?: () => unknown }, _component: unknown): () => void {
    const entry = { options, inject: options.inject }
    this.registered.push(entry)
    return () => { const index = this.registered.indexOf(entry); if (index >= 0) this.registered.splice(index, 1) }
  }
  entries(name: string): readonly SlotEntry[] { return this.registered.filter(entry => entry.options.name === name) }
}

async function bench() {
  const ctx = new Context()
  await ctx.plugin(FakeSlots).await()
  const slots = ctx.get('slots') as FakeSlots
  ctx.provide('locale', { register: () => () => undefined, bind: () => (key: string) => key } as never)
  ctx.provide('connection', {
    api: { credentials: { describe: vi.fn(async () => ({ result: { ok: true, value: { credentials: {} } } })), set: vi.fn(async () => ({ result: { ok: true, value: {} } })) } },
    rpc: { call: vi.fn(async () => ({ ok: true, value: { models: [], warnings: [] } })) },
  } as never)
  return { ctx, slots }
}

describe('CommandCode client registration', () => {
  it('declares its four client services', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection'])
  })

  it('registers and disposes the Command Code card', async () => {
    const { ctx, slots } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(slots.entries('settings.section').map(entry => entry.options.id)).toEqual(['providers'])
    const entries = slots.entries('settings.provider.item')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.options).toMatchObject({ key: 'llm-commandcode' })
    const face = entries[0]?.inject?.() as { hooks: Record<string, unknown> }
    expect(Object.keys(face.hooks)).toEqual(['commandCodeSettings'])
    expect(slots.entries('shell.overlay').map(entry => entry.options.id)).toEqual(['commandcode-model-picker'])
    await fiber.dispose()
    expect(slots.entries('settings.provider.item')).toHaveLength(0)
    expect(slots.entries('settings.section')).toHaveLength(0)
    expect(slots.entries('shell.overlay')).toHaveLength(0)
  })

  it('joins an existing provider section instead of creating a second nav row', async () => {
    const { ctx, slots } = await bench()
    const disposeExisting = slots.register({ name: 'settings.section', id: 'providers' }, {})
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(slots.entries('settings.section')).toHaveLength(1)
    expect(slots.entries('settings.provider.item')).toHaveLength(1)
    await fiber.dispose()
    disposeExisting()
  })
})
