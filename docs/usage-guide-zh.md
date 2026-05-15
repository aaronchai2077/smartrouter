# OctoRouter 使用说明

## 概述

OctoRouter 是一个统一的 AI API 网关和代理平台，聚合了 40+ 上游 AI 提供商（OpenAI、Claude、Gemini、Azure、AWS Bedrock 等），提供用户管理、计费、速率限制和管理仪表板。

## 快速开始

### 1. 部署 OctoRouter

#### 使用 Docker Compose（推荐）

```bash
# 克隆项目
git clone https://github.com/oorouter.git
cd new-api

# 编辑 docker-compose.yml 配置
nano docker-compose.yml

# 启动服务
docker-compose up -d
```

#### 使用 Docker 命令

```bash
# 拉取最新镜像
docker pull calciumion/new-api:latest

# 使用 SQLite（默认）
docker run --name new-api -d --restart always \
  -p 3000:3000 \
  -e TZ=Asia/Shanghai \
  -v ./data:/data \
  calciumion/new-api:latest
```

### 2. 访问管理界面

部署完成后，访问 `http://localhost:3000` 进入管理界面。

默认管理员账号：
- 用户名：`root`
- 密码：`123456`

**重要**：首次登录后请立即修改密码！

## 核心功能

### 1. 渠道管理

渠道是连接上游 AI 提供商的配置。支持以下类型的渠道：

- **OpenAI 兼容**：OpenAI、Azure OpenAI、DeepSeek 等
- **Claude**：Anthropic Claude 系列模型
- **Gemini**：Google Gemini 系列模型
- **AWS Bedrock**：Amazon Bedrock 模型
- **自定义**：支持任意兼容 OpenAI 格式的 API

#### 添加渠道步骤：

1. 登录管理界面
2. 进入「渠道」页面
3. 点击「添加渠道」
4. 选择渠道类型
5. 填写 API Key 和配置信息
6. 保存并测试连接

### 2. 令牌管理

令牌是客户端访问 API 的凭证。支持以下功能：

- **令牌分组**：按用途分组管理
- **模型限制**：限制令牌可访问的模型
- **额度管理**：设置使用额度
- **过期时间**：设置令牌有效期

#### 创建令牌：

1. 进入「令牌」页面
2. 点击「创建令牌」
3. 选择所属用户
4. 设置模型限制和额度
5. 生成令牌

### 3. 用户管理

支持多用户系统，包含以下角色：

- **Root**：超级管理员，拥有所有权限
- **Admin**：管理员，可管理用户和渠道
- **Common**：普通用户，可使用分配的令牌
- **Guest**：访客，仅查看权限

#### 用户功能：

- 注册和登录
- 个人资料管理
- 令牌使用统计
- 额度查询

### 4. 计费系统

支持灵活的计费方式：

- **按量计费**：根据实际使用量收费
- **套餐订阅**：固定额度的套餐
- **免费额度**：新用户赠送免费额度
- **在线充值**：支持多种支付方式

#### 计费配置：

1. 进入「系统设置」→「计费设置」
2. 配置模型价格
3. 设置充值选项
4. 配置免费额度规则

## API 使用

### 基本 API 调用

OctoRouter 提供与 OpenAI 兼容的 API 接口：

```bash
# 聊天补全
curl https://your-octorouter-domain.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "你好！"}
    ]
  }'
```

### 支持的 API 端点

| 端点 | 描述 | 兼容性 |
|------|------|--------|
| `/v1/chat/completions` | 聊天补全 | OpenAI 兼容 |
| `/v1/completions` | 文本补全 | OpenAI 兼容 |
| `/v1/embeddings` | 嵌入向量 | OpenAI 兼容 |
| `/v1/images/generations` | 图像生成 | OpenAI 兼容 |
| `/v1/audio/transcriptions` | 语音转文字 | OpenAI 兼容 |
| `/v1/audio/speech` | 文字转语音 | OpenAI 兼容 |
| `/v1/moderations` | 内容审核 | OpenAI 兼容 |
| `/v1/models` | 模型列表 | OpenAI 兼容 |

### 流式响应

支持流式响应，适用于实时对话场景：

```javascript
const response = await fetch('https://your-octorouter-domain.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: '你好！' }],
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      
      try {
        const parsed = JSON.parse(data);
        console.log(parsed.choices[0]?.delta?.content || '');
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
}
```

## 高级功能

### 1. 智能路由

OctoRouter 支持多种路由策略：

- **权重随机**：根据渠道权重分配请求
- **负载均衡**：自动选择负载较低的渠道
- **故障转移**：自动切换到备用渠道
- **地理位置**：根据用户位置选择最优渠道

### 2. 格式转换

支持不同 API 格式之间的自动转换：

- OpenAI ↔ Claude Messages
- OpenAI → Google Gemini
- Google Gemini → OpenAI（文本部分）
- 思考模式转换

### 3. 速率限制

支持多级速率限制：

- **用户级限制**：每个用户的请求频率
- **令牌级限制**：每个令牌的请求频率
- **模型级限制**：每个模型的并发请求数
- **渠道级限制**：每个渠道的请求频率

### 4. 缓存系统

支持响应缓存，提高性能：

- **Redis 缓存**：分布式缓存（推荐）
- **内存缓存**：单机内存缓存
- **模型响应缓存**：缓存常见模型响应
- **嵌入向量缓存**：缓存嵌入计算结果

## 监控和日志

### 1. 使用统计

管理界面提供详细的使用统计：

- 实时请求监控
- 使用量趋势图
- 渠道使用分布
- 用户活跃度统计

### 2. 错误日志

记录所有 API 错误和异常：

- 请求失败详情
- 渠道连接问题
- 认证失败记录
- 系统错误日志

### 3. 性能监控

集成性能监控工具：

- Pyroscope 性能分析
- pprof 性能剖析
- 请求延迟统计
- 系统资源监控

## 安全配置

### 1. 认证和授权

- JWT 令牌认证
- API Key 认证
- OAuth 2.0 集成
- WebAuthn/Passkeys 支持

### 2. 网络安全

- HTTPS 强制启用
- CORS 配置
- IP 白名单
- 请求频率限制

### 3. 数据安全

- 数据库加密
- API Key 加密存储
- 敏感信息脱敏
- 审计日志记录

## 故障排除

### 常见问题

#### 1. API 返回 401 错误
- 检查令牌是否正确
- 确认令牌是否过期
- 验证用户权限

#### 2. 渠道连接失败
- 检查 API Key 是否正确
- 确认网络连接正常
- 验证上游服务状态

#### 3. 响应速度慢
- 检查渠道负载
- 查看缓存配置
- 监控系统资源

#### 4. 额度不足
- 检查用户余额
- 查看使用统计
- 考虑充值或调整额度

### 获取帮助

- **文档**：访问 [https://www.octorouter.com/docs](https://www.octorouter.com/docs)
- **社区**：加入用户交流群
- **问题反馈**：在 GitHub 提交 Issue
- **技术支持**：联系技术支持团队

## 更新和维护

### 1. 版本更新

```bash
# 停止当前服务
docker-compose down

# 拉取最新镜像
docker pull calciumion/new-api:latest

# 启动新版本
docker-compose up -d
```

### 2. 数据备份

```bash
# 备份数据库
docker exec new-api sqlite3 /data/oneapi.db ".backup /data/backup.db"

# 备份配置文件
cp -r ./data ./data-backup-$(date +%Y%m%d)
```

### 3. 性能优化

- 配置 Redis 缓存
- 调整数据库连接池
- 优化渠道权重配置
- 启用响应压缩

---

**注意**：本文档为基本使用说明，详细配置请参考完整文档或联系技术支持。

© 2024 OctoRouter. 保留所有权利。