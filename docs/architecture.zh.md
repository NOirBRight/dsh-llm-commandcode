# 架构

## 一个 route、两种 wire protocol

插件只注册 commandcode route。claude- 开头的 id 始终使用 Anthropic Messages，其余始终使用 OpenAI Chat Completions；模型 schema 不提供协议覆盖。

公开的 CommandCodeAdapter 是 DSH PiAiAdapter 的 provider 专用薄封装。内部 pi-ai Provider 为 mixed-protocol：每个模型携带自己的 api，createProvider 分发到 openAICompletionsApi 或 anthropicMessagesApi。消息序列化、SSE、tool-call 身份/replay、附件、usage、取消和 reasoning 均由 pi-ai 负责；发现和额度仍是独立的 Command Code 模块。

用户只能看到固定只读的官方 Provider API 地址 https://api.commandcode.ai/provider/v1。OpenAI 模型直接使用；Anthropic SDK 固定追加 /v1/messages，因此 profile 会在内部去掉末尾 /v1，两者最终都命中文档规定的 Command Code 路径。

Client 只向 `settings.provider.item` 注册 key 为 `llm-commandcode` 的 keyed entry。`dsh-llm-providers-ui` 独占 `id: providers` 的 `settings.section`、导航行和 `llm-providers` 排序命名空间。Command Code 通过公开 slot registry 观察 owner 缺失并输出诊断；不会创建或排序共享页面。Host 路由不依赖 Web owner。

## 上下文来源

Provider 模型接口的 context_length 是运行时元数据来源，原值复制到 catalog，再复制到 LlmResolvedModelInfo.context.contextWindow。discovery 和 resolution 使用同一代 catalog；用户 override 明确可见，缺少字段时不会偷偷填 1M。

## 额度 seam

Provider API 没有账户余额接口。额度读取是独立的 Host 模块，查询官方 CLI 当前使用的账户路径，通过 loopback Command Connection 返回脱敏 snapshot。它是 advisory 能力：额度服务不可用时，provider 注册和聊天仍然正常。
