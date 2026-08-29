/** Command Code provider card using the shared DSH provider layout. */

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { SettingsScope } from './shim.js'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  CommandCodeDiscoveryRequest,
  CommandCodeDiscoveryResult,
  CommandCodeSaveResult,
  CommandCodeSettingsView,
} from '../client-contract.ts'
import { PUBLIC_PROVIDER_BASE_URL } from '../client-contract.ts'
import type { CommandCodeModelConfig, CommandCodeUsageRead, CommandCodeUsageView } from '../types.ts'
import type { CommandCodeSettingsKey } from './locales.ts'
import './provider-section.ts'
import { BrandMark } from './BrandMark.tsx'
import { ProviderCardHeader, UsageHeader, UsageResetAt, UsageSkeleton, UsageUpdatedAt, formatProviderSummary, providerHeaderStyle } from './provider-chrome.tsx'
import { SortableList } from './SortableList.tsx'
import { EFFORT_LABELS, defaultEffortForCommandCodeModel, effortsForCommandCodeModel } from '../reasoning-catalog.ts'
import {
  ModelCatalogFields,
  fieldStyle,
  inputStyle,
  labelStyle,
  modelContentStyle,
  rowInputStyle,
  rowStyle,
} from './model-catalog-ui.tsx'

export interface CommandCodeCredentialState {
  configured: boolean
  writable: boolean
}

export interface CommandCodeCardFace {
  t: (key: CommandCodeSettingsKey) => string
  hooks: { commandCodeSettings: SettingsScope<CommandCodeSettingsView> }
  describeCredential: () => Promise<CommandCodeCredentialState>
  storeApiKey: (apiKey: string) => Promise<void>
  saveConfiguration: (settings: CommandCodeSettingsView) => Promise<CommandCodeSaveResult>
  discoverModels: (request: CommandCodeDiscoveryRequest) => Promise<CommandCodeDiscoveryResult>
  fetchUsage: () => Promise<CommandCodeUsageRead>
  beginModelPicker: (initiallyPicked: ReadonlySet<string>, onAdopt: (models: readonly CommandCodeModelConfig[]) => void) => void
  completeModelPicker: (candidates: readonly CommandCodeModelConfig[]) => void
  failModelPicker: (message: string) => void
  closeModelPicker: () => void
}

export type CommandCodeSettingsCardProps = PropsRuntime<'settings.provider.item'> & InjectFace<CommandCodeCardFace>

interface ModelDraft {
  rowId: string
  id: string
  name?: string
  description?: string
  contextWindow: string
  contextWindowOverride?: string
  maxTokens?: string
  defaultEffort?: string
  vision?: boolean
  thinking?: boolean
}

interface Draft {
  zeroDataRetention: boolean
  models: ModelDraft[]
}

type UsageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; usage: CommandCodeUsageView }
  | { status: 'unsupported' }
  | { status: 'error'; message: string }

type ModelPatch = { [K in keyof ModelDraft]?: ModelDraft[K] | undefined }

const cardStyle: CSSProperties = {
  overflow: 'hidden', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 10,
  background: 'var(--dsw-alias-bg-module-platform)',
}
const bodyStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 18, borderTop: '1px solid var(--dsw-alias-border-l2)', padding: '16px 14px 18px',
}
const sectionStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: 14, lineHeight: '20px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' }
const hintStyle: CSSProperties = { margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' }
const actionsStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }
const buttonStyle: CSSProperties = {
  minHeight: 34, border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 18, padding: '6px 14px',
  background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', cursor: 'pointer',
}
const primaryButtonStyle: CSSProperties = { ...buttonStyle, borderColor: 'var(--dsw-alias-button-primary-fill)', background: 'var(--dsw-alias-button-primary-fill)', color: 'var(--dsw-alias-label-primary-foreground)' }
const iconButtonStyle: CSSProperties = {
  boxSizing: 'border-box', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  flex: 'none', border: 0, borderRadius: 6, padding: 0, background: 'transparent', color: 'var(--dsw-alias-label-tertiary)', font: 'inherit', cursor: 'pointer',
}
const disclosureStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, border: 0, padding: 0, background: 'transparent', color: 'var(--dsw-alias-label-primary)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }
const statusStyle: CSSProperties = { margin: 0, fontSize: 13, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' }
const errorStyle: CSSProperties = { ...statusStyle, color: 'var(--dsw-alias-state-error-primary)' }
const barTrackStyle: CSSProperties = { boxSizing: 'border-box', height: 14, display: 'flex', overflow: 'hidden', borderRadius: 999, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent)' }

let nextModelRow = 0
function newModelRowId(): string { nextModelRow += 1; return 'commandcode-model-row-' + String(nextModelRow) }

function modelDraftOf(model: CommandCodeModelConfig): ModelDraft {
  const efforts = effortsForCommandCodeModel(model)
  const hasEfforts = efforts.length > 0
  const vision = model.inputModalities?.includes('image') ?? false
  // Thinking persistence: explicit false stays false; otherwise derive default effort and keep thinking true when applicable.
  // Old configs without thinking keep their effort and are treated as thinking true if the model supports it.
  const thinking = model.thinking === false ? false : model.thinking === true ? true : hasEfforts ? undefined : undefined
  const defaultEffort = model.thinking === false ? undefined : defaultEffortForCommandCodeModel(model)
  return {
    rowId: newModelRowId(), id: model.id,
    ...(model.name === undefined ? {} : { name: model.name }),
    ...(model.description === undefined ? {} : { description: model.description }),
    contextWindow: model.contextWindow === undefined ? '' : String(model.contextWindow),
    ...(model.contextWindowOverride === undefined ? {} : { contextWindowOverride: String(model.contextWindowOverride) }),
    ...(model.maxTokens === undefined ? {} : { maxTokens: String(model.maxTokens) }),
    ...(defaultEffort === undefined ? {} : { defaultEffort }),
    ...(vision ? { vision: true } : {}),
    ...(thinking === undefined ? {} : { thinking }),
  }
}

function draftOf(settings: CommandCodeSettingsView): Draft {
  return { zeroDataRetention: settings.zeroDataRetention, models: settings.models.map(modelDraftOf) }
}

function integerOf(text: string): number | undefined {
  if (text.trim().length === 0) return undefined
  const value = Number(text)
  return Number.isSafeInteger(value) && value > 0 ? value : Number.NaN
}

function sameDraft(left: Draft, right: Draft): boolean { return JSON.stringify(left) === JSON.stringify(right) }

function modelSettingsOf(draft: ModelDraft): CommandCodeModelConfig {
  const contextWindow = integerOf(draft.contextWindow)
  const contextWindowOverride = draft.contextWindowOverride === undefined ? undefined : integerOf(draft.contextWindowOverride)
  const maxTokens = draft.maxTokens === undefined ? undefined : integerOf(draft.maxTokens)
  const thinking = draft.thinking
  // When thinking is explicitly disabled, clear the persisted effort (migration fix).
  const effortModel = thinking === false ? { id: draft.id.trim() } : { id: draft.id.trim(), ...(draft.defaultEffort === undefined ? {} : { defaultEffort: draft.defaultEffort }) }
  const defaultEffort = thinking === false ? undefined : defaultEffortForCommandCodeModel(effortModel)
  const vision = draft.vision === true
  const inputModalities = vision ? ['text' as const, 'image' as const] : undefined
  return {
    id: draft.id.trim(),
    ...(draft.name === undefined || draft.name.trim() === '' ? {} : { name: draft.name.trim() }),
    ...(draft.description === undefined || draft.description.trim() === '' ? {} : { description: draft.description.trim() }),
    ...(contextWindow === undefined || Number.isNaN(contextWindow) ? {} : { contextWindow }),
    ...(contextWindowOverride === undefined || Number.isNaN(contextWindowOverride) ? {} : { contextWindowOverride }),
    ...(maxTokens === undefined || Number.isNaN(maxTokens) ? {} : { maxTokens }),
    ...(thinking === undefined ? {} : { thinking }),
    ...(defaultEffort === undefined ? {} : { defaultEffort }),
    ...(inputModalities === undefined ? {} : { inputModalities }),
  }
}

function settingsOf(draft: Draft, current: CommandCodeSettingsView): CommandCodeSettingsView {
  return { ...current, zeroDataRetention: draft.zeroDataRetention, models: draft.models.map(modelSettingsOf) }
}

function modelFailure(models: readonly ModelDraft[]): boolean {
  const ids = new Set<string>()
  for (const model of models) {
    const id = model.id.trim()
    const context = integerOf(model.contextWindowOverride ?? model.contextWindow)
    if (id.length === 0 || ids.has(id) || context === undefined || Number.isNaN(context)) return true
    ids.add(id)
  }
  return false
}

function messageOf(error: unknown, fallback: string): string { return error instanceof Error && error.message.length > 0 ? error.message : fallback }
function interpolate(text: string, values: Record<string, string | number>): string { return text.replace(/\{(\w+)\}/gu, (_match, key: string) => String(values[key] ?? '')) }

function IconChevron({ open }: { open: boolean }): ReactNode {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: 'none', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease' }}><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function IconTrash(): ReactNode {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L12 4M6.5 6.8v4.4M9.5 6.8v4.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function Capability({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }): ReactNode {
  return <label style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />{label}</label>
}



function ModelDetails(props: {
  model: ModelDraft
  disabled: boolean
  t: CommandCodeSettingsCardProps['t']
  patch: (patch: ModelPatch) => void
}): ReactNode {
  const { model, disabled, t, patch } = props
  const policyModel = { id: model.id, ...(model.defaultEffort === undefined ? {} : { defaultEffort: model.defaultEffort }) }
  const efforts = effortsForCommandCodeModel(policyModel)
  const defaultEffort = defaultEffortForCommandCodeModel(policyModel)
  const hasEfforts = efforts.length > 0
  const thinkingChecked = hasEfforts ? (model.thinking ?? true) : false
  const visionChecked = model.vision ?? false
  const contextValue = model.contextWindowOverride ?? model.contextWindow ?? ''
  return (
    <ModelCatalogFields
      contextWindow={contextValue}
      contextLabel={t('contextWindow')}
      contextPlaceholder={t('useProviderContext')}
      onContextWindowChange={value => {
        if (value.trim() === '') patch({ contextWindow: '', contextWindowOverride: undefined })
        else patch({ contextWindow: value, contextWindowOverride: undefined })
      }}
      visionChecked={visionChecked}
      visionLabel={t('vision')}
      onVisionChange={value => patch({ vision: value ? true : undefined })}
      thinkingChecked={thinkingChecked}
      thinkingLabel={t('reasoning')}
      thinkingDisabled={!hasEfforts}
      onThinkingChange={value => patch({ thinking: value ? true : false, ...(value ? {} : { defaultEffort: undefined }) })}
      defaultThinkingLabel={t('defaultThinking')}
      defaultThinkingValue={defaultEffort ?? efforts[0] ?? ''}
      defaultThinkingOptions={efforts}
      onDefaultThinkingChange={value => patch({ defaultEffort: value })}
      getOptionLabel={effort => EFFORT_LABELS[effort] ?? effort}
      showDefaultThinking={hasEfforts && thinkingChecked}
      disabled={disabled}
    />
  )
}

function UsageBar({ label, window, t }: { label: string; window: { used: number; cap: number; exceeded?: boolean; resetAt?: string }; t: CommandCodeSettingsCardProps['t'] }): ReactNode {
  const percent = window.cap <= 0 ? 0 : Math.min(100, Math.max(0, window.used / window.cap * 100))
  const reset = window.resetAt === undefined ? undefined : interpolate(t('reset'), { time: new Date(window.resetAt).toLocaleString() })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}><span style={labelStyle}>{label}</span><span style={hintStyle}>{'$' + window.used.toFixed(2)} / {'$' + window.cap.toFixed(2)} · {percent.toFixed(1)}%</span></div>
      <div style={barTrackStyle} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><span style={{ width: String(percent) + '%', height: '100%', flex: 'none', background: window.exceeded === true ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-business-primary)', transition: 'width 200ms ease' }} /></div>
      <UsageResetAt label={reset} />
    </div>
  )
}

function UsageContent({ state, t }: { state: UsageState; t: CommandCodeSettingsCardProps['t'] }): ReactNode {
  if (state.status === 'idle') return <p style={hintStyle}>{t('quotaNoKey')}</p>
  if (state.status === 'loading') return <UsageSkeleton rows={2} />
  if (state.status === 'unsupported') return <p style={hintStyle}>{t('quotaUnsupported')}</p>
  if (state.status === 'error') return <p style={errorStyle}>{state.message}</p>
  const usage = state.usage
  const credits = usage.credits
  return (
    <>
      {usage.failures.length > 0 ? <p style={errorStyle}>{t('quotaFailed')} — {usage.failures.join('; ')}</p> : null}
      {usage.account !== undefined ? <p style={statusStyle}>{t('account')}: {usage.account.userName ?? usage.account.name ?? '—'}</p> : null}
      {usage.plan !== undefined ? <p style={statusStyle}>{t('plan')}: {usage.plan.name ?? usage.plan.planId ?? '—'}{usage.plan.status ? ' (' + usage.plan.status + ')' : ''}</p> : null}
      {credits !== undefined ? (
        <>
          <div style={{ ...rowStyle, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={hintStyle}>{t('monthly')}</span><strong>{credits.monthlyCredits === undefined ? '—' : '$' + credits.monthlyCredits.toFixed(2)}</strong></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={hintStyle}>{t('purchased')}</span><strong>{credits.purchasedCredits === undefined ? '—' : '$' + credits.purchasedCredits.toFixed(2)}</strong></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={hintStyle}>{t('free')}</span><strong>{credits.freeCredits === undefined ? '—' : '$' + credits.freeCredits.toFixed(2)}</strong></div>
          </div>
          {credits.fiveHour === undefined ? null : <UsageBar label={t('fiveHour')} window={credits.fiveHour} t={t} />}
          {credits.weekly === undefined ? null : <UsageBar label={t('weekly')} window={credits.weekly} t={t} />}
        </>
      ) : null}
      {usage.summary?.totalCost === undefined ? null : <p style={hintStyle}>{t('summaryCost')}: {'$' + usage.summary.totalCost.toFixed(2)} · {t('summaryTokens')}: {(usage.summary.totalTokensIn ?? 0) + (usage.summary.totalTokensOut ?? 0)}</p>}
    </>
  )
}

function mergeSelected(current: readonly ModelDraft[], selected: readonly CommandCodeModelConfig[]): ModelDraft[] {
  const existing = new Map(current.map(model => [model.id.trim(), model]))
  return selected.map(model => {
    const prior = existing.get(model.id)
    if (prior === undefined) return modelDraftOf(model)
    const discovered = modelDraftOf(model)
    return {
      ...discovered,
      rowId: prior.rowId,
      ...(prior.name === undefined ? {} : { name: prior.name }),
      ...(prior.description === undefined ? {} : { description: prior.description }),
      ...(prior.contextWindowOverride === undefined ? {} : { contextWindowOverride: prior.contextWindowOverride }),
      ...(prior.maxTokens === undefined ? {} : { maxTokens: prior.maxTokens }),
      ...(prior.defaultEffort === undefined ? {} : { defaultEffort: prior.defaultEffort }),
      ...(prior.vision === undefined ? {} : { vision: prior.vision }),
      ...(prior.thinking === undefined ? {} : { thinking: prior.thinking }),
    }
  })
}

function patchedModel(model: ModelDraft, patch: ModelPatch): ModelDraft {
  const next: Record<string, unknown> = { ...model }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key]
    else next[key] = value
    // Thinking persistence: clearing thinking disables effort.
    if (key === 'thinking' && value === false) delete (next as Record<string, unknown>).defaultEffort
  }
  return next as unknown as ModelDraft
}

/** Standard collapsible provider card. */
export function CommandCodeSettingsCard(props: CommandCodeSettingsCardProps): ReactNode {
  const { t } = props
  const snapshot = props.useCommandCodeSettings(value => value)
  const initial = useMemo(() => snapshot.value === undefined ? undefined : draftOf(snapshot.value), [snapshot.value])
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<Draft | undefined>(initial)
  const [draft, setDraft] = useState<Draft | undefined>(initial)
  const [sourceRevision, setSourceRevision] = useState<number | undefined>(snapshot.revision)
  const [apiKey, setApiKey] = useState('')
  const [credential, setCredential] = useState<CommandCodeCredentialState | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [notice, setNotice] = useState<string | undefined>(undefined)
  const [usage, setUsage] = useState<UsageState>({ status: 'idle' })
  const [usageUpdatedAt, setUsageUpdatedAt] = useState<Date | undefined>(undefined)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [expandedModels, setExpandedModels] = useState<ReadonlySet<string>>(new Set())
  const dirty = source !== undefined && draft !== undefined && (!sameDraft(source, draft) || apiKey.length > 0)

  useEffect(() => {
    if (snapshot.status !== 'ready' || snapshot.value === undefined || snapshot.revision === sourceRevision || dirty) return
    const next = draftOf(snapshot.value)
    setSource(next); setDraft(next); setSourceRevision(snapshot.revision)
  }, [dirty, snapshot.revision, snapshot.status, snapshot.value, sourceRevision])

  const refreshCredential = async (): Promise<void> => {
    try { setCredential(await props.describeCredential()) } catch { setCredential(undefined) }
  }
  useEffect(() => { if (snapshot.status === 'ready') void refreshCredential() }, [snapshot.status, snapshot.value?.apiKeyEnv])
  useEffect(() => () => { props.closeModelPicker() }, [props.closeModelPicker])

  const disabled = snapshot.status !== 'ready' || !snapshot.writable || busy
  const invalid = draft !== undefined && (modelFailure(draft.models) || (apiKey.length > 0 && apiKey.trim().length === 0))

  const patchDraft = (next: Partial<Draft>): void => { setDraft(current => current === undefined ? current : { ...current, ...next }); setFailure(undefined); setNotice(undefined) }
  const patchModel = (index: number, patch: ModelPatch): void => { patchDraft({ models: draft?.models.map((model, at) => at === index ? patchedModel(model, patch) : model) ?? [] }) }
  const removeModel = (index: number): void => { if (draft !== undefined) patchDraft({ models: draft.models.filter((_model, at) => at !== index) }) }
  const toggleModel = (id: string): void => { setExpandedModels(current => { const next = new Set(current); if (!next.delete(id)) next.add(id); return next }) }

  const loadUsage = async (): Promise<void> => {
    if (draft === undefined || snapshot.value?.usageEnabled === false || (!credential?.configured && apiKey.trim().length === 0)) return
    setUsage({ status: 'loading' })
    try {
      if (apiKey.trim().length > 0) await props.storeApiKey(apiKey.trim())
      const result = await props.fetchUsage()
      if (result.status === 'unsupported') setUsage({ status: 'unsupported' })
      else { setUsage({ status: 'ready', usage: result.usage }); setUsageUpdatedAt(new Date()) }
    } catch (error: unknown) { setUsage({ status: 'error', message: messageOf(error, t('quotaFailed')) }) }
  }
  useEffect(() => { if (open && snapshot.status === 'ready' && credential?.configured === true) void loadUsage() }, [open, snapshot.status, credential?.configured])

  const fetchModels = async (): Promise<void> => {
    if (draft === undefined) return
    const initiallyPicked = new Set(draft.models.map(model => model.id.trim()).filter(Boolean))
    setFetching(true); setFailure(undefined); setNotice(undefined)
    props.beginModelPicker(initiallyPicked, selected => {
      setDraft(current => current === undefined ? current : { ...current, models: mergeSelected(current.models, selected) })
      setCatalogOpen(true); setFailure(undefined); setNotice(undefined)
    })
    try {
      const result = await props.discoverModels({})
      if (result.models.length === 0) { const message = t('fetchEmpty'); props.failModelPicker(message); setFailure(message) }
      else props.completeModelPicker(result.models)
    } catch (error: unknown) {
      const message = messageOf(error, t('requestFailed')); props.failModelPicker(message); setFailure(message)
    } finally { setFetching(false) }
  }

  const discard = (): void => { if (source !== undefined) setDraft(structuredClone(source)); setApiKey(''); setFailure(undefined); setNotice(undefined) }
  const save = async (): Promise<void> => {
    if (draft === undefined || snapshot.value === undefined || invalid) return
    setBusy(true); setFailure(undefined); setNotice(undefined)
    try {
      if (apiKey.trim().length > 0) await props.storeApiKey(apiKey.trim())
      const accepted = await props.saveConfiguration(settingsOf(draft, snapshot.value))
      const next = draftOf(accepted.settings)
      setSource(next); setDraft(next); setSourceRevision(accepted.revision); setApiKey(''); setNotice(t('saved')); await refreshCredential(); setUsage({ status: 'idle' })
    } catch (error: unknown) { setFailure(messageOf(error, t('saveFailed'))) }
    finally { setBusy(false) }
  }

  if (snapshot.status === 'unavailable' || draft === undefined) {
    return <li style={cardStyle}><button type="button" style={providerHeaderStyle} aria-expanded={false} disabled><ProviderCardHeader title={t('title')} mark={<BrandMark />} summary={formatProviderSummary(t('notConfigured'), '0 ' + t('models'))} open={false} /></button><p style={statusStyle}>{t('remoteManagementDisabled')}</p></li>
  }

  const title = t('title')
  const summary = formatProviderSummary(credential?.configured === true ? t('configured') : t('notConfigured'), interpolate(t('modelCount'), { count: draft.models.length }))
  return (
    <li style={cardStyle}>
      <button type="button" style={providerHeaderStyle} aria-expanded={open} aria-label={(open ? t('collapse') : t('expand')) + ': ' + title} onClick={() => setOpen(current => !current)}>
        <ProviderCardHeader title={title} mark={<BrandMark />} summary={summary} open={open} unsaved={dirty} unsavedLabel={t('unsaved')} />
      </button>
      {open ? (
        <div style={bodyStyle}>
          <p style={hintStyle}>{t('description')}</p>
          {snapshot.status === 'ready' && !snapshot.writable ? <p style={statusStyle}>{t('readOnly')}</p> : null}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>{t('connection')}</h3>
            <label style={fieldStyle}><span style={labelStyle}>{t('apiKey')}</span><input style={inputStyle} type="password" aria-label={t('apiKey')} autoComplete="off" value={apiKey} placeholder={credential?.configured ? t('replaceKey') : t('apiKeyPlaceholder')} disabled={disabled || credential?.writable === false} onChange={event => { setApiKey(event.target.value); setFailure(undefined); setNotice(undefined) }} /><span style={hintStyle}>{apiKey.length > 0 ? t('pendingKey') : credential?.configured ? t('configured') : t('notConfigured')}</span></label>
            <label style={fieldStyle}><span style={labelStyle}>{t('providerURL')}</span><input style={inputStyle} type="url" aria-label={t('providerURL')} value={PUBLIC_PROVIDER_BASE_URL} disabled readOnly /><span style={hintStyle}>{t('providerURLHint')}</span></label>
            <Capability label={t('zdr')} checked={draft.zeroDataRetention} disabled={disabled} onChange={value => { patchDraft({ zeroDataRetention: value }); setNotice(undefined) }} />
            <p style={hintStyle}>{t('zdrHint')}</p>
          </section>
          <section style={sectionStyle} aria-label={t('quota')}>
            <UsageHeader title={t('quota')} spinning={usage.status === 'loading'} disabled={usage.status === 'loading' || disabled || (credential?.configured !== true && apiKey.trim().length === 0)} refreshLabel={t('quotaRefresh')} busyLabel={t('quotaLoading')} onRefresh={() => void loadUsage()} />
            <UsageContent state={usage} t={t} />
            <UsageUpdatedAt at={usage.status === 'ready' ? usageUpdatedAt : undefined} label={usage.status === 'ready' && usageUpdatedAt !== undefined ? interpolate(t('quotaUpdated'), { time: usageUpdatedAt.toLocaleTimeString() }) : ''} />
          </section>
          <section style={sectionStyle} aria-label={t('models')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <button type="button" style={disclosureStyle} aria-expanded={catalogOpen} aria-label={t('models')} onClick={() => setCatalogOpen(current => !current)}><IconChevron open={catalogOpen} /><span style={sectionTitleStyle}>{t('models')}</span><span style={hintStyle}>{draft.models.length > 0 ? t('customCatalog') : t('defaultCatalog')}</span></button>
              <button type="button" style={buttonStyle} disabled={disabled || fetching} onClick={() => void fetchModels()}>{fetching ? t('fetchingModels') : t('refreshModels')}</button>
            </div>
            {catalogOpen ? <><SortableList items={draft.models} getId={model => model.rowId} disabled={disabled} dragLabel={(model, index) => t('dragModel') + ': ' + (model.id.trim() || String(index + 1))} onReorder={models => patchDraft({ models })} renderItem={(item, index) => {
              const expanded = expandedModels.has(item.rowId)
              const modelLabel = item.id.trim() || String(index + 1)
              return <div data-model-row={modelLabel} style={modelContentStyle}>
                <input style={rowInputStyle} value={item.id} placeholder={t('modelId')} aria-label={t('modelId') + ' ' + String(index + 1)} disabled={disabled} onChange={event => patchModel(index, { id: event.target.value })} />
                <input style={rowInputStyle} value={item.name ?? ''} placeholder={t('modelName')} aria-label={t('modelName') + ' ' + String(index + 1)} disabled={disabled} onChange={event => patchModel(index, { name: event.target.value || undefined })} />
                <button type="button" style={iconButtonStyle} aria-label={t('modelDetails') + ': ' + modelLabel} aria-expanded={expanded} title={t('modelDetails')} onClick={() => toggleModel(item.rowId)}><IconChevron open={expanded} /></button>
                <button type="button" style={iconButtonStyle} aria-label={t('remove') + ' ' + modelLabel} title={t('remove')} disabled={disabled} onClick={() => removeModel(index)}><IconTrash /></button>
                {expanded ? <ModelDetails model={item} disabled={disabled} t={t} patch={patch => patchModel(index, patch)} /> : null}
              </div>
            }} />
            <button type="button" style={{ ...buttonStyle, alignSelf: 'flex-start' }} disabled={disabled} onClick={() => { const item: ModelDraft = { rowId: newModelRowId(), id: '', contextWindow: '' }; patchDraft({ models: [...draft.models, item] }); setExpandedModels(current => new Set(current).add(item.rowId)) }}>{t('addModel')}</button></> : null}
            {draft.models.length === 0 ? <p style={hintStyle}>{t('fetchModelsFirst')}</p> : null}
          </section>
          {failure !== undefined ? <p style={errorStyle}>{failure}</p> : null}
          {notice !== undefined ? <p style={statusStyle}>{notice}</p> : null}
          <div style={actionsStyle}><button type="button" style={buttonStyle} disabled={!dirty || busy || disabled} onClick={discard}>{t('discard')}</button><button type="button" style={primaryButtonStyle} disabled={!dirty || busy || disabled || invalid} onClick={() => void save()}>{busy ? t('saving') : t('save')}</button></div>
        </div>
      ) : null}
    </li>
  )
}