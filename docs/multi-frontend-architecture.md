# 多前端兼容架构分析

## 1. 当前架构概述

### 1.1 现有前端支持

当前项目已支持两套前端：

| 前端 | 路径 | 技术栈 |
|------|------|--------|
| Default | `web/default/` | React 19, Rsbuild, Base UI, Tailwind CSS |
| Classic | `web/classic/` | React 18, Vite, Semi Design |

### 1.2 主题切换机制

当前通过全局配置切换前端：

```go
// common/constants.go
var themeValue atomic.Value // 存储 "default" 或 "classic"

func GetTheme() string {
    return themeValue.Load().(string)
}

func SetTheme(t string) {
    if t == "default" || t == "classic" {
        themeValue.Store(t)
    }
}
```

**问题**：当前主题是全局配置，所有用户看到相同的前端界面。

---

## 2. 单靠账户区分是否足够？

### 2.1 当前账户体系分析

```
用户 (User)
├── Id               - 用户ID
├── Username         - 用户名
├── Role             - 角色 (Guest=0, Common=1, Admin=10, Root=100)
├── Group            - 用户分组 (default, vip, enterprise...)
├── Status           - 状态
├── Setting          - 用户设置 (JSON)
│   ├── SidebarModules - 边栏模块配置
│   └── ...
└── ...
```

### 2.2 仅靠账户区分的不足

| 维度 | 当前能力 | 不足之处 |
|------|----------|----------|
| **前端主题** | 全局配置，所有用户同一主题 | 无法为不同用户展示不同UI |
| **品牌定制** | 全局 SystemName/Logo | 无法为不同客户定制品牌 |
| **功能权限** | 基于 Role 和 SidebarModules | 可以控制，但不够灵活 |
| **数据隔离** | 用户数据已隔离 | ✓ 足够 |
| **API配置** | 全局配置 | 无法为不同前端定制API行为 |

### 2.3 核心问题

**单靠账户区分不足以实现多前端兼容**，原因如下：

1. **前端主题是全局的** - 无法按用户/租户切换
2. **缺少租户概念** - 无法区分不同客户/品牌
3. **配置粒度不够** - 无法按租户定制系统行为

---

## 3. 推荐的多前端架构方案

### 3.1 方案概述：租户隔离 + 用户映射

```
┌─────────────────────────────────────────────────────────────────┐
│                        统一后端 API                              │
├─────────────────────────────────────────────────────────────────┤
│  租户中间件 (TenantMiddleware)                                   │
│  ├── 域名识别: a.com → tenant_a, b.com → tenant_b               │
│  ├── Header识别: X-Tenant-ID: tenant_a                          │
│  └── Token前缀: sk-tenant_a-xxx                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Tenant A   │  │  Tenant B   │  │  Tenant C   │             │
│  │  (百物通)    │  │  (客户B)    │  │  (客户C)    │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │ 前端: Default│  │ 前端: Classic│  │ 前端: Custom│             │
│  │ 品牌: 定制A  │  │ 品牌: 定制B  │  │ 品牌: 定制C  │             │
│  │ 用户: user_1 │  │ 用户: user_2 │  │ 用户: user_3 │             │
│  │      user_2 │  │      user_3 │  │      user_4 │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 数据模型扩展

#### 3.2.1 新增租户表

```go
// model/tenant.go

type Tenant struct {
    Id          int    `json:"id" gorm:"primaryKey"`
    Code        string `json:"code" gorm:"uniqueIndex;size:32"`  // 租户标识码
    Name        string `json:"name" gorm:"size:64"`              // 租户名称
    Domain      string `json:"domain" gorm:"size:128"`           // 绑定域名
    Theme       string `json:"theme" gorm:"default:default"`     // 前端主题
    
    // 品牌定制
    SystemName  string `json:"system_name" gorm:"size:64"`
    Logo        string `json:"logo" gorm:"size:256"`
    Footer      string `json:"footer" gorm:"type:text"`
    
    // 功能配置
    Features    string `json:"features" gorm:"type:text"`        // JSON: 启用的功能模块
    Settings    string `json:"settings" gorm:"type:text"`        // JSON: 租户级配置
    
    // 状态
    Status      int    `json:"status" gorm:"default:1"`          // 1=启用, 2=禁用
    ExpiredAt   int64  `json:"expired_at"`                       // 过期时间
    
    CreatedAt   int64  `json:"created_at" gorm:"autoCreateTime"`
    UpdatedAt   int64  `json:"updated_at" gorm:"autoUpdateTime"`
}
```

#### 3.2.2 用户表扩展

```go
// 在 User 结构体中添加

type User struct {
    // ... 现有字段 ...
    
    TenantId    int    `json:"tenant_id" gorm:"index"`  // 所属租户
    // 或使用 TenantCode
}
```

### 3.3 租户识别机制

#### 3.3.1 多种识别方式

```go
// middleware/tenant.go

func TenantMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        var tenantCode string
        
        // 方式1: 域名识别
        host := c.Request.Host
        if tenant := model.GetTenantByDomain(host); tenant != nil {
            tenantCode = tenant.Code
            c.Set("tenant", tenant)
            c.Set("tenant_id", tenant.Id)
            c.Next()
            return
        }
        
        // 方式2: Header 识别
        if tid := c.GetHeader("X-Tenant-ID"); tid != "" {
            tenantCode = tid
            if tenant := model.GetTenantByCode(tid); tenant != nil {
                c.Set("tenant", tenant)
                c.Set("tenant_id", tenant.Id)
                c.Next()
                return
            }
        }
        
        // 方式3: Token 前缀识别 (sk-{tenant}-{key})
        if auth := c.GetHeader("Authorization"); auth != "" {
            if parts := strings.Split(auth, "-"); len(parts) >= 3 {
                potentialTenant := parts[1]
                if tenant := model.GetTenantByCode(potentialTenant); tenant != nil {
                    c.Set("tenant", tenant)
                    c.Set("tenant_id", tenant.Id)
                    c.Next()
                    return
                }
            }
        }
        
        // 默认租户
        defaultTenant := model.GetDefaultTenant()
        c.Set("tenant", defaultTenant)
        c.Set("tenant_id", defaultTenant.Id)
        c.Next()
    }
}
```

### 3.4 前端主题切换

#### 3.4.1 修改 web-router.go

```go
// router/web-router.go

func SetWebRouter(router *gin.Engine, assets ThemeAssets) {
    defaultFS := common.EmbedFolder(assets.DefaultBuildFS, "web/default/dist")
    classicFS := common.EmbedFolder(assets.ClassicBuildFS, "web/classic/dist")
    // 可扩展更多主题...
    
    // 使用租户感知的文件系统
    tenantAwareFS := common.NewTenantAwareFS(defaultFS, classicFS)
    
    router.Use(gzip.Gzip(gzip.DefaultCompression))
    router.Use(middleware.GlobalWebRateLimit())
    router.Use(middleware.Cache())
    router.Use(middleware.TenantMiddleware()) // 添加租户中间件
    router.Use(static.Serve("/", tenantAwareFS))
    
    router.NoRoute(func(c *gin.Context) {
        c.Set(middleware.RouteTagKey, "web")
        
        if strings.HasPrefix(c.Request.RequestURI, "/v1") || 
           strings.HasPrefix(c.Request.RequestURI, "/api") || 
           strings.HasPrefix(c.Request.RequestURI, "/assets") {
            controller.RelayNotFound(c)
            return
        }
        
        c.Header("Cache-Control", "no-cache")
        
        // 根据租户返回不同的 index.html
        tenant, exists := c.Get("tenant")
        if exists {
            t := tenant.(*model.Tenant)
            switch t.Theme {
            case "classic":
                c.Data(http.StatusOK, "text/html; charset=utf-8", assets.ClassicIndexPage)
                return
            // case "custom":
            //     c.Data(http.StatusOK, "text/html; charset=utf-8", assets.CustomIndexPage)
            //     return
            }
        }
        
        // 默认主题
        c.Data(http.StatusOK, "text/html; charset=utf-8", assets.DefaultIndexPage)
    })
}
```

### 3.5 配置隔离

#### 3.5.1 租户级配置覆盖

```go
// 租户配置优先级：租户配置 > 全局配置

func GetTenantConfig(tenantId int, key string) string {
    // 1. 尝试从租户配置获取
    if tenant := model.GetTenantById(tenantId); tenant != nil {
        if value := tenant.GetSetting(key); value != "" {
            return value
        }
    }
    
    // 2. 回退到全局配置
    return common.OptionMap[key]
}
```

#### 3.5.2 关键配置项隔离

| 配置项 | 全局级别 | 租户级别 |
|--------|----------|----------|
| SystemName | ✓ | ✓ (覆盖) |
| Logo | ✓ | ✓ (覆盖) |
| Footer | ✓ | ✓ (覆盖) |
| 前端主题 | ✓ | ✓ (覆盖) |
| 支付配置 | ✓ | ✓ (覆盖) |
| OAuth配置 | ✓ | ✓ (覆盖) |
| 渠道配置 | ✓ | ✓ (可选隔离) |
| 模型价格 | ✓ | ✓ (可选隔离) |

---

## 4. API 兼容层设计

### 4.1 统一 API 接口

所有前端调用相同的 API，后端根据租户返回不同数据：

```
GET /api/user/info
├── Tenant A → { name: "用户A", theme: "default", features: [...] }
└── Tenant B → { name: "用户B", theme: "classic", features: [...] }
```

### 4.2 前端配置 API

```go
// controller/tenant.go

func GetTenantConfig(c *gin.Context) {
    tenant, _ := c.Get("tenant")
    t := tenant.(*model.Tenant)
    
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "theme":       t.Theme,
            "system_name": t.SystemName,
            "logo":        t.Logo,
            "footer":      t.Footer,
            "features":    t.GetFeatures(),
            "settings":    t.GetPublicSettings(),
        },
    })
}
```

---

## 5. 实施路径

### 5.1 阶段一：基础租户支持 (1-2周)

1. 创建 `Tenant` 模型和数据库迁移
2. 在 `User` 表添加 `tenant_id` 字段
3. 实现租户识别中间件
4. 修改前端路由支持按租户切换主题

### 5.2 阶段二：配置隔离 (1-2周)

1. 实现租户级配置存储
2. 修改配置读取逻辑支持租户覆盖
3. 实现租户管理 API
4. 管理后台添加租户管理界面

### 5.3 阶段三：完整功能 (2-3周)

1. 支持更多前端主题
2. 租户级支付配置
3. 租户级 OAuth 配置
4. 租户数据报表

---

## 6. 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **仅账户区分** | 简单，无需改动 | 无法定制前端和品牌 | 单一品牌、单一前端 |
| **租户隔离** | 完整隔离，灵活定制 | 开发量大 | 多品牌、多客户 SaaS |
| **独立部署** | 完全独立，无干扰 | 运维成本高 | 大客户、私有化部署 |

---

## 7. 结论

**单靠账户区分不足以实现真正的多前端兼容**。推荐采用**租户隔离方案**：

1. **引入租户概念** - 作为多前端隔离的核心维度
2. **多种识别方式** - 域名、Header、Token 前缀
3. **配置分层** - 租户配置覆盖全局配置
4. **前端主题绑定租户** - 不同租户展示不同 UI

这样可以在同一套后端上，为不同客户/品牌提供完全定制化的前端体验。

---

## 附录：快速实现清单

- [ ] 创建 `tenants` 表
- [ ] 修改 `users` 表添加 `tenant_id`
- [ ] 实现 `TenantMiddleware`
- [ ] 修改 `SetWebRouter` 支持租户主题
- [ ] 实现 `GetTenantConfig` API
- [ ] 添加租户管理后台
- [ ] 编写租户数据迁移脚本
