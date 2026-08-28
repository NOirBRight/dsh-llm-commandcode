# Changelog

## 0.1.2

- Model catalog visual parity with Codex / OpenCode: expandable rows now strictly match the official Codex / opencode-go layout — Context window on top, Vision / Reasoning / Default thinking on the bottom row, Choose from official catalog trigger, Custom catalog subtitle, shared SortableList and ModelsSection tokens, 32px inputs with chevron.
- Reasoning catalog corrected from official CLI 1.36.0 (dist/cli.mjs BR + yr): meta/muse-spark-1.1/1.2/1.2-contributor moved from low/medium/high (wrong) to low/medium/high/xhigh (default xhigh), matching commandcode.ai model pages / Meta docs configurable reasoning effort and /model ...:xhigh. Adds muse-spark-1.1 entry.
- Provider management hardened: Host-only credential/describe/set via COMMANDCODE_RPC_CHANNEL, hasTokenFields guard on all decoders, remoteManagement flag (loopback-only by default, trusted-host required otherwise), and separate settings-revision fencing.


## 0.1.1

- Add Settings card and model-catalog screenshots
- Align the README with the other provider plugins

## 0.1.0

First release: Command Code Provider API chat for DeepSeek Harness.

- Shared Settings → LLM Providers card with a fixed official Provider API URL
- Claude ids use Anthropic Messages; all other ids use OpenAI Chat Completions via DSH `PiAiAdapter`
- Public model discovery with exact `context_length`; no invented startup catalog
- Official CLI 1.36.0 effort table and explicit saved defaults
- Host-only best-effort quota; API keys stay in DSH credentials
- Optional request-level ZDR (`x-cmd-zdr: 1`)
