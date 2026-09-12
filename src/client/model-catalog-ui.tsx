/** Shared model catalog visual pattern extracted from opencode-go. */

import type { CSSProperties, ReactNode } from 'react'

const inputStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 36,
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 8,
  padding: '7px 10px',
  background: 'var(--dsw-alias-bg-layer-1)',
  color: 'var(--dsw-alias-label-primary)',
  font: 'inherit',
}

const rowInputStyle: CSSProperties = { ...inputStyle, minHeight: 32, padding: '4px 10px' }

const selectStyle: CSSProperties = {
  boxSizing: 'border-box',
  minHeight: 32,
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 8,
  padding: '4px 28px 4px 10px',
  backgroundColor: 'var(--dsw-alias-bg-layer-1)',
  color: 'var(--dsw-alias-label-primary)',
  font: 'inherit',
  appearance: 'none',
  backgroundImage:
    'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' viewBox=\'0 0 16 16\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M4 6l4 4 4-4\' stroke=\'%23666\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
}

const rowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }

const modelContentStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) auto auto',
  alignItems: 'center',
  gap: 6,
  padding: '6px 8px',
}

const modelDetailStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  borderTop: '1px solid var(--dsw-alias-border-l2)',
  padding: '10px 4px 4px',
}

const capabilitiesStyle: CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14 }

const fieldStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: CSSProperties = { fontSize: 13, color: 'var(--dsw-alias-label-secondary)' }

/** Small interface that hides the shared styles behind layout components. */
export function ModelCatalogDetails({ children }: { children: ReactNode }): ReactNode {
  return <div style={{ ...modelDetailStyle, gridColumn: '1 / -1' }}>{children}</div>
}

export function ModelCatalogRow({ children }: { children: ReactNode }): ReactNode {
  return <div style={rowStyle}>{children}</div>
}

export function ModelCatalogCapabilities({ children }: { children: ReactNode }): ReactNode {
  return <div style={capabilitiesStyle}>{children}</div>
}

export function ModelCatalogRowGrid({ children }: { children: ReactNode }): ReactNode {
  return <div style={modelContentStyle}>{children}</div>
}


export interface ModelCatalogFieldsProps {
  contextWindow: string
  contextLabel: string
  contextPlaceholder?: string
  onContextWindowChange: (value: string) => void
  visionChecked: boolean
  visionLabel: string
  onVisionChange: (value: boolean) => void
  thinkingChecked: boolean
  thinkingLabel: string
  thinkingDisabled?: boolean
  onThinkingChange: (value: boolean) => void
  defaultThinkingLabel: string
  defaultThinkingValue?: string
  defaultThinkingOptions: readonly string[]
  onDefaultThinkingChange?: (value: string) => void
  getOptionLabel?: (option: string) => string
  showDefaultThinking?: boolean
  disabled?: boolean
}

/**
 * Helper that renders the accepted model expansion visuals:
 * first row (context window) then second row (Vision, Reasoning/Thinking, Default thinking select conditional).
 * Preserves 36h for context, 32h for row/select, flex column gap10, grid 2cols, flex wrap gap14, custom arrow.
 */
export function ModelCatalogFields(props: ModelCatalogFieldsProps): ReactNode {
  const {
    contextWindow,
    contextLabel,
    contextPlaceholder,
    onContextWindowChange,
    visionChecked,
    visionLabel,
    onVisionChange,
    thinkingChecked,
    thinkingLabel,
    thinkingDisabled,
    onThinkingChange,
    defaultThinkingLabel,
    defaultThinkingValue,
    defaultThinkingOptions,
    onDefaultThinkingChange,
    getOptionLabel,
    showDefaultThinking,
    disabled,
  } = props
  return (
    <div className="c-extra-grid">
      <label className="c-field">
        <span className="c-field-label">{contextLabel}</span>
        <input className="c-input" inputMode="numeric" value={contextWindow} placeholder={contextPlaceholder} disabled={disabled} aria-label={contextLabel} onChange={event => onContextWindowChange(event.target.value)} />
      </label>
      <div className="c-extra-checks">
        <label>
          <input type="checkbox" checked={visionChecked} disabled={disabled} onChange={event => onVisionChange(event.target.checked)} />
          {visionLabel}
        </label>
        <label>
          <input type="checkbox" checked={thinkingChecked} disabled={disabled || thinkingDisabled} onChange={event => onThinkingChange(event.target.checked)} />
          {thinkingLabel}
        </label>
      </div>
      {showDefaultThinking ? (
        <label className="c-field">
          <span className="c-field-label">{defaultThinkingLabel}</span>
          <select className="c-input" value={defaultThinkingValue ?? defaultThinkingOptions[0] ?? ''} disabled={disabled} aria-label={defaultThinkingLabel} onChange={event => onDefaultThinkingChange?.(event.target.value)}>
            {defaultThinkingOptions.map(option => <option key={option} value={option}>{getOptionLabel ? getOptionLabel(option) : option}</option>)}
          </select>
        </label>
      ) : null}
    </div>
  )
}

// Re-export raw styles for cases where a component wrapper is not suitable
// but the shared visual contract must still be honored.
export const catalogStyles = {
  inputStyle,
  rowInputStyle,
  selectStyle,
  rowStyle,
  modelContentStyle,
  modelDetailStyle,
  capabilitiesStyle,
  fieldStyle,
  labelStyle,
} as const

export { inputStyle, rowInputStyle, selectStyle, rowStyle, modelContentStyle, modelDetailStyle, capabilitiesStyle, fieldStyle, labelStyle }