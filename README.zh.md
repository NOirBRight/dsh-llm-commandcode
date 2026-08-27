# dsh-llm-commandcode

DeepSeek Harness 的 Command Code Provider API 插件。

## 能力

- 一个 commandcode provider route。
- GPT/OSS 模型使用 OpenAI Chat Completions。
- Claude 模型固定使用 Anthropic Messages，其余模型固定使用 OpenAI Chat Completions；聊天序列化、SSE、tool-call replay、附件和 reasoning 委托给 DSH PiAiAdapter。
- 从 GET /provider/v1/models 获取实时模型。
- 使用 Provider 返回的精确 context_length，不把模型统一当成 1M。
- Host 侧额度面板显示 credits、5 小时/每周窗口、套餐和刷新时间。
- 可选发送 x-cmd-zdr: 1。

## 安装

需要 DeepSeek Harness 0.1.1-rc.2 或更新版本。从 GitHub 安装：

    dsh plugin --profile web add github:NOirBRight/dsh-llm-commandcode#v0.1.0
    dsh web

仓库跟踪已构建的 lib 产物，GitHub 安装不需要允许 build 脚本。源码 checkout 在 `pnpm run build` 后可以 link 安装。

本地开发只使用 ~/.dsh-lab 和 3082；不要把 checkout link 到生产 3080。

## 配置

在 设置 → LLM Providers → Command Code 中填写 API key。Provider 页面是共享的：单独安装本插件时会创建左侧 LLM Providers 入口，与其他 provider 一起安装时加入已有 section。密钥通过 DSH credentials service 保存；模型发现是公开请求，RPC 不携带 endpoint 或密钥；额度只在 Host 解析已保存凭据。默认 credential reference 是 COMMANDCODE_API_KEY。

    - id: llm-commandcode
      name: dsh-llm-commandcode
      config:
        apiKeyEnv: COMMANDCODE_API_KEY
        usageEnabled: true
        zeroDataRetention: false

唯一可见的 Provider API 地址固定为只读的官方 https://api.commandcode.ai/provider/v1；额度接口也使用内部固定的官方 origin，不暴露第二个地址。点击“获取模型”会打开 overlay，按 Go/Pro/Provider+ 订阅分组，勾选后点击“加入所选”；目录支持展开详情、拖动排序、删除、官方 effort 选项，以及明确保存的默认值：GLM-5.3 Flash/DeepSeek 使用 max，Muse 使用最高等级，GPT 对齐本地 Codex 策略。

## 额度面板

聊天使用公开 Provider API。账户额度复用官方 CLI 当前使用的 /alpha/whoami、/alpha/billing/credits、/alpha/billing/subscriptions、/alpha/usage/summary。这些 alpha 接口不是 Provider API 文档承诺的稳定公共 contract。

插件只在 Host 查询，额度读取是 best-effort，失败不会影响聊天；usageEnabled: false 可以关闭。面板显示月度/购买/free credits、5 小时和每周窗口、套餐、可用的周期成本/tokens，以及刷新时间。ZDR 只是请求级的零数据留存开关，没有特定模型强制需要；开启后若没有可用 ZDR upstream，Provider 可能返回 422。

## 上下文策略

当前目录包含 197000、200000、256000、262144、400000、500000、1048576、1050000 等不同值。插件保留原值；默认目录为空，不会伪造启动容量，选择模型前请点击“获取模型”。contextWindowOverride 优先，否则使用最近一次 Provider 值。默认上下文只用于手工模型的 fallback。

## 验证

    pnpm test
    pnpm run build
    pnpm run pack:check
    pnpm run lab:check  # 需要现有 127.0.0.1:3082 lab GUI

Provider API 文档：https://commandcode.ai/docs/provider
