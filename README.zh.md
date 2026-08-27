# dsh-llm-commandcode

[English](README.md) | 中文

DeepSeek Harness 的 Command Code Provider API 插件。独立 provider 路由是 `commandcode`，设置命名空间是 `llm-commandcode`。聊天走文档化的 [Provider API](https://commandcode.ai/docs/provider)，序列化交给 DSH `PiAiAdapter`。账户额度是 Host 侧 best-effort，失败不会挡住聊天。

包根入口公开 Cordis plugin contract。同一 artifact 还导出 `./client`，在 Settings → LLM Providers 中提供 Command Code 卡片。

## 安装

需要 DeepSeek Harness 0.1.1-rc.2 或更新版本。直接从 GitHub 安装：

~~~sh
dsh plugin --profile web add github:NOirBRight/dsh-llm-commandcode#v0.1.1
dsh web
~~~

仓库跟踪已构建的 lib 产物，GitHub 安装不需要允许 build 脚本。源码 checkout 在 `pnpm run build` 后可以 link 安装。

本插件之前的共享 LLM Providers section owner 需要对应补丁，PC 网页才能显示 Command Code 卡片：

~~~sh
dsh plugin --profile web add github:NOirBRight/dsh-llm-cursor#v0.2.7
dsh plugin --profile web add github:NOirBRight/dsh-llm-grok#v0.3.1
dsh plugin --profile web add github:NOirBRight/dsh-llm-codex#v0.3.1
dsh plugin --profile web add github:NOirBRight/dsh-llm-ollama#v0.6.8
~~~

## Web 配置

打开 Settings → LLM Providers → Command Code。单独安装时会创建左侧 LLM Providers；已有其他 provider 时加入同一 section。API key 通过 DSH credentials 存到 `COMMANDCODE_API_KEY`（需要时可把 `apiKeyEnv` 设为 `CMD_API_KEY`）。Host 不会把已存明文返回给浏览器。

唯一可见的 Provider API 地址是固定只读的官方 `https://api.commandcode.ai/provider/v1`。模型发现是公开 GET，不带 endpoint 也不带 key。额度也打这个官方 origin，而且只在 Host 解析凭据；自定义浏览器 RPC 从不携带密钥。

**Zero data retention** 是请求级开关。勾选后聊天请求会带 `x-cmd-zdr: 1`。没有模型强制需要它；没有可用 ZDR upstream 时可能返回 HTTP 422。

![Command Code 连接、可选 ZDR 与账户额度](docs/images/plugin-card.png)

目录默认折叠。**Fetch models** 打开按 Go / Pro / Provider+ 分组的 overlay，勾选后再加入。每一行可展开上下文、最大输出和官方 effort；拖动排序，垃圾桶删除。保存的默认值：GLM-5.3 Flash 和所有 DeepSeek 用 `max`；Muse 用已发布的最高档；GPT 对齐本地 Codex（Sol `high`、Terra `xhigh`、Luna `max`，其余 GPT 优先 `xhigh`，非法档位回退）。有效的已存覆盖优先。

![可排序的 Command Code 模型目录与官方 effort 选项](docs/images/model-catalog.png)

默认目录为空，不会伪造启动容量；选模型前请先 Fetch models。`contextWindowOverride` 覆盖实时 `context_length`；默认上下文只给手工添加的行做 fallback。

Cordis 配置（卡片写入同一组字段）：

    - id: llm-commandcode
      name: dsh-llm-commandcode
      config:
        apiKeyEnv: COMMANDCODE_API_KEY
        usageEnabled: true
        zeroDataRetention: false

## 聊天协议

协议按模型 id 固定，不能在卡片上改：

- `claude-*` → `POST /provider/v1/messages`（Anthropic Messages）
- 其余 id → `POST /provider/v1/chat/completions`（OpenAI Chat Completions）

序列化、SSE、工具、附件和 reasoning 都走 DSH `PiAiAdapter`。卡片没有 Image input 开关；有视觉能力的模型沿用发现到的 modalities。

## 账户额度

额度与聊天分离。Host 按官方 CLI 的非公开账户接口 best-effort 请求 `https://api.commandcode.ai` 上的 `/alpha/whoami`、`/alpha/billing/credits`、`/alpha/billing/subscriptions`、`/alpha/usage/summary`。失败不影响聊天。`usageEnabled: false` 可关掉面板。

卡片显示账户名、套餐、月度/购买/free credits、5 小时和每周窗口，以及可用的周期成本/tokens 和刷新时间。

## 验证

~~~sh
pnpm test
pnpm run build
pnpm run pack:check
pnpm run lab:check   # 需要现有 127.0.0.1:3082 lab GUI
~~~

Provider API 文档：https://commandcode.ai/docs/provider
