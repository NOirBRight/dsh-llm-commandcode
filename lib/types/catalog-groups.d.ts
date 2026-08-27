/** Official Command Code CLI model-plan grouping used only for picker UX. */
import type { CommandCodeModelConfig } from './types.ts';
export type CommandCodePlanGroup = 'go' | 'pro' | 'provider' | 'other';
export interface CommandCodeModelGroup {
    id: CommandCodePlanGroup;
    label: string;
    models: readonly CommandCodeModelConfig[];
}
/** Return the lowest official CLI plan group known for this model id. */
export declare function planGroupForModel(id: string): CommandCodePlanGroup;
/** Group provider candidates without changing their order within a group. */
export declare function groupCommandCodeModels(models: readonly CommandCodeModelConfig[]): CommandCodeModelGroup[];
//# sourceMappingURL=catalog-groups.d.ts.map