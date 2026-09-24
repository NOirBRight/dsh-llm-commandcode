/** Command Code plugin entry: route registration, settings, discovery, and quota RPC. */
import type { Context, Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { RetryPolicyConfig } from '@deepseek-ai/dsh-llm';
import type { CommandCodeSettingsView } from './client-contract.ts';
import type { CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts';
export { COMMANDCODE_PROVIDER, COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT, COMMANDCODE_CREDENTIAL_SET_ENDPOINT, COMMANDCODE_RPC_CHANNEL, COMMANDCODE_RPC_METHOD, COMMANDCODE_SETTINGS_NAMESPACE, DEFAULT_API_KEY_ENV, DEFAULT_CONTEXT_WINDOW, DEFAULT_MAX_TOKENS, DEFAULT_REQUEST_TIMEOUT_MS, DEFAULT_STREAM_IDLE_TIMEOUT_MS, PUBLIC_PROVIDER_BASE_URL, } from './client-contract.ts';
export { CommandCodeAdapter } from './adapter.ts';
export type { CommandCodeAdapterOptions } from './types.ts';
export type { CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts';
export { discoverModels, parseCommandCodeModels, protocolForModel } from './discovery.ts';
export { parseCommandCodeUsageBodies } from './usage.ts';
export type { CommandCodeUsageCredits, CommandCodeUsagePlan, CommandCodeUsageRead, CommandCodeUsageSummary, CommandCodeUsageView, CommandCodeUsageWindow, } from './types.ts';
export { decodeCommandCodeCredentialSetRequest, decodeCommandCodeDiscoveryRequest, decodeCommandCodeDiscoveryResult, decodeCommandCodeModel, decodeCommandCodeValidateRequest, decodeCommandCodeSettings, decodeCommandCodeUsageReply, decodeCommandCodeUsageRequest, decodeCommandCodeUsageView, } from './client-contract.ts';
export type { CommandCodeDiscoveryRequest, CommandCodeDiscoveryResult, CommandCodeValidateRequest, CommandCodeSaveResult, CommandCodeUsageReply, CommandCodeUsageRequest, } from './client-contract.ts';
export declare const name = "llm-commandcode";
export declare const inject: string[];
/** No fabricated startup capacities: a model enters the route only after live discovery or explicit config. */
export declare const DEFAULT_MODELS: CommandCodeModelConfig[];
export interface Config {
    apiKeyEnv: string;
    models: Volatile<CommandCodeModelConfig[] | undefined>;
    defaultContextWindow: Volatile<number>;
    defaultMaxTokens: Volatile<number>;
    requestTimeoutMs: Volatile<number>;
    streamIdleTimeoutMs: Volatile<number>;
    zeroDataRetention: Volatile<boolean>;
    usageEnabled: Volatile<boolean>;
    retryPolicy?: RetryPolicyConfig;
}
interface ConfigInput {
    apiKeyEnv?: string | null;
    models?: CommandCodeModelConfig[] | null;
    defaultContextWindow?: number | null;
    defaultMaxTokens?: number | null;
    requestTimeoutMs?: number | null;
    streamIdleTimeoutMs?: number | null;
    zeroDataRetention?: boolean | null;
    usageEnabled?: boolean | null;
    retryPolicy?: RetryPolicyConfig | null;
}
export declare const Config: z<ConfigInput, Config>;
/**
 * Answer one quota failure on the wire instead of throwing it out of the handler,
 * where the host would turn it into a gateway error. A missing or unusable
 * credential answers {@link INVALID_CREDENTIAL_CODE}, the only code the shared
 * provider-UI quota cache drops the previous account's entry for; any other
 * LlmError keeps its own code, and a non-LlmError failure stays internal.
 * @param error - thrown value from credential resolution or the account read.
 */
export declare function usageFailure(error: unknown): {
    ok: false;
    error: {
        code: string;
        message: string;
        details: {};
    };
};
export declare function resolveAdapterOptions(config: Config): CommandCodeConnectionOptions;
export declare function apply(ctx: Context, config: Config): void;
export type { CommandCodeSettingsView };
//# sourceMappingURL=index.d.ts.map