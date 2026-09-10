/** Live models.dev overlay for Command Code ids that GET /models does not describe. */
import type { CommandCodeModelConfig } from './types.ts';
/** Public models.dev catalog used to fill unknown Command Code capacities. */
export declare const MODELS_DEV_URL = "https://models.dev/api.json";
export declare const MODELS_DEV_MAX_BYTES: number;
export declare const MODELS_DEV_TIMEOUT_MS = 15000;
/** How long Fetch will wait for models.dev before showing the CLI snapshot. */
export declare const MODELS_DEV_WAIT_MS = 800;
export type CommandCodeModelsDevOverlay = ReadonlyMap<string, CommandCodeModelConfig>;
/** Tests point the disk cache at a temp file; production uses tmpdir. */
export declare function setCommandCodeModelsDevCachePathForTests(path: string | undefined): void;
/** Drop the process-local models.dev cache. Tests use this. */
export declare function clearCommandCodeModelsDevCache(): void;
/** Return the cached overlay without fetching. */
export declare function peekCommandCodeModelsDev(): CommandCodeModelsDevOverlay | undefined;
/** Parse one models.dev row into catalog fields. Exact id only; unknown stays unknown. */
export declare function parseCommandCodeModelsDevRow(id: string, value: unknown): CommandCodeModelConfig | undefined;
/** Index models.dev by lowercase id. Prefer Command Code, then OpenRouter, then other same-id rows. */
export declare function parseCommandCodeModelsDev(value: unknown): CommandCodeModelsDevOverlay;
/** Fetch models.dev, returning an empty overlay when the document is unavailable. */
export declare function loadCommandCodeModelsDev(fetchImpl?: typeof fetch, signal?: AbortSignal, options?: {
    force?: boolean;
}): Promise<CommandCodeModelsDevOverlay>;
//# sourceMappingURL=models-dev.d.ts.map