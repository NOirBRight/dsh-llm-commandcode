// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandCodeSettingsCard } from '../src/client/CommandCodeSettingsCard.tsx'
import { en } from '../src/client/locales.ts'
import type { CommandCodeSettingsView } from '../src/client-contract.ts'
import type { CommandCodeSettingsCardProps } from '../src/client/CommandCodeSettingsCard.tsx'
import { ModelCatalogFields, catalogStyles } from '../src/client/model-catalog-ui.tsx'

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
    fetchUsage: vi.fn(async () => ({ status: 'ok' as const, usage: { fetchedAt: '2026-08-26T00:00:00.000Z', failures: [] } })),
    ...overrides,
  }
  return face as unknown as CommandCodeSettingsCardProps
}

describe('plugin-card layout (opencode baseline)', () => {
  it('renders Context first row (36h full width) then Vision/Thinking/Default second row', async () => {
    const { container } = render(<CommandCodeSettingsCard {...props()} />)
    fireEvent.click(screen.getByRole('button', { name: /Expand: Command Code/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Model catalog' }))
    fireEvent.click(screen.getByRole('button', { name: /Model details/ }))

    const contextInput = screen.getByLabelText('Context window') as HTMLInputElement
    const visionBox = screen.getByLabelText('Vision') as HTMLInputElement
    const reasoningBox = screen.getByLabelText('Reasoning') as HTMLInputElement
    const defaultThinking = screen.getByLabelText('Default thinking') as HTMLSelectElement

    // DOM order: Context before Vision, Vision before Reasoning, Reasoning before Default
    const pos = (a: Element, b: Element) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    expect(pos(contextInput, visionBox)).toBe(-1)
    expect(pos(visionBox, reasoningBox)).toBe(-1)
    expect(pos(reasoningBox, defaultThinking)).toBe(-1)

    // Context first row is full width 36h via shared inputStyle token
    expect(catalogStyles.inputStyle.minHeight).toBe(36)
    // The rendered Context input uses the 36h token
    expect(contextInput.style.minHeight || getComputedStyle(contextInput).minHeight).toContain('36')
    // Its wrapper spans full width (gridColumn 1 / -1)
    const contextLabel = contextInput.closest('label') as HTMLElement
    expect(contextLabel.style.gridColumn).toBe('1 / -1')

    // Second row contains Vision/Thinking/Default in order and uses flex wrap
    expect(catalogStyles.capabilitiesStyle.display).toBe('flex')
    const capabilitiesRow = visionBox.closest('div') as HTMLElement
    // capabilities container should follow the Context row
    const contextRow = contextLabel.closest('div') as HTMLElement
    expect(pos(contextRow, capabilitiesRow)).toBe(-1)

    // Default thinking select is 32px via shared selectStyle token
    expect(catalogStyles.selectStyle.minHeight).toBe(32)
    expect(defaultThinking.style.minHeight || getComputedStyle(defaultThinking).minHeight).toContain('32')
    // custom arrow on select
    expect(String(catalogStyles.selectStyle.backgroundImage)).toContain('data:image/svg+xml')
    expect(String(catalogStyles.selectStyle.backgroundImage)).toContain('M4 6l4 4 4-4')
    expect(defaultThinking.style.backgroundImage).toContain('data:image/svg+xml')
    expect(defaultThinking.style.appearance).toBe('none')
    expect(container.innerHTML).toContain('Context window')
  })

  it('select token is 32px and catalog uses shared tokens', () => {
    expect(catalogStyles.selectStyle.minHeight).toBe(32)
    expect(catalogStyles.inputStyle.minHeight).toBe(36)
    expect(catalogStyles.rowInputStyle.minHeight).toBe(32)
    // flex column gap10, grid 2cols, flex wrap gap14, custom arrow preserved in tokens
    expect(catalogStyles.modelDetailStyle.display).toBe('flex')
    expect(catalogStyles.modelDetailStyle.flexDirection).toBe('column')
    expect(catalogStyles.modelDetailStyle.gap).toBe(10)
    expect(catalogStyles.rowStyle.display).toBe('grid')
    expect(catalogStyles.rowStyle.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
    expect(catalogStyles.rowStyle.gap).toBe(10)
    expect(catalogStyles.capabilitiesStyle.display).toBe('flex')
    expect(catalogStyles.capabilitiesStyle.flexWrap).toBe('wrap')
    expect(catalogStyles.capabilitiesStyle.gap).toBe(14)
    expect(String(catalogStyles.selectStyle.backgroundImage)).toContain('data:image/svg+xml')
    expect(catalogStyles.selectStyle.appearance).toBe('none')
    expect(catalogStyles.selectStyle.backgroundPosition).toBe('right 8px center')
  })

  it('preserves cursor-specific fields thinking, vision, defaultEffort', async () => {
    const customSettings: CommandCodeSettingsView = {
      ...settings,
      models: [{ id: 'gpt-5.6-luna', contextWindow: 1_000_000, thinking: false, inputModalities: ['text', 'image'], defaultEffort: 'high' }],
    }
    render(<CommandCodeSettingsCard {...props({}, customSettings)} />)
    fireEvent.click(screen.getByRole('button', { name: /Expand: Command Code/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Model catalog' }))
    fireEvent.click(screen.getByRole('button', { name: /Model details/ }))
    // vision checked, thinking unchecked forces defaultEffort hidden
    expect((screen.getByLabelText('Vision') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Reasoning') as HTMLInputElement).checked).toBe(false)
    expect(screen.queryByLabelText('Default thinking')).toBeNull()
  })

  it('asserts 32px select, arrow, and conditional display for Default thinking', async () => {
    render(<CommandCodeSettingsCard {...props()} />)
    fireEvent.click(screen.getByRole('button', { name: /Expand: Command Code/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Model catalog' }))
    fireEvent.click(screen.getByRole('button', { name: /Model details/ }))
    const reasoning = screen.getByLabelText('Reasoning') as HTMLInputElement
    const select = screen.getByLabelText('Default thinking') as HTMLSelectElement
    expect(select.style.minHeight).toBe('32px')
    expect(select.style.backgroundImage).toContain('data:image/svg+xml')
    expect(select.style.appearance).toBe('none')
    // conditional: uncheck hides select
    fireEvent.click(reasoning)
    expect(screen.queryByLabelText('Default thinking')).toBeNull()
    // re-check shows select again with same 32px+arrow
    fireEvent.click(reasoning)
    const restored = screen.getByLabelText('Default thinking') as HTMLSelectElement
    expect(restored.style.minHeight).toBe('32px')
    expect(restored.style.backgroundImage).toContain('data:image/svg+xml')
  })

  it('ModelCatalogFields isolates order Vision->Thinking->Default thinking and conditional', () => {
    const { rerender } = render(
      <ModelCatalogFields
        contextWindow="128000"
        contextLabel={en.contextWindow}
        contextPlaceholder={en.useProviderContext}
        onContextWindowChange={() => {}}
        visionChecked={false}
        visionLabel={en.vision}
        onVisionChange={() => {}}
        thinkingChecked={true}
        thinkingLabel={en.reasoning}
        onThinkingChange={() => {}}
        defaultThinkingLabel={en.defaultThinking}
        defaultThinkingValue="high"
        defaultThinkingOptions={["low", "medium", "high", "xhigh", "max"]}
        showDefaultThinking={true}
      />
    )
    const context = screen.getByLabelText(en.contextWindow) as HTMLInputElement
    const vision = screen.getByLabelText(en.vision) as HTMLInputElement
    const reasoning = screen.getByLabelText(en.reasoning) as HTMLInputElement
    const select = screen.getByLabelText(en.defaultThinking) as HTMLSelectElement
    const pos = (a: Element, b: Element) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    expect(pos(context, vision)).toBe(-1)
    expect(pos(vision, reasoning)).toBe(-1)
    expect(pos(reasoning, select)).toBe(-1)
    expect(select.style.minHeight).toBe('32px')
    expect(select.style.backgroundImage).toContain('data:image/svg+xml')
    // hide when thinking disabled
    rerender(
      <ModelCatalogFields
        contextWindow="128000"
        contextLabel={en.contextWindow}
        onContextWindowChange={() => {}}
        visionChecked={false}
        visionLabel={en.vision}
        onVisionChange={() => {}}
        thinkingChecked={false}
        thinkingLabel={en.reasoning}
        onThinkingChange={() => {}}
        defaultThinkingLabel={en.defaultThinking}
        defaultThinkingOptions={["low", "high"]}
        showDefaultThinking={false}
      />
    )
    expect(screen.queryByLabelText(en.defaultThinking)).toBeNull()
  })
})
