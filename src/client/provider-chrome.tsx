/** Shared LLM provider navigation chrome. */

import type { CSSProperties, ReactNode } from 'react'

const LABELS = new Set(['LLM 供应商', 'LLM Providers', '供应商', 'Providers'])
const MARK = 'data-dsh-providers-icon'
const GLOBE_PATH = 'M7 0.35a6.65 6.65 0 1 0 0 13.3A6.65 6.65 0 0 0 7 .35Zm0 1.2c.65 0 1.75 1.94 1.75 5.45S7.65 12.45 7 12.45 5.25 10.51 5.25 7 6.35 1.55 7 1.55ZM1.58 6.4h10.84v1.2H1.58V6.4Z'

function patchNav(): void {
  if (typeof document === 'undefined') return
  for (const button of document.querySelectorAll('nav button')) {
    const label = [...button.querySelectorAll('span')].find(span => LABELS.has(span.textContent?.trim() ?? ''))
    if (label === undefined) continue
    const svg = button.querySelector('svg')
    if (svg === null || svg.getAttribute(MARK) === 'globe') continue
    svg.setAttribute(MARK, 'globe')
    svg.setAttribute('viewBox', '0 0 14 14')
    svg.setAttribute('fill', 'none')
    svg.innerHTML = '<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="' + GLOBE_PATH + '"/>'
  }
}

/** Install the provider globe icon and remove the observer on teardown. */
export function installProvidersNavIcon(): () => void {
  if (typeof document === 'undefined' || document.body === null) return () => {}
  let frame = 0
  let scheduled = false
  const flush = (): void => {
    frame = 0
    scheduled = false
    patchNav()
  }
  const observer = new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    frame = requestAnimationFrame(flush)
  })
  observer.observe(document.body, { childList: true, subtree: true })
  patchNav()
  return () => {
    observer.disconnect()
    if (frame !== 0) cancelAnimationFrame(frame)
    frame = 0
    scheduled = false
  }
}

export const providerHeaderStyle: CSSProperties = {
  boxSizing: 'border-box', width: '100%', minHeight: 68, display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', gap: 16, border: 0, padding: '12px 14px', background: 'transparent',
  color: 'var(--dsw-alias-label-primary)', font: 'inherit', textAlign: 'left', cursor: 'pointer',
}

/** Join account state and model count in the standard provider header. */
export function formatProviderSummary(status: string, modelsLabel: string): string {
  return status.replace(/[。.]$/u, '') + ' · ' + modelsLabel
}

/** Standard provider card header used by the shared LLM Providers page. */
export function ProviderCardHeader(props: {
  title: string
  mark: ReactNode
  summary: string
  open: boolean
  unsaved?: boolean
  unsavedLabel?: string
}): ReactNode {
  return (
    <>
      <span style={{ display: 'flex', minWidth: 0, flex: 1, flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, lineHeight: 1 }}>
          <span style={{ width: 18, height: 18, flex: 'none', display: 'block' }}>{props.mark}</span>
          <span style={{ lineHeight: '20px' }}>{props.title}</span>
        </span>
        <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {props.summary}
          {props.unsaved === true ? <span style={{ color: 'var(--dsw-alias-state-warning-primary)' }}> · {props.unsavedLabel ?? 'Unsaved'}</span> : null}
        </span>
      </span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: 'none', transform: props.open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease', color: 'var(--dsw-alias-label-tertiary)' }}>
        <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  )
}

/** Standard compact usage reset caption. */
export function UsageResetAt(props: { label: string | undefined }): ReactNode {
  return props.label === undefined || props.label.length === 0
    ? null
    : <p style={{ margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' }}>{props.label}</p>
}

/** Standard last-updated caption. */
export function UsageUpdatedAt(props: { at: Date | undefined; label: string }): ReactNode {
  return props.at === undefined
    ? null
    : <p style={{ margin: 0, textAlign: 'right', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' }}>{props.label}</p>
}

/** Standard usage section heading and refresh action. */
export function UsageHeader(props: {
  title: ReactNode
  spinning: boolean
  disabled?: boolean
  refreshLabel: string
  busyLabel: string
  onRefresh: () => void
  error?: string
}): ReactNode {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: '20px' }}>{props.title}</h3>
      <button type="button" disabled={props.disabled === true} aria-label={props.spinning ? props.busyLabel : props.refreshLabel} onClick={props.onRefresh} style={{ minHeight: 28, border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 14, padding: '3px 10px', background: 'transparent', color: 'var(--dsw-alias-label-primary)', cursor: props.disabled === true ? 'default' : 'pointer', font: 'inherit', fontSize: 12 }}>
        {props.spinning ? props.busyLabel : props.refreshLabel}
      </button>
    </div>
  )
}

/** Standard loading bars for provider usage. */
export function UsageSkeleton(props: { rows?: number }): ReactNode {
  const rows = props.rows ?? 2
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ display: 'block', width: index === 0 ? 110 : 82, height: 12, borderRadius: 4, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent)' }} />
          <span style={{ display: 'block', width: '100%', height: 14, borderRadius: 999, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent)' }} />
        </div>
      ))}
    </div>
  )
}

