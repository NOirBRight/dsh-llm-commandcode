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
export declare const COMMANDCODE_RPC_CHANNEL = "/api";
export declare const COMMANDCODE_RPC_METHOD = "plugin-rpc/commandcode";
export declare const COMMANDCODE_DISCOVER_ENDPOINT = "models/discover";
export declare const COMMANDCODE_VALIDATE_ENDPOINT = "settings/validate";
export declare const COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT = "credentials/status";
export declare const COMMANDCODE_CREDENTIAL_SET_ENDPOINT = "credentials/set";
export declare const COMMANDCODE_USAGE_ENDPOINT = "usage/read";
/** Volatile configuration fields surfaced to the browser settings card. */
export interface CommandCodeSettingsView {
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
export interface CommandCodeValidateRequest {
    settings: CommandCodeSettingsView;
}
export interface CommandCodeSaveResult {
    settings: CommandCodeSettingsView;
    revision: number;
}
export interface CommandCodeCredentialSetRequest {
    apiKey: string;
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
export declare function decodeCommandCodeValidateRequest(value: unknown): CommandCodeValidateRequest | undefined;
export declare function decodeCommandCodeCredentialSetRequest(value: unknown): CommandCodeCredentialSetRequest | undefined;
export declare function decodeCommandCodeUsageView(value: unknown): CommandCodeUsageView | undefined;
export declare function decodeCommandCodeUsageReply(value: unknown): CommandCodeUsageRead | undefined;
export declare function decodeCommandCodeUsageRequest(value: unknown): CommandCodeUsageRequest | undefined;
//# sourceMappingURL=client-contract.d.ts.map