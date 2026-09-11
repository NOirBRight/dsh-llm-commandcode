/** Current Command Code model capabilities that the public model endpoint omits. */
import type { ModelModality } from '@deepseek-ai/dsh-llm';
/** Return the provider-advertised text/image input modalities for one id. */
export declare function inputModalitiesForCommandCodeModel(id: string): ModelModality[];
/** Whether a model reasons by provider default without exposing a selector. */
export declare function hasNativeReasoningByDefault(id: string): boolean;
//# sourceMappingURL=capability-catalog.d.ts.map