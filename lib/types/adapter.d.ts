/** Command Code adapter delegated to DSH's mixed-protocol PiAiAdapter. */
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, PreparedAdapterCall, ResolvedRetryPolicy, StreamChunk } from '@deepseek-ai/dsh-llm';
import type { CommandCodeAdapterOptions } from './types.ts';
export { DEFAULT_CONTEXT_WINDOW, DEFAULT_MAX_TOKENS, DEFAULT_REQUEST_TIMEOUT_MS, DEFAULT_STREAM_IDLE_TIMEOUT_MS, PUBLIC_PROVIDER_BASE_URL, } from './client-contract.ts';
/** Compatibility helper retained for package callers and diagnostics. */
export declare function httpErrorCode(status: number, body?: unknown): string;
/** One DSH provider route backed by a pi-ai provider with per-model api dispatch. */
export declare class CommandCodeAdapter extends LlmAdapter {
    private readonly config;
    private readonly auth;
    private snapshot;
    constructor(config: CommandCodeAdapterOptions);
    private current;
    providerInfo(provider: string): LlmProviderInfo;
    providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined;
    /**
     * Declare neutral request-image pricing when a newer Host calls an adapter built against an older peer instance.
     * The method omits `override` so the same source compiles against pre-alpha peer types.
     * @param _provider - provider route.
     * @param _model - model id.
     * @returns `undefined` so the Host uses heuristic image pricing.
     */
    imageRequestPricing(_provider: string, _model: string): undefined;
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    resolveModel(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
    prepareCall(provider: string, model: string, signal?: AbortSignal): Promise<PreparedAdapterCall>;
}
export type { CommandCodeApi, CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts';
//# sourceMappingURL=adapter.d.ts.map