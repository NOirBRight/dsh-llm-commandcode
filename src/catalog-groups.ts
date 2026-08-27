/** Official Command Code CLI model-plan grouping used only for picker UX. */

import type { CommandCodeModelConfig } from './types.ts'

export type CommandCodePlanGroup = 'go' | 'pro' | 'provider' | 'other'

export interface CommandCodeModelGroup {
  id: CommandCodePlanGroup
  label: string
  models: readonly CommandCodeModelConfig[]
}

const PREMIUM_EXACT = new Set([
  'gpt-5.6-terra', 'gpt-5.5', 'gpt-5.4', 'gpt-5.3-codex', 'gpt-5.4-mini',
  'google/gemini-3.5-flash', 'google/gemini-3.1-flash-lite', 'sakana/fugu-ultra',
  'meta/muse-spark-1.1',
])
const PROVIDER_EXACT = new Set([
  'claude-fable-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-opus-4-7',
  'claude-opus-4-6', 'claude-opus-4-5-20251101',
])
const OPEN_EXACT = new Set([
  'gpt-5.6-sol', 'gpt-5.6-luna', 'google/gemini-3.7-flash',
  'meta/muse-spark-1.2', 'meta/muse-spark-1.2-contributor',
  'xai/grok-4.5', 'xai/grok-4.6', 'tencent/hy3-paid', 'tencent/hy3',
  'minimax/minimax-m3-free', 'minimax/minimax-m2.7-free',
])

function normalized(id: string): string { return id.toLowerCase() }

/** Return the lowest official CLI plan group known for this model id. */
export function planGroupForModel(id: string): CommandCodePlanGroup {
  const key = normalized(id)
  if (PROVIDER_EXACT.has(key)) return 'provider'
  if (key.startsWith('claude-')) return 'pro'
  if (PREMIUM_EXACT.has(key)) return 'pro'
  if (OPEN_EXACT.has(key)) return 'go'
  if (key.startsWith('deepseek/') || key.startsWith('moonshotai/') || key.startsWith('zai-org/') || key.startsWith('qwen/') || key.startsWith('stepfun/') || key.startsWith('xiaomi/') || key.startsWith('minimax/') || key.startsWith('minimaxai/') || key.startsWith('thinkingmachines/') || key.startsWith('nvidia/')) return 'go'
  return 'other'
}

const GROUP_LABELS: Readonly<Record<CommandCodePlanGroup, string>> = {
  go: 'Go · open models',
  pro: 'Pro · premium models',
  provider: 'Provider+ · frontier models',
  other: 'Other · verify access',
}

const GROUP_ORDER: readonly CommandCodePlanGroup[] = ['go', 'pro', 'provider', 'other']

/** Group provider candidates without changing their order within a group. */
export function groupCommandCodeModels(models: readonly CommandCodeModelConfig[]): CommandCodeModelGroup[] {
  const groups = new Map<CommandCodePlanGroup, CommandCodeModelConfig[]>()
  for (const model of models) {
    const group = planGroupForModel(model.id)
    const items = groups.get(group) ?? []
    items.push(model)
    groups.set(group, items)
  }
  return GROUP_ORDER.flatMap(id => {
    const items = groups.get(id)
    return items === undefined ? [] : [{ id, label: GROUP_LABELS[id], models: items }]
  })
}
