/** Shared LLM provider navigation chrome. */

import type { ReactNode } from 'react'

/** Canonical shared header: delete per-provider fork, re-export built artifact. */
export { ProviderCardHeader, ProviderQuotaMeter, providerUiCss } from 'dsh-llm-providers-ui/provider-ui';
export type { ProviderCardHeaderProps, ProviderQuotaMeterProps, ProviderQuotaState } from 'dsh-llm-providers-ui/provider-ui';

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

