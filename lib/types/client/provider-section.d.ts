/** Shared Settings > LLM Providers section, claimed by the first provider plugin. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
export declare const PROVIDERS_SECTION_ID = "providers";
export declare const PROVIDERS_ITEM_SLOT = "settings.provider.item";
export declare const PROVIDERS_LOCALE_NS = "settings.providers";
export declare const PROVIDER_ITEM_ORDER: readonly ["llm-cursor", "llm-grok", "llm-codex", "llm-ollama", "llm-commandcode"];
declare const copy: {
    zh: {
        nav: string;
        title: string;
        subtitle: string;
        empty: string;
    };
    en: {
        nav: string;
        title: string;
        subtitle: string;
        empty: string;
    };
};
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        'settings.provider.item': {
            kind: 'keyed';
            scope: 'root';
        };
    }
    interface LocaleNamespaceMap {
        'settings.providers': keyof typeof copy.en;
    }
}
/** Ensure an LLM Providers nav row exists without duplicating another plugin's row. */
export declare function ensureProviderSection(ctx: ClientContext): void;
export {};
//# sourceMappingURL=provider-section.d.ts.map