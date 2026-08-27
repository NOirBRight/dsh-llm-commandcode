/** Host-side projection of Command Code effort metadata into the DSH model seam. */
import type { LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm';
import type { CommandCodeModelConfig } from './types.ts';
export { EFFORT_LABELS, defaultEffortForCommandCodeModel, effortsForCommandCodeModel } from './reasoning-catalog.ts';
export declare function applyCommandCodeReasoningMetadata(info: LlmResolvedModelInfo, model: CommandCodeModelConfig): LlmResolvedModelInfo;
//# sourceMappingURL=reasoning.d.ts.map