## v0.1.29

跟随 providers-ui 0.2.7 重建：缓存读出的 windows 也会按 5 小时 → 周 → 月重排，刷新页面不再沿用 localStorage 里的旧顺序。

## v0.1.28

跟随 providers-ui 0.2.6 重建：额度窗口顺序 5 小时 → 周 → 月。

## v0.1.27

重建客户端 bundle 与 lockfile。

v0.1.26 只改了 package.json 钉 0.2.4，没有提交 `lib/client.js` / `pnpm-lock.yaml`，运行时仍是旧月度解码器。本次针对 providers-ui 0.2.5 重装并重建，月度窗口带上 `currentPeriodEnd`。

## v0.1.26

跟随 providers-ui 0.2.4 重建：月度窗口带上订阅 `currentPeriodEnd`，详情页显示官方同款月重置时间。

## v0.1.25

- 详情页改用共享模板 `ProviderDetail`（由设置页通过 slot 上下文下发，插件不再自带模板与样式）。
- 模型行交给模板渲染：`items`（行数据）+ `extra`（该行的上下文窗口、能力勾选、默认思考等级等私有字段），插件不再画行卡片；行内字段固定列槽、排序态只读并收起、单层圆角。
- 详情模式下插件不再自行请求额度（`props.mode === 'detail'` 时直接返回），额度由设置页的共享缓存提供，右上角刷新走 `props.onRefresh`。
- 高级设置按原型：分隔线区块 + 折叠箭头 + 右侧说明，选项为「复选框 + 缩进说明」。
- 移动端：工具栏与标题同一行（无换行、无溢出），窄屏自动收紧。
- 依赖 `dsh-llm-providers-ui` 升级到 `0.2.0`（破坏性接口：必须使用 slot 下发的 `template`/`copy` 与 `items`/`extra`）。

## v0.1.24

- 详情页改用共享模板 `ProviderDetail`（由设置页通过 slot 上下文下发，插件不再自带模板与样式）。
- 模型行交给模板渲染：`items`（行数据）+ `extra`（该行的上下文窗口、能力勾选、默认思考等级等私有字段），插件不再画行卡片；行内字段固定列槽、排序态只读并收起、单层圆角。
- 详情模式下插件不再自行请求额度（`props.mode === 'detail'` 时直接返回），额度由设置页的共享缓存提供，右上角刷新走 `props.onRefresh`。
- 高级设置按原型：分隔线区块 + 折叠箭头 + 右侧说明，选项为「复选框 + 缩进说明」。
- 移动端：工具栏与标题同一行（无换行、无溢出），窄屏自动收紧。
- 依赖 `dsh-llm-providers-ui` 升级到 `0.2.0`（破坏性接口：必须使用 slot 下发的 `template`/`copy` 与 `items`/`extra`）。

## v0.1.23

- 详情页改用共享模板 `ProviderDetail`（由设置页通过 slot 上下文下发，插件不再自带模板与样式）。
- 模型行交给模板渲染：`items`（行数据）+ `extra`（该行的上下文窗口、能力勾选、默认思考等级等私有字段），插件不再画行卡片；行内字段固定列槽、排序态只读并收起、单层圆角。
- 详情模式下插件不再自行请求额度（`props.mode === 'detail'` 时直接返回），额度由设置页的共享缓存提供，右上角刷新走 `props.onRefresh`。
- 高级设置按原型：分隔线区块 + 折叠箭头 + 右侧说明，选项为「复选框 + 缩进说明」。
- 移动端：工具栏与标题同一行（无换行、无溢出），窄屏自动收紧。
- 依赖 `dsh-llm-providers-ui` 升级到 `0.2.0`（破坏性接口：必须使用 slot 下发的 `template`/`copy` 与 `items`/`extra`）。

# Changelog

## [0.1.22] - 2026-09-10

### Added

- DeepSeek V4.1 Flash: vision plus `low`/`high`/`max` (default `max`), from the official `command-code@1.53.0` model table.
- Fill ids the CLI table does not describe from models.dev same-id rows, preferring OpenRouter; ids no source describes stay unknown rather than guessed.
- Persisted `thinkingEfforts` so an overlay-filled model keeps its effort selector across a save.

### Fixed

- A saved `defaultEffort` the current table no longer offers is dropped instead of failing config validation. Previously one unknown model made the whole provider card unreadable until the settings file was edited by hand.
- Fetch no longer waits on a slow models.dev dump, and refreshes a warm overlay once when the listing contains an id no source describes.
- Missing-owner diagnostic uses `COMMANDCODE_SETTINGS_NAMESPACE` and waits out a 15s grace window so a late `providers` section registration is not a false alarm.
- Card `fetchUsage` purges the shared quota cache when the Host answers `INVALID_CREDENTIAL`, so a rejected or absent key cannot keep the previous account's headline.

### Changed

- DSH peer/dev declarations and verified runtimes include `0.1.5-rc.1` alongside Alpha.4 and `0.1.2-rc.1`.

## [0.1.21] - 2026-09-09

- Advertise image input for `xai/grok-4.6`.

## [0.1.20] - 2026-09-07

### Changed

- Adopt the shared provider-ui header from `dsh-llm-providers-ui` 0.1.10; remove the per-provider header fork.
- Header quota loads collapsed with idle dedup so expansion never refires; a failed read shows a truthful unavailable dash, never a fabricated percent.
- Development dependency now points at the final `dsh-llm-providers-ui` 0.1.10 release URL with pinned integrity.

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
