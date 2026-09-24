/** Browser face for the Command Code settings and quota card. */

import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import {
  COMMANDCODE_CREDENTIAL_SET_ENDPOINT,
  COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT,
  COMMANDCODE_DISCOVER_ENDPOINT,
  COMMANDCODE_RPC_CHANNEL,
  COMMANDCODE_RPC_METHOD,
  COMMANDCODE_VALIDATE_ENDPOINT,
  COMMANDCODE_SETTINGS_NAMESPACE,
  COMMANDCODE_USAGE_ENDPOINT,
  decodeCommandCodeDiscoveryResult,
  decodeCommandCodeSettings,
  decodeCommandCodeUsageReply,
} from '../client-contract.ts'
import type {
  CommandCodeSettingsView,
} from '../client-contract.ts'
import type { CommandCodeUsageRead } from '../types.ts'
import { CommandCodeModelPicker, CommandCodeModelPickerController } from './CommandCodeModelPicker.tsx'
import type { CommandCodeModelPickerFace } from './CommandCodeModelPicker.tsx'
import type { CommandCodeSettingsKey } from './locales.ts'


declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.commandcode': CommandCodeSettingsKey
  }
}

import type {} from 'dsh-llm-providers-ui/client';
import { createCommandCodeUsageReader, dropPersistedUsageKeys } from 'dsh-llm-providers-ui/usage-readers';
import { CommandCodeSettingsCard } from './CommandCodeSettingsCard.tsx'
import type { CommandCodeCardFace } from './CommandCodeSettingsCard.tsx'
import { en, zh } from './locales.ts'
export const name = 'dsh-llm-commandcode-client'
export const inject = ['slots', 'locale', 'connection', 'configForms']

/**
 * Grace window before the missing-owner warning fires: the LLM Providers owner registers its
 * `settings.section` entry only once the settings snapshot is ready and the page is visible, so an
 * immediate check always runs too early and reports a false alarm.
 */
const MISSING_OWNER_GRACE_MS = 15_000

/** Register the Command Code card inside the shared LLM Providers section. */

export function apply(ctx: Context): void {
  const localeNamespace = 'settings.commandcode'
  ctx.effect(() => ctx.locale.register(localeNamespace, { en, zh }), 'llm-commandcode: locale')
  const t = ctx.locale.bind(localeNamespace) as CommandCodeCardFace['t']
  const picker = new CommandCodeModelPickerController()
  const account = { state: 'unknown' as 'connected' | 'configured' | 'unconnected' | 'unknown' }
  let accountEpoch = 0
  let closed = false
  const publishAccount = (state: typeof account.state): void => {
    if (closed || account.state === state) return
    account.state = state
    try { ctx.get('providerDirectory')?.update(COMMANDCODE_SETTINGS_NAMESPACE) } catch { /* providerDirectory is optional in lab */ }
  }
  const form = ctx.configForms.get<CommandCodeSettingsView>(COMMANDCODE_SETTINGS_NAMESPACE)
  const { rpc } = ctx.get('connection') as unknown as ConnectionHandle
  const callPlugin = (endpoint: string, payload: unknown, signal?: AbortSignal) =>
    rpc.call(COMMANDCODE_RPC_CHANNEL, COMMANDCODE_RPC_METHOD, { endpoint, payload }, signal)
  const commandCodeUsageReader = createCommandCodeUsageReader()
  const describeCredential: CommandCodeCardFace['describeCredential'] = async () => {
    const epoch = accountEpoch
    const result = await callPlugin(COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT, {})
    if (!result.ok) throw new Error(result.error.message)
    const value = result.value as { configured?: unknown; writable?: unknown }
    if (typeof value.configured !== 'boolean' || typeof value.writable !== 'boolean') throw new Error(t('requestFailed'))
    if (epoch === accountEpoch) publishAccount(value.configured ? 'configured' : 'unconnected')
    return { configured: value.configured, writable: value.writable }
  }
  const storeApiKey: CommandCodeCardFace['storeApiKey'] = async value => {
    const result = await callPlugin(COMMANDCODE_CREDENTIAL_SET_ENDPOINT, { apiKey: value })
    if (!result.ok) throw new Error(result.error.message)
    dropPersistedUsageKeys([COMMANDCODE_SETTINGS_NAMESPACE])
    ctx.get('providerDirectory')?.invalidateUsage(COMMANDCODE_SETTINGS_NAMESPACE)
    const status = result.value as { configured?: unknown }
    if (typeof status.configured === 'boolean') {
      accountEpoch += 1
      publishAccount(status.configured ? 'configured' : 'unconnected')
    }
  }
  const saveConfiguration: CommandCodeCardFace['saveConfiguration'] = async settings => {
    const current = form.getSnapshot()
    if (current.status !== 'ready' || current.value === undefined || current.revision === undefined || !current.writable) throw new Error(t('saveFailed'))
    const before = decodeCommandCodeSettings(current.value)
    if (before === undefined) throw new Error(t('saveFailed'))
    const ops: SettingsPathOpView[] = []
    for (const field of ['models', 'defaultContextWindow', 'defaultMaxTokens', 'requestTimeoutMs', 'streamIdleTimeoutMs', 'zeroDataRetention', 'usageEnabled'] as const) {
      if (field === 'models' ? JSON.stringify(before.models) === JSON.stringify(settings.models) : before[field] === settings[field]) continue
      ops.push({ op: 'set', path: [field], value: field === 'models' ? JSON.parse(JSON.stringify(settings.models)) as JsonValue : settings[field] })
    }
    if (ops.length === 0) return { settings: before, revision: current.revision }
    const result = await callPlugin(COMMANDCODE_VALIDATE_ENDPOINT, { settings })
    if (!result.ok) throw new Error(result.error.message)
    const accepted = await form.mutate(ops, current.revision)
    if (!accepted) throw new Error(t('saveFailed'))
    const saved = form.getSnapshot()
    const value = decodeCommandCodeSettings(saved.value)
    if (value === undefined || saved.revision === undefined) throw new Error(t('saveFailed'))
    return { settings: value, revision: saved.revision }
  }
  const discover: CommandCodeCardFace['discoverModels'] = async request => {
    const result = await callPlugin(COMMANDCODE_DISCOVER_ENDPOINT, {}, request.signal)
    if (!result.ok) throw new Error(result.error.message)
    const decoded = decodeCommandCodeDiscoveryResult(result.value)
    if (decoded === undefined) throw new Error(t('discoveryEmpty'))
    return decoded
  }
  const fetchUsage: CommandCodeCardFace['fetchUsage'] = async () => {
    const result = await callPlugin(COMMANDCODE_USAGE_ENDPOINT, {})
    if (!result.ok) {
      // Host answers a missing/unusable key as INVALID_CREDENTIAL; purge every
      // bundle copy so the collapsed header cannot keep the previous account.
      if (result.error.code === 'INVALID_CREDENTIAL') dropPersistedUsageKeys([COMMANDCODE_SETTINGS_NAMESPACE])
      throw new Error(result.error.message)
    }
    const decoded = decodeCommandCodeUsageReply(result.value)
    if (decoded === undefined) throw new Error(t('quotaFailed'))
    if (decoded.status === 'unsupported') return { status: 'unsupported' }
    return { status: 'ok', usage: decoded.usage } as CommandCodeUsageRead
  }
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'commandcode-model-picker',
    order: 100,
    inject: (): CommandCodeModelPickerFace => ({
      t,
      hooks: { commandCodeModelPicker: picker },
      closePicker: picker.close,
      togglePickerModel: picker.toggle,
      adoptPickerModels: picker.adopt,
    }),
  }, CommandCodeModelPicker))

  ctx.slots.inject('settings.provider.item', () => ctx.slots.register({
    name: 'settings.provider.item',
    key: COMMANDCODE_SETTINGS_NAMESPACE,
    locale: localeNamespace,
    inject: (): CommandCodeCardFace => ({
      t,
      hooks: { commandCodeSettings: form },
      describeCredential,
      storeApiKey,
      saveConfiguration,
      discoverModels: discover,
      fetchUsage,
      beginModelPicker: (initiallyPicked, onAdopt) => { picker.begin(onAdopt, initiallyPicked) },
      completeModelPicker: candidates => { picker.complete(candidates) },
      failModelPicker: message => { picker.fail(message) },
      closeModelPicker: picker.close,
    }),
  }, CommandCodeSettingsCard))
  ctx.inject(['providerDirectory'], providerCtx => {
    providerCtx.effect(
      () => {
        const declaration = Object.assign({
          key: COMMANDCODE_SETTINGS_NAMESPACE,
          name: 'CommandCode',
          role: 'llm' as const,
          header: 'shared' as const,
          detail: 'shared' as const,
          usage: commandCodeUsageReader,
          modelCount: () => form.getSnapshot().value?.models?.length,
        }, {
          catalogId: 'commandcode',
          account: () => ({ state: account.state }),
        })
        return providerCtx.providerDirectory.register(declaration as Parameters<typeof providerCtx.providerDirectory.register>[0])
      },
      'dsh-llm-commandcode: provider directory',
    )
  })
  ctx.effect(() => {
    void describeCredential().catch(() => { publishAccount('unknown') })
    return () => { closed = true }
  }, 'dsh-llm-commandcode: account snapshot')
  ctx.effect(() => {
    let warned = false
    const hasProvidersSection = (): boolean =>
      ctx.slots.entries('settings.section').some(entry => entry.options.id === 'providers')
    const check = (): void => {
      if (hasProvidersSection() || warned) return
      warned = true
      console.warn(`[dsh-llm-providers-ui] LLM Providers page missing for card ${COMMANDCODE_SETTINGS_NAMESPACE}: install dsh-llm-providers-ui to show the card. Host route remains active.`)
    }
    // The owner registers the providers section only after the settings snapshot
    // arrives and the page becomes visible, so an immediate check always runs
    // ahead of it: grant a grace period and cancel the warning on registration.
    const timer = setTimeout(check, MISSING_OWNER_GRACE_MS)
    const stop = ctx.slots.subscribe('settings.section', () => {
      if (!hasProvidersSection()) return
      clearTimeout(timer)
      warned = true
    })
    return () => {
      clearTimeout(timer)
      stop()
    }
  }, 'dsh-llm-providers-ui: missing owner diagnostic')
}

export type { CommandCodeSettingsKey }
export type { CommandCodeCardFace }
