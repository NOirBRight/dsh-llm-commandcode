/** Host-side projection of Command Code effort metadata into the DSH model seam. */

import type { LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import type { CommandCodeModelConfig } from './types.ts'
import { EFFORT_LABELS, defaultEffortForCommandCodeModel, effortsForCommandCodeModel } from './reasoning-catalog.ts'

export { EFFORT_LABELS, defaultEffortForCommandCodeModel, effortsForCommandCodeModel } from './reasoning-catalog.ts'

export function applyCommandCodeReasoningMetadata(
  info: LlmResolvedModelInfo,
  model: CommandCodeModelConfig,
): LlmResolvedModelInfo {
  const efforts = effortsForCommandCodeModel(model)
  if (efforts.length === 0) return info
  const resolvedDefault = defaultEffortForCommandCodeModel(model)
  const defaultEffort = resolvedDefault === undefined ? undefined : ReasoningEffortId(resolvedDefault)
  return {
    ...info,
    reasoning: {
      efforts: efforts.map(id => ({ id: ReasoningEffortId(id), name: EFFORT_LABELS[id] ?? id })),
      ...(defaultEffort === undefined ? {} : { defaultEffort }),
    },
  }
}
