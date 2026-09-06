/** Shared LLM provider navigation chrome. */
import type { ReactNode } from 'react';
/** Install the provider globe icon and remove the observer on teardown. */
export declare function installProvidersNavIcon(): () => void;
/** Join account state and model count in the standard provider header. */
export declare function formatProviderSummary(status: string, modelsLabel: string): string;
/** Canonical shared header: delete per-provider fork, re-export built artifact. */
export { ProviderCardHeader, ProviderQuotaMeter, providerUiCss } from 'dsh-llm-providers-ui/provider-ui';
export type { ProviderCardHeaderProps, ProviderQuotaMeterProps, ProviderQuotaState } from 'dsh-llm-providers-ui/provider-ui';
/** Standard compact usage reset caption. */
export declare function UsageResetAt(props: {
    label: string | undefined;
}): ReactNode;
/** Standard last-updated caption. */
export declare function UsageUpdatedAt(props: {
    at: Date | undefined;
    label: string;
}): ReactNode;
/** Standard usage section heading and refresh action. */
export declare function UsageHeader(props: {
    title: ReactNode;
    spinning: boolean;
    disabled?: boolean;
    refreshLabel: string;
    busyLabel: string;
    onRefresh: () => void;
    error?: string;
}): ReactNode;
/** Standard loading bars for provider usage. */
export declare function UsageSkeleton(props: {
    rows?: number;
}): ReactNode;
//# sourceMappingURL=provider-chrome.d.ts.map