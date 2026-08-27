# ADR 0001: One Command Code route with model-level protocol dispatch

- Status: accepted
- Date: 2026-08-26

## Decision

Expose one DSH provider route named commandcode. Each model has an effective wire protocol derived only from its id: claude- uses Anthropic Messages and every other id uses OpenAI Chat Completions.

Implement dispatch through one mixed-protocol pi-ai Provider wrapped by DSH PiAiAdapter. Do not expose commandcode-openai and commandcode-anthropic as separate user-facing routes.

## Context

Command Code documents both OpenAI and Anthropic-compatible endpoints, while its live model list does not include a protocol field. A single picker group is preferable, but each model must use the endpoint family that accepts it.

The declarative dsh-llm-pi-ai profile has a route-level api field, but the underlying pi-ai createProvider interface supports an implementation map keyed by each model's api. The plugin uses that deeper interface through PiAiAdapter.

## Consequences

- One model selector and provider identity are preserved.
- Pi-ai owns serializers, stream translation, tool-call replay, and reasoning; this package tests profile dispatch and Command Code policy.
- Protocol selection is not user-configurable; support for any future exceptional id requires an explicit plugin policy update and test.
