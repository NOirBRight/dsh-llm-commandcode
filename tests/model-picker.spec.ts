import { describe, expect, it } from 'vitest'
import { CommandCodeModelPickerController } from '../src/client/CommandCodeModelPicker.tsx'

describe('Command Code model picker controller', () => {
  it('opens before discovery, preserves selection, and adopts chosen models', () => {
    const controller = new CommandCodeModelPickerController()
    let adopted: readonly { id: string }[] = []
    controller.begin(models => { adopted = models }, new Set(['existing']))
    expect(controller.getSnapshot()).toMatchObject({ open: true, loading: true })
    const candidates = [{ id: 'existing', contextWindow: 100 }, { id: 'new', contextWindow: 200 }]
    controller.complete(candidates)
    expect([...controller.getSnapshot().picked]).toEqual(['existing'])
    controller.toggle('new')
    controller.adopt()
    expect(adopted.map(model => model.id)).toEqual(['existing', 'new'])
    expect(controller.getSnapshot().open).toBe(false)
  })
})
