// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandCodeModelPicker } from '../src/client/CommandCodeModelPicker.tsx'
import type { CommandCodeModelPickerProps, CommandCodeModelPickerSnapshot } from '../src/client/CommandCodeModelPicker.tsx'
import { en } from '../src/client/locales.ts'

afterEach(() => cleanup())

describe('CommandCode model picker overlay', () => {
  it('renders model groups and exact context values', () => {
    const snapshot: CommandCodeModelPickerSnapshot = {
      open: true,
      loading: false,
      candidates: [
        { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek', contextWindow: 1000000 },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet', contextWindow: 1000000 },
        { id: 'claude-opus-5', name: 'Claude Opus', contextWindow: 1000000 },
      ],
      picked: new Set(['deepseek/deepseek-v4-flash']),
    }
    const props = {
      t: (key: keyof typeof en) => en[key],
      useCommandCodeModelPicker: (selector: (value: CommandCodeModelPickerSnapshot) => unknown) => selector(snapshot),
      closePicker: vi.fn(), togglePickerModel: vi.fn(), adoptPickerModels: vi.fn(),
    } as unknown as CommandCodeModelPickerProps
    render(<CommandCodeModelPicker {...props} />)
    expect(screen.getByText('Go · open models')).toBeTruthy()
    expect(screen.getByText('Pro · premium models')).toBeTruthy()
    expect(screen.getByText('Provider+ · frontier models')).toBeTruthy()
    expect(screen.getByText(/claude-sonnet-4-6 · 1,000,000/)).toBeTruthy()
  })
})
