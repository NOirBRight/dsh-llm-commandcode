/** Shared Settings > LLM Providers section, claimed by the first provider plugin. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { ProvidersSection } from './ProvidersSection.tsx'
import { installProvidersNavIcon } from './provider-chrome.tsx'

export const PROVIDERS_SECTION_ID = 'providers'
export const PROVIDERS_ITEM_SLOT = 'settings.provider.item'
export const PROVIDERS_LOCALE_NS = 'settings.providers'
export const PROVIDER_ITEM_ORDER = ['llm-cursor', 'llm-grok', 'llm-codex', 'llm-ollama', 'llm-commandcode'] as const

const copy = {
  zh: { nav: 'LLM 供应商', title: 'LLM 供应商', subtitle: '连接账号，并选择哪些模型出现在对话的模型列表里。', empty: '安装一个 LLM provider 后，在这里连接账号并选择模型。' },
  en: { nav: 'LLM Providers', title: 'LLM Providers', subtitle: 'Connect accounts and choose which models appear in the chat picker.', empty: 'Install an LLM provider to connect an account and pick models here.' },
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'settings.provider.item': { kind: 'keyed'; scope: 'root' }
  }
  interface LocaleNamespaceMap {
    'settings.providers': keyof typeof copy.en
  }
}

interface SlotsFace {
  inject(name: string, factory: () => (() => void) | void): void
  register(options: Record<string, unknown>, component: unknown): () => void
  entries(name: string): readonly { options: { id?: string } }[]
  subscribe?(name: string, listener: () => void): () => void
}

interface LocaleFace {
  register(namespace: string, dictionaries: typeof copy): () => void
  bind(namespace: string): (key: string) => string
}

function occupied(slots: SlotsFace): boolean {
  return slots.entries('settings.section').some(entry => entry.options.id === PROVIDERS_SECTION_ID)
}

/** Ensure an LLM Providers nav row exists without duplicating another plugin's row. */
export function ensureProviderSection(ctx: ClientContext): void {
  const slots = ctx.slots as unknown as SlotsFace
  const locale = ctx.locale as unknown as LocaleFace
  ctx.slots.inject('settings.section', () => {
    let disposeSection: (() => void) | undefined
    let disposeLocale: (() => void) | undefined
    let disposeIcon: (() => void) | undefined
    const claim = (): void => {
      if (disposeSection !== undefined || occupied(slots)) return
      disposeLocale ??= locale.register(PROVIDERS_LOCALE_NS, copy)
      const t = locale.bind(PROVIDERS_LOCALE_NS)
      disposeSection = slots.register({
        name: 'settings.section',
        id: PROVIDERS_SECTION_ID,
        order: 12,
        label: () => t('nav'),
        locale: PROVIDERS_LOCALE_NS,
        children: { [PROVIDERS_ITEM_SLOT]: { kind: 'keyed', scope: 'root' } },
      }, ProvidersSection)
      disposeIcon ??= installProvidersNavIcon()
    }
    claim()
    const stop = slots.subscribe?.('settings.section', () => {
      if (!occupied(slots)) {
        disposeSection = undefined
        claim()
      }
    })
    return () => {
      stop?.()
      disposeIcon?.()
      disposeSection?.()
      disposeLocale?.()
      disposeIcon = undefined
      disposeSection = undefined
      disposeLocale = undefined
    }
  })
}
