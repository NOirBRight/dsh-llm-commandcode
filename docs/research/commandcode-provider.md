# Command Code Provider research

Research date: 2026-08-26

## Public Provider API

- Provider documentation: https://commandcode.ai/docs/provider
- OpenAI chat: POST https://api.commandcode.ai/provider/v1/chat/completions
- Anthropic messages: POST https://api.commandcode.ai/provider/v1/messages
- Models: GET https://api.commandcode.ai/provider/v1/models
- Authentication: Bearer API key; Anthropic clients may also use x-api-key.
- ZDR: x-cmd-zdr: 1.
- Streaming is SSE; OpenAI examples enable stream_options.include_usage.

The live unauthenticated model response sampled on this date was OpenAI-shaped with 60 entries. Each entry included id, name, and context_length; no max-output, modality, reasoning, or plan-access fields were present. Observed context values included 197000, 200000, 256000, 262000, 262144, 400000, 500000, 1048576, and 1050000.

## Effort metadata

The public models endpoint does not expose effort levels. The official command-code@1.36.0 CLI bundle carries a hard-coded model table with reasoningEfforts. The plugin snapshots that exact table and derives selectable levels by model id at runtime; no configurable or persisted effort list can override it. Current examples: z-ai/glm-5.3-flash and zai-org/GLM-5.3 use low/high/max; DeepSeek V4 Pro/Flash/Vision use high/max; Claude Sonnet/Opus and GPT-5.6 use low/medium/high/xhigh/max. The CLI does not publish a separate default field, so the plugin materializes explicit deployment defaults: GLM-5.3 Flash and all DeepSeek models use max; Muse models use their highest supported level; GPT defaults match the local Codex plugin (Sol high, Terra xhigh, Luna max, other GPT models prefer xhigh with a valid-level fallback).

Source artifact: https://registry.npmjs.org/command-code/-/command-code-1.36.0.tgz

## Account quota routes

The Provider documentation does not publish an account-balance endpoint. The official command-code@1.33.0 CLI bundle contains these authenticated routes relative to https://api.commandcode.ai:

1. GET /alpha/whoami — current user/org.
2. GET /alpha/billing/credits?orgId=<org id> — monthly, purchased, free credits and optional window limits.
3. GET /alpha/billing/subscriptions?orgId=<org id> — plan and billing-period facts.
4. GET /alpha/usage/summary?orgId=<org id>&since=<period start> — aggregate cost/usage facts.

Source artifact: https://registry.npmjs.org/command-code/-/command-code-1.33.0.tgz
Studio documentation: https://commandcode.ai/docs/studio

Anonymous probes returned 401 for all four account routes and 200 for the public model list. No key was read or logged during research.

## Posture

Quota is Host-only, best-effort, redacted, short-lived, and non-blocking. If the alpha routes change or disappear, model discovery and chat continue. The runtime does not depend on the Command Code CLI or its private auth file.
