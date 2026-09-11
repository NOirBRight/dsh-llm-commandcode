# Architecture

## One public route, two wire protocols

The plugin owns one DSH route named commandcode. Ids beginning with claude- always use Anthropic Messages; all other ids always use OpenAI Chat Completions. The model schema has no protocol override.

The public CommandCodeAdapter is a thin provider-specific wrapper over DSH's PiAiAdapter. Its internal pi-ai Provider is mixed-protocol: every model carries its own api field, and createProvider dispatches to openAICompletionsApi or anthropicMessagesApi. Pi-ai owns message serialization, SSE, tool-call identity/replay, attachments, usage, cancellation, and reasoning. Discovery and quota remain independent Command Code modules.

The single user-facing Provider API URL is fixed and read-only at https://api.commandcode.ai/provider/v1. OpenAI models use it directly; the profile strips the trailing /v1 for Anthropic SDK models because that SDK appends /v1/messages. Both therefore reach the documented Command Code paths without exposing two settings.

The client contributes only the keyed `settings.provider.item` entry with key `llm-commandcode`. `dsh-llm-providers-ui` owns the `settings.section` entry with id `providers`, its navigation row, and the `llm-providers` order namespace. Command Code observes the public slot registry for a missing-owner diagnostic; it never creates or orders the shared page. The Host route does not depend on the Web owner.

## Context source

The Provider model endpoint is the runtime source for metadata. context_length is copied exactly into the catalog and then into LlmResolvedModelInfo.context.contextWindow. Discovery and resolution use the same catalog generation. A visible user override is the only normal way to replace it; missing discovery metadata is never silently changed to 1M.

## Capability overlay seam

The Provider model endpoint lists ids and `context_length` only; it carries no modality, effort, or default-thinking fields. Two sources fill that gap, in priority order: the official `command-code` CLI model table, snapshotted in `capability-catalog.ts` and `reasoning-catalog.ts`, and — for ids the table does not describe — the public models.dev document, read by the Host-only `models-dev.ts` overlay and matched on the exact same id (OpenRouter preferred, then other providers). An id neither source describes keeps text-only input and no effort selector: unknown is never upgraded to a guess.

The overlay is a Host module and never enters the client bundle. Its parsed result is cached in memory and on disk for a day, and Fetch re-reads it once when the listing contains an id no source describes. The persisted `thinkingEfforts` field on a model row is how an overlay-filled selector survives a settings save.

## Quota seam

The Provider API documents model listing and model calls, not account balance. The quota reader is a separate Host module. It calls the account routes currently used by the official Command Code CLI and returns a redacted snapshot through the loopback Command Connection channel. It is advisory: quota availability cannot affect provider registration or chat.
