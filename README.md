# dsh-llm-commandcode

A DeepSeek Harness plugin for the Command Code Provider API.

## Features

- One commandcode provider route.
- OpenAI Chat Completions for GPT and open-model ids.
- Anthropic Messages for Claude ids; all other ids use OpenAI Chat Completions. The rule is fixed, while serialization, SSE, tool-call replay, attachments, and reasoning are delegated to DSH PiAiAdapter.
- Live model discovery from GET /provider/v1/models.
- Exact provider-advertised context_length values; capacities are not rounded to 1M.
- A Host-side account quota panel showing credits, 5-hour/weekly windows, plan, and refresh time.
- Optional x-cmd-zdr: 1 request header.

## Installation

DeepSeek Harness 0.1.1-rc.2 or later is required. Install from GitHub:

    dsh plugin --profile web add github:NOirBRight/dsh-llm-commandcode#v0.1.0
    dsh web

The repository tracks release-ready lib artifacts, so GitHub installation needs no build-script allowlist. A source checkout can use a link installation after running `pnpm run build`.

Use the lab profile and port 3082 for local development. Do not link this checkout into production 3080.

## Configuration

The Settings → LLM Providers → Command Code card stores the API key through the DSH credentials service. The provider page is shared: if this is the first provider plugin, it creates the left-side LLM Providers entry; otherwise it joins the existing section. Model discovery is public and sends neither an endpoint nor a key through RPC. Quota resolves the saved credential only on the Host; the custom browser RPC never carries it. The default credential reference is COMMANDCODE_API_KEY; configure apiKeyEnv as CMD_API_KEY if needed.

    - id: llm-commandcode
      name: dsh-llm-commandcode
      config:
        apiKeyEnv: COMMANDCODE_API_KEY
        usageEnabled: true
        zeroDataRetention: false

The only visible Provider API URL is the fixed, read-only official https://api.commandcode.ai/provider/v1 endpoint; quota calls use the same fixed official origin and do not expose a second URL. Fetch models opens an overlay grouped by Go/Pro/Provider+ subscription tiers; select models and press Add selected. The catalog supports expanded details, drag reordering, removal, official effort options, and explicit saved defaults: GLM-5.3 Flash/DeepSeek use max, Muse uses its highest level, and GPT follows the local Codex policy.

## Quota panel

Chat uses documented Provider API routes. Account quota is separate: Command Code currently exposes the account routes used by its official CLI: /alpha/whoami, /alpha/billing/credits, /alpha/billing/subscriptions, and /alpha/usage/summary. These routes are not documented as a stable Provider API contract.

The plugin queries them only from the Host, never sends the key through browser RPC, treats the report as best-effort/partial, and never blocks chat. Set usageEnabled to false to disable it. The panel displays monthly, purchased, and free credits, rolling windows, plan status, optional cost/tokens, failures, and freshness. ZDR is a request-level no-data-retention option; no model requires it, and an unavailable ZDR upstream may return 422.

## Context policy

The live model list currently contains non-uniform capacities such as 197000, 200000, 256000, 262144, 400000, 500000, 1048576, and 1050000. The plugin preserves them exactly. The default catalog is empty rather than inventing startup capacities; press Fetch models before selecting a model. contextWindowOverride wins over the provider value; the default context is only a fallback for hand-added models.

## Verification

    pnpm test
    pnpm run build
    pnpm run pack:check
    pnpm run lab:check  # requires the existing lab GUI on 127.0.0.1:3082

Provider API documentation: https://commandcode.ai/docs/provider
