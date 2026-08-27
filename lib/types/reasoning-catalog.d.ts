/** Browser-safe effort catalog extracted from official command-code@1.36.0. */
import type { CommandCodeModelConfig } from './types.ts';
/** Return a valid explicit default; every model with efforts gets one. */
export declare function defaultEffortForCommandCodeModel(model: Pick<CommandCodeModelConfig, 'id' | 'defaultEffort'>): string | undefined;
export declare const EFFORT_LABELS: Readonly<Record<string, string>>;
export declare function effortsForCommandCodeModel(model: Pick<CommandCodeModelConfig, 'id'>): readonly string[];
//# sourceMappingURL=reasoning-catalog.d.ts.map