# new-api 平台功能与使用指南

> 本文档基于源码分析整理，介绍 **new-api**（QuantumNous 出品）平台的全部核心功能模块、对外接口与典型使用方式，作为开发者与运维的快速参考。

---

## 一、平台定位

new-api 是一款**新一代 LLM 网关与 AI 资产管理系统**，将 40+ 上游 AI 厂商（OpenAI / Anthropic Claude / Google Gemini / Azure / AWS Bedrock / Vertex / xAI / DeepSeek / Moonshot / 智谱 / 阿里 / 百度 / 腾讯 / 讯飞 / Cohere / Mistral / Perplexity / SiliconFlow / Coze / Dify / Ollama / 火山 / Midjourney / Suno / Jimeng / Kling 等）聚合到统一 API 后面，并在其上提供：

- 统一的 OpenAI / Anthropic / Gemini 兼容入口
- 用户、令牌、用户组、邀请、签到
- 配额、按量计费、分级表达式计费、订阅、充值、兑换码
- 渠道（上游）管理、自动测试、自动余额刷新、模型同步
- 调用日志、用量看板、排行榜、性能指标
- 管理后台 Web Dashboard（默认主题 + 经典主题）

技术栈：**Go 1.22+ / Gin / GORM v2** + **React 19 / TypeScript / Rsbuild / Base UI / Tailwind**，存储兼容 **SQLite / MySQL ≥ 5.7.8 / PostgreSQL ≥ 9.6**，缓存使用 Redis + 进程内存缓存。

---

## 二、平台功能清单

### 1. 多协议 LLM 中继网关

| 类型 | 兼容入口 | 说明 |
| --- | --- | --- |
| OpenAI Chat / Completion | `POST /v1/chat/completions`, `/v1/completions` | 流式 / 非流式 |
| OpenAI Responses API | `/v1/responses` | 含工具调用、Reasoning |
| OpenAI Embeddings | `/v1/embeddings` | |
| OpenAI Images / Audio / Moderations / Rerank | `/v1/images/*`, `/v1/audio/*`, `/v1/moderations`, `/v1/rerank` | |
| OpenAI Realtime | `WebSocket /v1/realtime` | 双向流 |
| Anthropic Messages | `/v1/messages`, `/v1beta/messages` | 原生 Anthropic 协议 |
| Gemini | `/v1beta/models/{model}:generateContent` 等 | 原生 Gemini 协议 |
| Midjourney | `/mj/*` | 任务型，提交 + 轮询 |
| Suno | `/suno/*` | 音乐生成 |
| Playground | `/pg/*` | 后台调试用通道 |

入口由 `router/relay-router.go` 装配，认证使用 `middleware.TokenAuth()`，再经 `middleware.Distribute()` 按渠道亲和度选择上游，进入 `controller/relay.go`，由 `relay/channel/<provider>/` 下的适配器完成请求/响应转换。

### 2. 用户与认证

- 账号密码注册 / 登录、邮箱验证、密码找回
- JWT / Session 双形态会话
- **2FA**（TOTP）+ 备份码
- **WebAuthn / Passkey** 注册与登录
- **OAuth**：GitHub、Discord、OIDC、LinuxDO、WeChat、Telegram，支持自定义 OAuth Provider
- **Turnstile** 人机校验
- 角色三层：普通用户 / Admin / Root，对应中间件 `UserAuth`、`AdminAuth`、`RootAuth`
- 敏感操作二次验证（如查看渠道密钥），由 `middleware/secure_verification.go` 控制

### 3. 用户管理

- 个人信息、用户组（group）、邀请码（aff）、aff 配额转赠
- 每日签到（`/api/user/check_in`）领取配额
- 管理员：用户搜索 / 创建 / 修改 / 删除 / 封禁、清理 OAuth 绑定、重置 Passkey、关闭 2FA

### 4. API Key（Token）

- 用户可创建多把 Key，设置过期时间、剩余配额、可用模型、IP 白名单、subnet
- token 维度限流：`middleware/model-rate-limit.go`
- 通过 token 查询自身用量：`GET /api/usage/token`
- 批量获取 / 删除

### 5. 渠道（上游）管理

- 渠道增删改查、按 tag 批量管理
- **Multi-Key**：一个渠道挂多 Key 轮询
- **自动测试** `AutomaticallyTestChannels`：定时探活
- **自动余额刷新** `AutomaticallyUpdateChannels`
- **渠道亲和** `service/channel_affinity.go`：相同 user+model 倾向分配同一渠道
- **上游模型自动同步** `controller/channel_upstream_update.go`
- **Codex OAuth** + 凭据自动刷新（`service/codex_credential_refresh_task.go`）
- Ollama Pull、Vendor Meta、缺失模型检测

### 6. 模型与定价

- 模型元信息（`model_meta`）、厂商元信息（`vendor_meta`）
- 模型倍率配置（`setting/ratio_setting`）+ 上游同步
- Prefill Group（预填模型分组）
- 定价默认值与刷新（`pricing_default.go` / `pricing_refresh.go`）
- 缺失模型检测（`missing_models.go`）

### 7. 计费与配额

- **配额（quota）核心流程**：预扣（`pre_consume_quota`）→ 调用上游 → 实际结算（按 token / 工具 / 任务用量）
- **分级表达式计费系统** `pkg/billingexpr/`（详见同目录 `expr.md`）：
  - 表达式编辑器、变量与函数、token 归一化（`p`/`c` 自动排除）
  - 预消费 → 结算 → 日志展示完整链路
- `tiered_settle.go` 分层结算
- `violation_fee.go` 违规扣费
- `text_quota.go` / `tool_billing.go` / `task_billing.go` 三类用量结算

### 8. 充值 / 订阅 / 兑换

| 通道 | 实现 |
| --- | --- |
| 易支付（epay） | `service/epay.go` |
| Stripe | `controller/topup_stripe.go` |
| Creem | `controller/topup_creem.go` |
| Waffo / Waffo-Pancake | `controller/topup_waffo*.go` |

- 兑换码：`controller/redemption.go`，支持批量生成、按面额/有效期管理
- 订阅计划（`subscription`）：管理员配置 Plans，用户通过任意支付通道购买；定时任务 `StartSubscriptionQuotaResetTask` 按日/周/月/自定义周期重置订阅配额
- 支付 Webhook 路由：`/api/stripe/webhook`、`/api/creem/webhook`、`/api/waffo/webhook`、`/api/subscription/epay/notify`（不走业务鉴权，使用签名校验）

### 9. 任务型模型

- **Midjourney**：`/mj/*` 提交 + `controller/task_polling` 后台轮询任务状态
- **Suno**：音乐生成
- **视频**：Jimeng（`middleware/jimeng_adapter.go`）、Kling（`middleware/kling_adapter.go`）；视频代理 `controller/video_proxy.go` / `video_proxy_gemini.go`

### 10. 日志、看板、运维

- 调用日志独立 LogDB，可单独配置 DSN
- 用量按日聚合 `UpdateQuotaData`，看板与排行榜
- 性能指标 `pkg/perf_metrics` + Pyroscope + pprof
- Uptime Kuma 集成（`controller/uptime_kuma.go`）
- i18n：后端 `i18n/`（en/zh），前端 `web/default/src/i18n/locales/`（en/zh/fr/ru/ja/vi）

### 11. 前端管理后台（`web/default/`）

主要功能页面（`src/features/`）：

- `auth` 登录/注册/Passkey/2FA
- `home` / `about` 首页与关于
- `dashboard` 仪表盘
- `channels` 渠道管理
- `suppliers` / `models` / `pricing` 厂商、模型、定价
- `keys` API Key 管理
- `usage-logs` 用量与日志
- `redemption-codes` 兑换码
- `wallet` 钱包/充值
- `subscriptions` 订阅
- `users` 用户管理（admin）
- `system-settings` 系统设置（root）
- `playground` / `chat` 调试聊天
- `profile` 个人中心
- `rankings` 排行榜
- `performance-metrics` 性能指标
- `setup` 初始化向导

经典主题位于 `web/classic/`（Vite + React 18 + Semi Design），与默认主题一同被 `embed.FS` 嵌入二进制。

---

## 三、对外接口分组（`/api/*`）

| 前缀 | 用途 |
| --- | --- |
| `/api/user/*` | 注册、登录、个人中心、TopUp、2FA、Passkey、签到、OAuth 绑定 |
| `/api/user/`（admin） | 用户管理、充值审核 |
| `/api/subscription/*` / `/admin/*` | 订阅计划与购买 |
| `/api/option/*`（root） | 系统配置 |
| `/api/channel/*`（admin） | 渠道增删改查、批量、Codex OAuth、Ollama Pull |
| `/api/token/*` | API Key |
| `/api/usage/token` | 通过 token 查用量 |
| `/api/redemption/*` | 兑换码 |
| `/api/log/*` / `/api/data/*` | 调用日志与配额统计 |
| `/api/group` / `/api/prefill_group` / `/api/vendors` / `/api/models` / `/api/deployments` | 元数据 |
| `/api/mj` / `/api/task` | Midjourney / 任务型管理 |
| `/api/oauth/:provider` | OAuth 登录回调 |
| `/api/stripe\|creem\|waffo/webhook` | 支付回调（签名校验） |

中继接口前缀：`/v1`、`/v1beta`、`/mj`、`/suno`、`/pg`。

---

## 四、快速使用

### 1. 部署启动

```bash
# 直接运行（需要 Go 1.22+）
go run main.go

# 或构建二进制
go build -o new-api .
./new-api
```

环境变量（节选，详见 `common/env.go`）：

```bash
SQL_DSN="root:pass@tcp(127.0.0.1:3306)/new_api"   # 不设置默认 SQLite
LOG_SQL_DSN="..."                                  # 可选，日志独立库
REDIS_CONN_STRING="redis://localhost:6379"
SESSION_SECRET="..."
PORT=3000
```

启动后访问 `http://localhost:3000`，根据 setup 向导完成初始 Root 账号创建。

### 2. 前端开发

```bash
cd web/default
bun install
bun run dev          # 开发服务器
bun run build        # 生产构建（输出到 dist/，被 Go 嵌入）
bun run i18n:sync    # 同步多语言键
```

### 3. 业务使用流程

1. **管理员登录后台** → System Settings 配置邮件、OAuth、支付、Turnstile 等
2. **创建渠道**（Channels）：选择厂商类型，填入上游 API Key（支持 Multi-Key），勾选支持的模型，保存后会自动测试连通性
3. **配置模型倍率**（Pricing）：设置每个模型的 prompt/completion 倍率或分级表达式
4. **创建用户组**（Group）：不同 group 可关联不同渠道，实现分级
5. **用户注册或管理员创建用户** → 用户在 Keys 页面创建 API Key
6. **客户端调用**：

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer sk-xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

7. **充值/订阅**：用户在 Wallet / Subscriptions 页发起支付，完成后配额自动入账
8. **查看日志和用量**：Usage & Logs 页

### 4. 调用 Anthropic / Gemini 协议示例

```bash
# Anthropic
curl http://localhost:3000/v1/messages \
  -H "x-api-key: sk-xxxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,
       "messages":[{"role":"user","content":"hi"}]}'

# Gemini
curl "http://localhost:3000/v1beta/models/gemini-1.5-pro:generateContent?key=sk-xxxx" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"hi"}]}]}'
```

### 5. Midjourney 提交任务

```bash
curl http://localhost:3000/mj/submit/imagine \
  -H "Authorization: Bearer sk-xxxx" \
  -H "mj-api-secret: sk-xxxx" \
  -d '{"prompt":"a cute cat, --v 6"}'
# 然后轮询 /mj/task/{id}/fetch 拿结果
```

---

## 五、关键源码索引

| 模块 | 入口 |
| --- | --- |
| 服务启动 | `main.go` |
| 业务路由 | `router/api-router.go` |
| 中继路由 | `router/relay-router.go` |
| 鉴权中间件 | `middleware/auth.go` |
| 渠道选择 | `middleware/distributor.go`、`service/channel_select.go`、`service/channel_affinity.go` |
| 中继核心 | `controller/relay.go` |
| 上游适配器 | `relay/channel/<provider>/` |
| 计费 | `service/billing.go`、`pkg/billingexpr/`（必读 `expr.md`） |
| 数据模型 | `model/` |
| 前端功能 | `web/default/src/features/`、`web/default/src/routes/` |

---

## 六、约束与注意事项（来自项目 `CLAUDE.md`）

1. **JSON 必须使用** `common.Marshal/Unmarshal` 等包装函数，禁止直接使用 `encoding/json` 进行序列化。
2. **数据库代码必须同时兼容** SQLite / MySQL / PostgreSQL；使用 GORM 抽象，避免数据库专属语法；列引号、布尔值差异通过 `commonGroupCol`、`commonTrueVal` 等常量处理。
3. **前端**优先使用 `bun`。
4. **新增渠道**需确认 StreamOptions 支持，并加入 `streamSupportedChannels`。
5. **请求 DTO**：可选标量字段使用指针 + `omitempty`，避免零值被静默丢弃。
6. **分级计费**改动前必须阅读 `pkg/billingexpr/expr.md`。
7. **项目身份信息**（`new-api` / `QuantumNous` 的品牌/署名/模块路径等）受保护，不得修改或移除。

---

> 本平台为开源 SaaS 级 AI 网关，覆盖"多协议兼容 + 多支付通道 + 多 OAuth + 多语言 + 多主题前端 + 订阅与按量计费 + 企业级渠道亲和与限流"。如需深入定制，建议先阅读 `main.go`、`router/`、`relay/channel/openai/` 三处入口。
