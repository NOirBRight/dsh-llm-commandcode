# Changelog
## [0.1.19] - 2026-09-03

### Changed

- DSH compatibility declarations cover the verified Alpha.4 and rc.1 runtimes.
- Unknown runtimes warn once and use the normal best-effort mount path; only reproduced failures may be blocklisted.


## 0.1.18 - 2026-09-03

- Add Fable 5.1, DeepSeek V4 Flash Fast, Qwen 3.8, LongCat 2.0, Hy4 Preview, Gemini 3.8 Flash, and Muse Spark 1.3 models from the live Provider API and `command-code@1.44.0` capability catalog.
- Correct current model context and vision metadata while preserving explicit names, context overrides, and existing GPT/Grok effort tables and defaults.
- Configure both Muse Spark 1.3 routes for `low/medium/high/xhigh/max` with default `max`; retain native LongCat reasoning without inventing an effort selector.

## 0.1.15

- Settings → LLM Providers: drag cards to reorder; chat picker follows `llm-providers.order` via dsh-llm-providers-ui.


## 0.1.14

- Filter impossible sandbox escalation enums before the provider request (scan both system and context-injected messages). Both direct and prepared streams now narrow `sandbox_permissions` to strictly wider modes and drop `justification` when none remain; immutable and tested for all modes.

## 0.1.13

- Support the DSH 0.1.2-alpha.1 Host image-pricing call with neutral heuristic pricing
- Restore published-RC and alpha1 client build compatibility
- Add frozen-install CI and built-adapter release checks

## 0.1.11

- Unify model catalog to opencode baseline (Context first row, Vision/Reasoning/Default thinking second row, 32/36px)
- fix thinking persistence

## 0.1.3

- Unify model catalog to opencode baseline (Context first row, Vision/Reasoning/Default thinking second row, 32/36px) - fix thinking persistence

## 0.3.2

- Unify model catalog to opencode baseline (Context first row, Vision/Reasoning/Default thinking second row, 32/36px), fix thinking persistence

## 0.1.2

- Model catalog visual parity with Codex / OpenCode: expandable rows now strictly match the official Codex / opencode-go layout — Context window on top, Vision / Reasoning / Default thinking on the bottom row, Choose from official catalog trigger, Custom catalog subtitle, shared SortableList and ModelsSection tokens, 32px inputs with chevron.
- Reasoning catalog corrected from official CLI 1.36.0 (dist/cli.mjs BR + yr): meta/muse-spark-1.1/1.2/1.2-contributor moved from low/medium/high (wrong) to low/medium/high/xhigh (default xhigh), matching commandcode.ai model pages / Meta docs configurable reasoning effort and /model ...:xhigh. Adds muse-spark-1.1 entry.
- Provider management hardened: Host-only credential/describe/set via COMMANDCODE_RPC_CHANNEL, hasTokenFields guard on all decoders, authenticated Connection trust policy, and separate settings-revision fencing.


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
