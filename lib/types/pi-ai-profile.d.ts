/** Mixed OpenAI/Anthropic pi-ai profile for the Command Code Provider API. */
import type { Api, Model } from '@earendil-works/pi-ai';
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai';
import type { CommandCodeConnectionOptions, CommandCodeModelConfig } from './types.ts';
/** Anthropic SDK appends /v1/messages; the shared Command Code URL already ends in /v1. */
export declare function anthropicBaseURL(providerBaseURL: string): string;
/** Build one pi-ai model whose api field selects the mixed provider implementation. */
export declare function toCommandCodePiAiModel(model: CommandCodeModelConfig, connection: CommandCodeConnectionOptions): Model<Api>;
/** Build the complete mixed-protocol profile for one immutable options snapshot. */
export declare function createCommandCodePiAiProfile(connection: CommandCodeConnectionOptions): ResolvedPiAiProviderProfile;
//# sourceMappingURL=pi-ai-profile.d.ts.map