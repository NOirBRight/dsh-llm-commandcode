/** Browser face for the Command Code settings and quota card. */
import type { ClientContext } from './shim.js';
import type { CommandCodeSettingsKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'settings.commandcode': CommandCodeSettingsKey;
    }
}
import type { CommandCodeCardFace } from './CommandCodeSettingsCard.tsx';
export declare const name = "dsh-llm-commandcode-client";
export declare const inject: string[];
/** Register the Command Code card inside the shared LLM Providers section. */
export declare function apply(ctx: ClientContext): void;
export type { CommandCodeSettingsKey };
export type { CommandCodeCardFace };
//# sourceMappingURL=index.d.ts.map