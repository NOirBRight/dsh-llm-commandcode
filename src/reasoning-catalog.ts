/** Browser-safe effort catalog extracted from official command-code@1.36.0. */

import type { CommandCodeModelConfig } from './types.ts'

const ALL = ['low', 'medium', 'high', 'xhigh', 'max'] as const
const FOUR = ['low', 'medium', 'high', 'xhigh'] as const
const THREE = ['low', 'medium', 'high'] as const
const HIGH_MAX = ['high', 'max'] as const
const LOW_HIGH_MAX = ['low', 'high', 'max'] as const
const LOW_MEDIUM_XHIGH = ['low', 'medium', 'xhigh'] as const

/** Exact model ids and reasoningEfforts from the published official CLI model table. */
const OFFICIAL_EFFORTS: Readonly<Record<string, readonly string[]>> = {
  'claude-sonnet-5': ALL,
  'claude-sonnet-4-6': ALL,
  'claude-fable-5': ALL,
  'claude-opus-5': ALL,
  'claude-opus-4-8': ALL,
  'claude-opus-4-7': ALL,
  'claude-haiku-4-5-20251001': ALL,
  'gpt-5.6-sol': ALL,
  'gpt-5.6-terra': ALL,
  'gpt-5.6-luna': ALL,
  'gpt-5.5': FOUR,
  'gpt-5.4': FOUR,
  'gpt-5.3-codex': FOUR,
  'gpt-5.4-mini': THREE,
  'deepseek/deepseek-v4-pro': HIGH_MAX,
  'deepseek/deepseek-v4-flash': HIGH_MAX,
  'deepseek/deepseek-v4-flash-vision-exp': HIGH_MAX,
  'moonshotai/kimi-k2.7-code': LOW_HIGH_MAX,
  'moonshotai/kimi-k2.7-code-highspeed': LOW_HIGH_MAX,
  'moonshotai/kimi-k2.6': LOW_HIGH_MAX,
  'moonshotai/kimi-k2.5': LOW_HIGH_MAX,
  'z-ai/glm-5.3-flash': LOW_HIGH_MAX,
  'zai-org/glm-5.3': LOW_HIGH_MAX,
  'zai-org/glm-5.2': HIGH_MAX,
  'minimax/minimax-m2.7-free': LOW_MEDIUM_XHIGH,
  'minimaxai/minimax-m2.5': LOW_MEDIUM_XHIGH,
  'xiaomi/mimo-v2.5-pro': LOW_MEDIUM_XHIGH,
  'xiaomi/mimo-v2.5': LOW_MEDIUM_XHIGH,
  'qwen/qwen3.8-max': LOW_MEDIUM_XHIGH,
  'qwen/qwen3.8-27b': LOW_MEDIUM_XHIGH,
  'qwen/qwen3.8-flash': LOW_MEDIUM_XHIGH,
  'stepfun/step-3.7-flash': THREE,
  'stepfun/step-3.5-flash': THREE,
  'tencent/hy3': THREE,
  'tencent/hy3-paid': THREE,
  'google/gemini-3.7-flash': THREE,
  'google/gemini-3.6-flash': THREE,
  'google/gemini-3.5-flash': THREE,
  'google/gemini-3.5-flash-lite': THREE,
  'google/gemini-3.1-flash-lite': THREE,
  'sakana/fugu-ultra': ['high', 'xhigh'],
  'meta/muse-spark-1.2': THREE,
  'meta/muse-spark-1.2-contributor': THREE,
  'xai/grok-4.5': THREE,
  'xai/grok-4.6': FOUR,
}



/** Explicit deployment defaults aligned with local Ollama/OpenCode/Codex policy. */
const DEFAULT_EFFORTS: Readonly<Record<string, string>> = {
  'z-ai/glm-5.3-flash': 'max',
  'zai-org/glm-5.3': 'max',
  'zai-org/glm-5.2': 'max',
  'gpt-5.6-sol': 'high',
  'gpt-5.6-terra': 'xhigh',
  'gpt-5.6-luna': 'max',
}

const EFFORT_RANK = ['low', 'medium', 'high', 'xhigh', 'max'] as const

function highestEffort(efforts: readonly string[]): string | undefined {
  return [...EFFORT_RANK].reverse().find(effort => efforts.includes(effort)) ?? efforts.at(-1)
}

/** Return a valid explicit default; every model with efforts gets one. */
export function defaultEffortForCommandCodeModel(
  model: Pick<CommandCodeModelConfig, 'id' | 'defaultEffort'>,
): string | undefined {
  const efforts = effortsForCommandCodeModel(model)
  if (efforts.length === 0) return undefined
  if (model.defaultEffort !== undefined && efforts.includes(model.defaultEffort)) return model.defaultEffort
  const key = model.id.toLowerCase()
  if (key.startsWith('deepseek/')) return efforts.includes('max') ? 'max' : highestEffort(efforts)
  if (key.startsWith('meta/muse-')) return highestEffort(efforts)
  const preferred = DEFAULT_EFFORTS[key] ?? (key.startsWith('gpt-') ? 'xhigh' : undefined)
  if (preferred !== undefined && efforts.includes(preferred)) return preferred
  return efforts.includes('high') ? 'high'
    : efforts.includes('medium') ? 'medium'
      : highestEffort(efforts)
}

export const EFFORT_LABELS: Readonly<Record<string, string>> = {
  low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra high', max: 'Max',
}

export function effortsForCommandCodeModel(model: Pick<CommandCodeModelConfig, 'id'>): readonly string[] {
  return OFFICIAL_EFFORTS[model.id.toLowerCase()] ?? []
}
