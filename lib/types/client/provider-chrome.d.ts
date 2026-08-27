/** Shared LLM provider navigation chrome. */
import type { CSSProperties, ReactNode } from 'react';
/** Install the provider globe icon and remove the observer on teardown. */
export declare function installProvidersNavIcon(): () => void;
export declare const providerHeaderStyle: CSSProperties;
/** Join account state and model count in the standard provider header. */
export declare function formatProviderSummary(status: string, modelsLabel: string): string;
/** Standard provider card header used by the shared LLM Providers page. */
export declare function ProviderCardHeader(props: {
    title: string;
    mark: ReactNode;
    summary: string;
    open: boolean;
    unsaved?: boolean;
    unsavedLabel?: string;
}): ReactNode;
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