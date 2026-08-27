import { BlockAssembler } from '@deepseek-ai/dsh-llm'
import type { Context } from '@deepseek-ai/cordis'
import type { FinishReason, GenerateOptions, Message, TokenUsage } from '@deepseek-ai/dsh-llm'

export interface AssembledResult { message: Message; usage?: TokenUsage; finish: FinishReason }

export async function assemble(ctx: Context, options: Omit<GenerateOptions, 'provider'>): Promise<AssembledResult> {
  const assembler = new BlockAssembler()
  const request = { provider: 'commandcode', ...options }
  for await (const chunk of ctx.llm.stream(request)) assembler.push(chunk)
  return {
    message: assembler.message({ kind: 'model', provider: request.provider, model: request.model, ...(assembler.replayState === undefined ? {} : { replayState: assembler.replayState }) }),
    ...(assembler.usage === undefined ? {} : { usage: assembler.usage }),
    finish: assembler.finish,
  }
}
