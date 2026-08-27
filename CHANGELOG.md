# Changelog

## 0.1.0

First release: Command Code Provider API chat for DeepSeek Harness.

- Shared Settings → LLM Providers card with a fixed official Provider API URL
- Claude ids use Anthropic Messages; all other ids use OpenAI Chat Completions via DSH `PiAiAdapter`
- Public model discovery with exact `context_length`; no invented startup catalog
- Official CLI 1.36.0 effort table and explicit saved defaults
- Host-only best-effort quota; API keys stay in DSH credentials
- Optional request-level ZDR (`x-cmd-zdr: 1`)
