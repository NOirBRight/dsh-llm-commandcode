/** Live Command Code model catalog discovery. */
import type { CommandCodeDiscoveryRequest } from './client-contract.ts';
import type { CommandCodeModelConfig } from './types.ts';
export declare const MAX_DISCOVERY_BYTES: number;
export declare const DISCOVERY_TIMEOUT_MS = 30000;
/** Discovery has no credential or endpoint input; only cancellation is caller-controlled. */
export interface CommandCodeDiscoveryOptions extends CommandCodeDiscoveryRequest {
}
export declare function protocolForModel(id: string): 'openai-completions' | 'anthropic-messages';
/** Parse the provider's OpenAI-shaped model list without inventing capacity. */
export declare function parseCommandCodeModels(value: unknown): {
    models: CommandCodeModelConfig[];
    warnings: string[];
};
/** Fetch the current public model catalog. */
export declare function discoverModels(request?: CommandCodeDiscoveryOptions, fetchImpl?: typeof fetch): Promise<{
    models: CommandCodeModelConfig[];
    warnings: string[];
}>;
//# sourceMappingURL=discovery.d.ts.map