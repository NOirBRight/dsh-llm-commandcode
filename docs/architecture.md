# Architecture

## One public route, two wire protocols

The plugin owns one DSH route named commandcode. Ids beginning with claude- always use Anthropic Messages; all other ids always use OpenAI Chat Completions. The model schema has no protocol override.

The public CommandCodeAdapter is a thin provider-specific wrapper over DSH's PiAiAdapter. Its internal pi-ai Provider is mixed-protocol: every model carries its own api field, and createProvider dispatches to openAICompletionsApi or anthropicMessagesApi. Pi-ai owns message serialization, SSE, tool-call identity/replay, attachments, usage, cancellation, and reasoning. Discovery and quota remain independent Command Code modules.

The single user-facing Provider API URL is fixed and read-only at https://api.commandcode.ai/provider/v1. OpenAI models use it directly; the profile strips the trailing /v1 for Anthropic SDK models because that SDK appends /v1/messages. Both therefore reach the documented Command Code paths without exposing two settings.

The client follows the provider-plugin convention: it claims the shared settings.provider.item slot and calls ensureProviderSection. A standalone install creates the providers settings section and left navigation row; when another provider already owns that row, Command Code only contributes its keyed card. Existing local provider bundles include llm-commandcode in their shared display order so the first owner still renders it.

## Context source

The Provider model endpoint is the runtime source for metadata. context_length is copied exactly into the catalog and then into LlmResolvedModelInfo.context.contextWindow. Discovery and resolution use the same catalog generation. A visible user override is the only normal way to replace it; missing discovery metadata is never silently changed to 1M.

## Quota seam

The Provider API documents model listing and model calls, not account balance. The quota reader is a separate Host module. It calls the account routes currently used by the official Command Code CLI and returns a redacted snapshot through the loopback Command Connection channel. It is advisory: quota availability cannot affect provider registration or chat.
