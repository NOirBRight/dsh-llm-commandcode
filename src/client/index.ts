/** Browser face for the Command Code settings and quota card. */

import type { ClientContext, SettingsScope, SettingsScopeSnapshot } from './shim.js'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import {
  COMMANDCODE_CREDENTIAL_SET_ENDPOINT,
  COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT,
  COMMANDCODE_SETTINGS_READ_ENDPOINT,
  COMMANDCODE_DISCOVER_ENDPOINT,
  COMMANDCODE_RPC_CHANNEL,
  COMMANDCODE_SAVE_ENDPOINT,
  COMMANDCODE_SETTINGS_NAMESPACE,
  COMMANDCODE_USAGE_ENDPOINT,
  decodeCommandCodeDiscoveryResult,
  decodeCommandCodeSaveResult,
  decodeCommandCodeSettingsReadResult,
  decodeCommandCodeUsageReply,
} from '../client-contract.ts'
import type {
  CommandCodeDiscoveryRequest,
  CommandCodeSettingsView,
} from '../client-contract.ts'
import type { CommandCodeUsageRead } from '../types.ts'
import { ensureProviderSection } from 'dsh-llm-providers-ui/client'
import { CommandCodeModelPicker, CommandCodeModelPickerController } from './CommandCodeModelPicker.tsx'
import type { CommandCodeModelPickerFace } from './CommandCodeModelPicker.tsx'
import type { CommandCodeSettingsKey } from './locales.ts'


declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'settings.provider.item': { kind: 'keyed'; scope: 'root' }
  }
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.commandcode': CommandCodeSettingsKey
  }
}

import { CommandCodeSettingsCard } from './CommandCodeSettingsCard.tsx'
import type { CommandCodeCardFace } from './CommandCodeSettingsCard.tsx'
import { en, zh } from './locales.ts'
export const name = 'dsh-llm-commandcode-client'
export const inject = ['slots', 'locale', 'connection']

/** Register the Command Code card inside the shared LLM Providers section. */

export function apply(ctx: ClientContext): void {
  const localeNamespace = 'settings.commandcode'
  ctx.effect(() => ctx.locale.register(localeNamespace, { en, zh }), 'llm-commandcode: locale')
  const t = ctx.locale.bind(localeNamespace) as CommandCodeCardFace['t']
  const picker = new CommandCodeModelPickerController()
  let snapshot: SettingsScopeSnapshot<CommandCodeSettingsView> = { status: 'loading', value: undefined, base: undefined, user: undefined, revision: undefined, writable: false, mode: 'memory' }
  const listeners = new Set<() => void>()
  const scope: SettingsScope<CommandCodeSettingsView> = { getSnapshot: () => snapshot, subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, set: async () => undefined, unset: async () => undefined }
  const updateSnapshot = (next: SettingsScopeSnapshot<CommandCodeSettingsView>): void => { snapshot = next; listeners.forEach(listener => { listener() }) }
  const { rpc } = ctx.get('connection') as unknown as ConnectionHandle
  const callPlugin = async (endpoint: string, payload: unknown) => rpc.call(COMMANDCODE_RPC_CHANNEL, endpoint, payload)
  const readManagement = async (): Promise<void> => {
    const result = await callPlugin(COMMANDCODE_SETTINGS_READ_ENDPOINT, {})
    if (!result.ok) { updateSnapshot({ ...snapshot, status: 'unavailable' }); return }
    const decoded = decodeCommandCodeSettingsReadResult(result.value)
    if (decoded === undefined) { updateSnapshot({ ...snapshot, status: 'unavailable' }); return }
    updateSnapshot({ status: 'ready', value: decoded.settings, base: decoded.settings, user: decoded.settings, revision: decoded.revision, writable: decoded.credential.writable, mode: 'host' })
  }
  void readManagement()
  const describeCredential: CommandCodeCardFace['describeCredential'] = async () => {
    const result = await callPlugin(COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT, {})
    if (!result.ok) throw new Error(result.error.message)
    const value = result.value as { configured?: unknown; writable?: unknown }
    if (typeof value.configured !== 'boolean' || typeof value.writable !== 'boolean') throw new Error(t('requestFailed'))
    return { configured: value.configured, writable: value.writable }
  }
  const storeApiKey: CommandCodeCardFace['storeApiKey'] = async (value) => {
    const result = await callPlugin(COMMANDCODE_CREDENTIAL_SET_ENDPOINT, { apiKey: value })
    if (!result.ok) throw new Error(result.error.message)
  }
  const saveConfiguration: CommandCodeCardFace['saveConfiguration'] = async (settings) => {
    const current = scope.getSnapshot()
    if (current.revision === undefined) throw new Error(t('saveFailed'))
    const { apiKeyEnv: _apiKeyEnv, ...withoutKey } = settings
    const result = await callPlugin(COMMANDCODE_SAVE_ENDPOINT, { settings: withoutKey, expectedRevision: current.revision })
    if (!result.ok) throw new Error(result.error.message)
    const saved = decodeCommandCodeSaveResult(result.value)
    if (saved === undefined) throw new Error(t('saveFailed'))
    updateSnapshot({ ...snapshot, status: 'ready', value: saved.settings, base: saved.settings, user: saved.settings, revision: saved.revision, writable: snapshot.writable, mode: 'host' })
    return saved
  }
  const discover: CommandCodeCardFace['discoverModels'] = async (request: CommandCodeDiscoveryRequest) => {
    const result = await callPlugin(COMMANDCODE_DISCOVER_ENDPOINT, request)
    if (!result.ok) throw new Error(result.error.message)
    const decoded = decodeCommandCodeDiscoveryResult(result.value)
    if (decoded === undefined) throw new Error(t('discoveryEmpty'))
    return decoded
  }
  const fetchUsage: CommandCodeCardFace['fetchUsage'] = async () => {
    const result = await callPlugin(COMMANDCODE_USAGE_ENDPOINT, {})
    if (!result.ok) throw new Error(result.error.message)
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

  ensureProviderSection(ctx)
  ctx.slots.inject('settings.provider.item', () => ctx.slots.register({
    name: 'settings.provider.item',
    key: COMMANDCODE_SETTINGS_NAMESPACE,
    locale: localeNamespace,
    inject: (): CommandCodeCardFace => ({
      t,
      hooks: { commandCodeSettings: scope },
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
}

export type { CommandCodeSettingsKey }
export type { CommandCodeCardFace }