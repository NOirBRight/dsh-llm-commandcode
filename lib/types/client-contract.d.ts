/** Browser-safe constants and JSON decoders for the Command Code plugin. */
import type { CommandCodeModelConfig, CommandCodeUsageRead, CommandCodeUsageView } from './types.ts';
export type { CommandCodeModelConfig, CommandCodeUsageRead, CommandCodeUsageView, CommandCodeUsageWindow, } from './types.ts';
export declare const COMMANDCODE_SETTINGS_NAMESPACE = "llm-commandcode";
export declare const COMMANDCODE_PROVIDER = "commandcode";
export declare const DEFAULT_API_KEY_ENV = "COMMANDCODE_API_KEY";
export declare const PUBLIC_PROVIDER_BASE_URL = "https://api.commandcode.ai/provider/v1";
export declare const DEFAULT_CONTEXT_WINDOW = 1000000;
export declare const DEFAULT_MAX_TOKENS = 32768;
export declare const DEFAULT_REQUEST_TIMEOUT_MS = 60000;
export declare const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 300000;
export declare const COMMANDCODE_RPC_CHANNEL = "/commandcode";
export declare const COMMANDCODE_DISCOVER_ENDPOINT = "models/discover";
export declare const COMMANDCODE_SAVE_ENDPOINT = "settings/save";
export declare const COMMANDCODE_USAGE_ENDPOINT = "usage/read";
/** Settings section mirrored to the browser without a secret. */
export interface CommandCodeSettingsView {
    apiKeyEnv: string;
    models: CommandCodeModelConfig[];
    defaultContextWindow: number;
    defaultMaxTokens: number;
    requestTimeoutMs: number;
    streamIdleTimeoutMs: number;
    zeroDataRetention: boolean;
    usageEnabled: boolean;
}
export interface CommandCodeDiscoveryRequest {
    /** Host-only cancellation; omitted from browser JSON. */
    signal?: AbortSignal;
}
export interface CommandCodeDiscoveryResult {
    models: CommandCodeModelConfig[];
    warnings: string[];
}
export interface CommandCodeSaveRequest {
    settings: Omit<CommandCodeSettingsView, 'apiKeyEnv'>;
    expectedRevision: number;
}
export interface CommandCodeSaveResult {
    settings: CommandCodeSettingsView;
    revision: number;
}
export interface CommandCodeUsageRequest {
}
export interface CommandCodeUsageReply {
    status: 'ok' | 'unsupported';
    usage?: CommandCodeUsageView;
}
/** Decode one model while preserving only known JSON fields. */
export declare function decodeCommandCodeModel(value: unknown): CommandCodeModelConfig | undefined;
export declare function decodeCommandCodeSettings(value: unknown): CommandCodeSettingsView | undefined;
export declare function decodeCommandCodeDiscoveryRequest(value: unknown): CommandCodeDiscoveryRequest | undefined;
export declare function decodeCommandCodeDiscoveryResult(value: unknown): CommandCodeDiscoveryResult | undefined;
export declare function decodeCommandCodeSaveRequest(value: unknown): CommandCodeSaveRequest | undefined;
export declare function decodeCommandCodeSaveResult(value: unknown): CommandCodeSaveResult | undefined;
/** Decode the secret-free usage snapshot returned by the Host. */
export declare function decodeCommandCodeUsageView(value: unknown): CommandCodeUsageView | undefined;
export declare function decodeCommandCodeUsageReply(value: unknown): CommandCodeUsageRead | undefined;
export declare function decodeCommandCodeUsageRequest(value: unknown): CommandCodeUsageRequest | undefined;
//# sourceMappingURL=client-contract.d.ts.map