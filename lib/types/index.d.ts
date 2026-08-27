/** Command Code plugin entry: route registration, settings, discovery, and quota RPC. */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { RetryPolicyConfig } from '@deepseek-ai/dsh-llm';
import type { CommandCodeSettingsView } from './client-contract.ts';
import type { CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts';
export { COMMANDCODE_PROVIDER, COMMANDCODE_RPC_CHANNEL, COMMANDCODE_SETTINGS_NAMESPACE, DEFAULT_API_KEY_ENV, DEFAULT_CONTEXT_WINDOW, DEFAULT_MAX_TOKENS, DEFAULT_REQUEST_TIMEOUT_MS, DEFAULT_STREAM_IDLE_TIMEOUT_MS, PUBLIC_PROVIDER_BASE_URL, } from './client-contract.ts';
export { CommandCodeAdapter } from './adapter.ts';
export type { CommandCodeAdapterOptions } from './types.ts';
export type { CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts';
export { discoverModels, parseCommandCodeModels, protocolForModel } from './discovery.ts';
export { parseCommandCodeUsageBodies } from './usage.ts';
export type { CommandCodeUsageCredits, CommandCodeUsagePlan, CommandCodeUsageRead, CommandCodeUsageSummary, CommandCodeUsageView, CommandCodeUsageWindow, } from './types.ts';
export { decodeCommandCodeDiscoveryRequest, decodeCommandCodeDiscoveryResult, decodeCommandCodeModel, decodeCommandCodeSaveRequest, decodeCommandCodeSaveResult, decodeCommandCodeSettings, decodeCommandCodeUsageReply, decodeCommandCodeUsageRequest, decodeCommandCodeUsageView, } from './client-contract.ts';
export type { CommandCodeDiscoveryRequest, CommandCodeDiscoveryResult, CommandCodeSaveRequest, CommandCodeSaveResult, CommandCodeUsageReply, CommandCodeUsageRequest, } from './client-contract.ts';
export declare const name = "llm-commandcode";
export declare const inject: string[];
/** No fabricated startup capacities: a model enters the route only after live discovery or explicit config. */
export declare const DEFAULT_MODELS: CommandCodeModelConfig[];
export interface Config {
    apiKeyEnv?: string;
    models?: CommandCodeModelConfig[];
    defaultContextWindow?: number;
    defaultMaxTokens?: number;
    requestTimeoutMs?: number;
    streamIdleTimeoutMs?: number;
    zeroDataRetention?: boolean;
    usageEnabled?: boolean;
    retryPolicy?: RetryPolicyConfig;
}
export declare const Config: z<Config>;
export declare function resolveAdapterOptions(config: Config): CommandCodeConnectionOptions;
export declare function apply(ctx: Context, config: Config): void;
export type { CommandCodeSettingsView };
//# sourceMappingURL=index.d.ts.map