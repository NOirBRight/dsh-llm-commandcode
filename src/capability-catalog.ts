/** Current Command Code model capabilities that the public model endpoint omits. */

import type { ModelModality } from '@deepseek-ai/dsh-llm'

const IMAGE_MODELS = new Set([
  'claude-sonnet-5',
  'claude-sonnet-4-6',
  'claude-fable-5-1',
  'claude-fable-5',
  'claude-opus-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-haiku-4-5-20251001',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.3-codex',
  'gpt-5.4-mini',
  'deepseek/deepseek-v4-flash-vision-exp',
  'moonshotai/kimi-k3',
  'moonshotai/kimi-k2.7-code',
  'moonshotai/kimi-k2.7-code-highspeed',
  'moonshotai/kimi-k2.6',
  'moonshotai/kimi-k2.5',
  'z-ai/glm-5.3-flash',
  'minimaxai/minimax-m3',
  'minimax/minimax-m3-free',
  'xiaomi/mimo-v2.5',
  'qwen/qwen3.8-max-0902',
  'qwen/qwen3.8-max',
  'qwen/qwen3.8-27b',
  'qwen/qwen3.8-flash',
  'qwen/qwen3.7-plus',
  'qwen/qwen3.7-flash',
  'qwen/qwen3.6-plus',
  'stepfun/step-3.7-flash',
  'google/gemini-3.8-flash',
  'google/gemini-3.7-flash',
  'google/gemini-3.6-flash',
  'google/gemini-3.5-flash',
  'google/gemini-3.5-flash-lite',
  'google/gemini-3.1-flash-lite',
  'sakana/fugu-ultra',
  'thinkingmachines/inkling',
  'thinkingmachines/inkling-small',
  'meta/muse-spark-1.1',
  'meta/muse-spark-1.2',
  'meta/muse-spark-1.2-contributor',
  'meta/muse-spark-1.3',
  'meta/muse-spark-1.3-contributor',
  'xai/grok-4.5',
])

const NATIVE_REASONING_MODELS = new Set([
  'meituan/longcat-2.0:free',
])

/** Return the provider-advertised text/image input modalities for one id. */
export function inputModalitiesForCommandCodeModel(id: string): ModelModality[] {
  return IMAGE_MODELS.has(id.toLowerCase()) ? ['text', 'image'] : ['text']
}

/** Whether a model reasons by provider default without exposing a selector. */
export function hasNativeReasoningByDefault(id: string): boolean {
  return NATIVE_REASONING_MODELS.has(id.toLowerCase())
}
