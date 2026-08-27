/** Host-only Command Code account credit and quota reporting. */
import type { CommandCodeUsageRead, CommandCodeUsageView } from './types.ts';
export declare const USAGE_TIMEOUT_MS = 15000;
export declare const USAGE_UNSUPPORTED = "COMMANDCODE_USAGE_UNSUPPORTED";
export declare const USAGE_FAILED = "COMMANDCODE_USAGE_FAILED";
export declare const MAX_USAGE_BYTES: number;
export interface CommandCodeUsageRequest {
    signal?: AbortSignal;
}
/** Parse a report from endpoint bodies; exported for deterministic unit tests. */
export declare function parseCommandCodeUsageBodies(input: {
    whoami?: Record<string, unknown>;
    credits?: Record<string, unknown>;
    subscription?: Record<string, unknown>;
    summary?: Record<string, unknown>;
    failures?: string[];
    now?: string;
}): CommandCodeUsageView;
/** Query account credits and rolling quota windows without making a model call. */
export declare function readCommandCodeUsage(request: CommandCodeUsageRequest, resolveCredential: () => Promise<string | undefined>, fetchImpl?: typeof fetch): Promise<CommandCodeUsageRead>;
//# sourceMappingURL=usage.d.ts.map