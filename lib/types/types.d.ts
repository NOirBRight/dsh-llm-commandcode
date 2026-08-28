/** Command Code provider domain types shared by the Host adapter and tests. */
import type { AttachmentStore } from '@deepseek-ai/dsh-attachment';
import type { CredentialRef } from '@deepseek-ai/dsh-credentials';
import type { LlmModelInfo, ModelModality, ResolvedRetryPolicy } from '@deepseek-ai/dsh-llm';
/** Wire protocol selected for one Command Code model. */
export type CommandCodeApi = 'openai-completions' | 'anthropic-messages';
/** One configured or discovered model. */
export interface CommandCodeModelConfig {
    id: string;
    name?: string;
    description?: string;
    /** Provider-advertised context_length, when present. */
    contextWindow?: number;
    /** Explicit user correction, which wins over the provider value. */
    contextWindowOverride?: number;
    maxTokens?: number;
    /** Whether the model supports native thinking; false clears defaultEffort. */
    thinking?: boolean;
    /** Saved default effort; omission derives the provider plugin policy. */
    defaultEffort?: string;
    inputModalities?: ModelModality[];
}
/** Fully resolved connection facts captured for one operation. */
export interface CommandCodeConnectionOptions {
    apiKeyEnv: CredentialRef;
    providerBaseURL: string;
    models: readonly CommandCodeModelConfig[];
    defaultContextWindow: number;
    defaultMaxTokens: number;
    requestTimeoutMs: number;
    streamIdleTimeoutMs: number;
    zeroDataRetention: boolean;
    usageEnabled: boolean;
    retryPolicy: ResolvedRetryPolicy;
}
/** Dependencies injected by the Cordis plugin entry. */
export interface CommandCodeAdapterOptions {
    options: () => CommandCodeConnectionOptions;
    resolveApiKey: (connection: CommandCodeConnectionOptions) => Promise<string>;
    resolveAttachments?: () => AttachmentStore | undefined;
}
/** One account identity returned by the account endpoint. */
export interface CommandCodeUsageAccount {
    name?: string;
    userName?: string;
}
/** One quota window. Values are provider/account facts, not token counts. */
export interface CommandCodeUsageWindow {
    used: number;
    cap: number;
    exceeded?: boolean;
    resetAt?: string;
}
/** Credit and rolling-window facts. */
export interface CommandCodeUsageCredits {
    monthlyCredits?: number;
    purchasedCredits?: number;
    freeCredits?: number;
    fiveHour?: CommandCodeUsageWindow;
    weekly?: CommandCodeUsageWindow;
}
/** Subscription facts safe for display. */
export interface CommandCodeUsagePlan {
    planId?: string;
    name?: string;
    status?: string;
    currentPeriodEnd?: string;
}
/** Optional aggregate usage facts from the account summary endpoint. */
export interface CommandCodeUsageSummary {
    totalCost?: number;
    totalTokensIn?: number;
    totalTokensOut?: number;
    totalCount?: number;
    completedCount?: number;
    failedCount?: number;
}
/** Secret-free account snapshot sent to the settings page. */
export interface CommandCodeUsageView {
    fetchedAt: string;
    account?: CommandCodeUsageAccount;
    credits?: CommandCodeUsageCredits;
    plan?: CommandCodeUsagePlan;
    summary?: CommandCodeUsageSummary;
    failures: string[];
}
/** Errors that explain why an account report has no useful data. */
export type CommandCodeUsageBlocked = 'missing-credential' | 'invalid-credential' | 'unsupported' | 'network';
/** Result of one provider usage read. */
export type CommandCodeUsageRead = {
    status: 'ok';
    usage: CommandCodeUsageView;
} | {
    status: 'unsupported';
};
/** Model metadata used by the adapter's public list. */
export declare function modelInfo(provider: string, model: CommandCodeModelConfig): LlmModelInfo;
/** Resolve the model's effective context without rounding or guessing first. */
export declare function effectiveContext(model: CommandCodeModelConfig, fallback: number): number;
/** Resolve the model's wire protocol. */
export declare function effectiveApi(model: Pick<CommandCodeModelConfig, 'id'>): CommandCodeApi;
//# sourceMappingURL=types.d.ts.map