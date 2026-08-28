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

function Capability({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean | undefined; onChange: (value: boolean) => void }): ReactNode {
  return <label style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />{label}</label>
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
    <ModelCatalogDetails>
      <ModelCatalogRow>
        <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}><span style={labelStyle}>{contextLabel}</span><input style={inputStyle} inputMode="numeric" value={contextWindow} placeholder={contextPlaceholder} disabled={disabled} aria-label={contextLabel} onChange={event => onContextWindowChange(event.target.value)} /></label>
      </ModelCatalogRow>
      <ModelCatalogCapabilities>
        <Capability label={visionLabel} checked={visionChecked} disabled={disabled} onChange={onVisionChange} />
        <Capability label={thinkingLabel} checked={thinkingChecked} disabled={disabled || thinkingDisabled} onChange={onThinkingChange} />
        {showDefaultThinking ? (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...labelStyle }}><span style={labelStyle}>{defaultThinkingLabel}</span><select style={selectStyle} value={defaultThinkingValue ?? defaultThinkingOptions[0] ?? ''} disabled={disabled} aria-label={defaultThinkingLabel} onChange={event => onDefaultThinkingChange?.(event.target.value)}>{defaultThinkingOptions.map(option => <option key={option} value={option}>{getOptionLabel ? getOptionLabel(option) : option}</option>)}</select></label>
        ) : null}
      </ModelCatalogCapabilities>
    </ModelCatalogDetails>
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