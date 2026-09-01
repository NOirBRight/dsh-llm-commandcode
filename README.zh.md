# dsh-llm-commandcode

[English](README.md) | 中文

DeepSeek Harness 的 Command Code Provider API 插件。独立 provider 路由是 `commandcode`，设置命名空间是 `llm-commandcode`。聊天走文档化的 [Provider API](https://commandcode.ai/docs/provider)，序列化交给 DSH `PiAiAdapter`。账户额度是 Host 侧 best-effort，失败不会挡住聊天。

包根入口公开 Cordis plugin contract。同一 artifact 还导出 `./client`，在 Settings → LLM Providers 中提供 Command Code 卡片。

## 安装

需要 DeepSeek Harness `0.1.2-alpha.1` 或更新版本。直接从 GitHub 安装：

~~~sh
dsh plugin --profile web add github:NOirBRight/dsh-llm-commandcode#v0.1.16
dsh web
~~~

仓库跟踪已构建的 lib 产物，GitHub 安装不需要允许 build 脚本。源码 checkout 在 `pnpm run build` 后可以 link 安装。

## Connection 信任与认证

设置、凭据、发现和额度 RPC 都通过 DSH `Connection` 注册。Connection 在分派 RPC 前统一执行 Host/Origin 信任策略和浏览器认证；本插件没有可削弱这些检查的 provider 专用开关。

非回环访问时，请在启动 DSH Web 时显式信任所有需要的浏览器主机，完成 Connection 浏览器认证流程，并使用已认证会话：

~~~sh
dsh web --trusted-host 192.168.50.75 --trusted-host dsh.noirbright.top
~~~

trusted-host 列表只建立 Host/Origin 策略，不代表已授予未认证访问。如果不希望暴露远程入口，请使用 SSH 隧道并打开 loopback 地址：

~~~sh
ssh -L 3080:127.0.0.1:3080 user@host
~~~

## Web 配置

请将 `dsh-llm-providers-ui` 与本插件一起安装，然后打开 Settings → LLM Providers → Command Code。本插件只贡献 keyed card；页面、导航和共享排序存储由 owner 提供。未安装 owner 时，Host 路由仍可工作，但 Web 页面和卡片不会显示，并会输出控制台诊断。API key 通过 DSH credentials 存到 `COMMANDCODE_API_KEY`（需要时可把 `apiKeyEnv` 设为 `CMD_API_KEY`）。Host 不会把已存明文返回给浏览器。

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

## 凭据处理

API key 只在浏览器输入，由 Host credentials service 保存；provider RPC 只返回 `{ configured, writable }`，永不返回密钥。设置读取、保存、模型发现、额度和凭据写入都走 provider management RPC。

已认证的 Connection 会话保护这些管理操作。设置 revision fence 与凭据保存是分开的操作，不会虚假宣称跨存储原子性。

## 账户额度

额度与聊天分离。Host 按官方 CLI 的非公开账户接口 best-effort 请求 `https://api.commandcode.ai` 上的 `/alpha/whoami`、`/alpha/billing/credits`、`/alpha/billing/subscriptions`、`/alpha/usage/summary`。失败不影响聊天。`usageEnabled: false` 可关掉面板。

卡片显示账户名、套餐、月度/购买/free credits、5 小时和每周窗口，以及可用的周期成本/tokens 和刷新时间。

## 验证

~~~sh
pnpm test
pnpm run typecheck
pnpm run build
pnpm run pack:check
pnpm run lab:check   # 需要现有 127.0.0.1:3082 lab GUI
~~~

Provider API 文档：https://commandcode.ai/docs/provider

## LLM Providers UI ownership

**LLM 供应商**设置页（`settings.section` `id: providers` 及子槽 `settings.provider.item`）与共享的 `llm-providers` 排序存储完全由 `dsh-llm-providers-ui` 拥有。

- 本插件仅贡献自己的卡片（`key: llm-commandcode`）和 Host 上的 `llm` 路由；不安装页面或共享命名空间。加载顺序不影响归属。
- 未安装 owner 时（Headless 或 Web 未装 `dsh-llm-providers-ui`）：Host 侧模型路由 `commandcode` 仍可工作；Web 侧 Providers 页面与本卡片不显示，并在浏览器控制台提示缺少 owner。正式 Web 发版的组合测试会拒绝缺少 owner 的图。
- 导航地球图标为 `alpha.1` 临时 DOM 适配器，仅由 `dsh-llm-providers-ui` 持有；本插件不含该适配。

请在 profile 中与 provider 插件一起显式安装 `dsh-llm-providers-ui`（见其 `cordis.patch.yml`）。


## 正式版安装（Latest）

Command Code Provider API chat, model discovery, credentials, and quota reporting. 正式成品只支持 DeepSeek Harness 0.1.2-alpha.1；发布包只包含构建后的 Host/Client 产物，不包含兄弟仓库源码、本机路径或 link:/workspace: 依赖。

LLM Providers 页面、导航和共享排序由 dsh-llm-providers-ui 独占；本插件只提供卡片、模型和 Host 路由。Web 必须先装 Owner，headless 只使用 Host 路由时可以不装 Owner。

Owner（Latest）：

~~~sh
dsh plugin --profile web add --force \
  https://github.com/NOirBRight/dsh-llm-providers-ui/releases/latest/download/dsh-llm-providers-ui.tgz
~~~

本 Provider（Latest）：

~~~sh
dsh plugin --profile web add --force \
  https://github.com/NOirBRight/dsh-llm-commandcode/releases/latest/download/dsh-llm-commandcode.tgz
~~~

固定版本（可复现）：

~~~sh
dsh plugin --profile web add --force \
  https://github.com/NOirBRight/dsh-llm-providers-ui/releases/download/v0.1.2/dsh-llm-providers-ui.tgz
dsh plugin --profile web add --force \
  https://github.com/NOirBRight/dsh-llm-commandcode/releases/download/v0.1.16/dsh-llm-commandcode.tgz
~~~

更新、卸载与验证：

~~~sh
# 更新到最新 Release
dsh plugin --profile web add --force \
  https://github.com/NOirBRight/dsh-llm-commandcode/releases/latest/download/dsh-llm-commandcode.tgz
# 验证加载与版本
dsh plugin --profile web list
dsh plugin --profile web doctor
# 只卸载本插件
dsh plugin --profile web remove dsh-llm-commandcode
~~~

配置入口：Web 使用「设置」中的本插件页面；Host-only 插件使用 profile 的 dsh.profile.bundles 配置。先复制本 README 的最小 YAML/JSON 示例，再填写凭据或后端地址。

回滚：重新执行固定版本 v0.1.16 命令，确认插件列表后只重启一次 Web 服务。失败时查看 journalctl --user -u dsh-web.service 与 dsh plugin --profile web doctor，不要把源码 checkout 写入 production profile。

Release 与完整性：[v0.1.16](https://github.com/NOirBRight/dsh-llm-commandcode/releases/tag/v0.1.16) · [SHA256SUMS](https://github.com/NOirBRight/dsh-llm-commandcode/releases/download/v0.1.16/SHA256SUMS)。
