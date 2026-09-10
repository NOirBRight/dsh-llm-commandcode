/** Browser-safe effort catalog extracted from official command-code@1.44.0. */
import type { CommandCodeModelConfig } from './types.ts';
/** Map a models.dev / wire effort token onto the plugin's level ids. */
export declare function canonCommandCodeEffort(value: string): string | undefined;
/** Return a valid explicit default; every model with efforts gets one. */
export declare function defaultEffortForCommandCodeModel(model: Pick<CommandCodeModelConfig, 'id' | 'defaultEffort' | 'thinkingEfforts'>): string | undefined;
export declare const EFFORT_LABELS: Readonly<Record<string, string>>;
export declare function effortsForCommandCodeModel(model: Pick<CommandCodeModelConfig, 'id' | 'thinkingEfforts'>): readonly string[];
//# sourceMappingURL=reasoning-catalog.d.ts.map