# 项目架构

## 系统拓扑

```text
Android / iOS App
        │ HTTPS + Bearer session token
        ▼
Caddy / Nginx
        │ 127.0.0.1:8100
        ▼
FastAPI API ───────── Redis
        │               ├─ 加密上游会话
        │               ├─ 待处理 2FA
        │               └─ App 侧累计 Token
        ▼
NewAPI
```

## 移动端

`mobile/` 使用 Expo、React Native、TypeScript 和 Expo Router。

主要页面：

| 页面 | 功能 |
|---|---|
| `app/login.tsx` | 登录、注册、邮件验证码、两步验证 |
| `app/(tabs)/chat.tsx` | 多模型聊天、生图和本机会话历史 |
| `app/(tabs)/balance.tsx` | 余额、请求次数、Token 和桌面小组件 |
| `app/(tabs)/keys.tsx` | API Key 创建、启停、显示和删除 |
| `app/(tabs)/profile.tsx` | 账户资料、语言、更新、分享和退出 |

## 后端

`server/` 使用 FastAPI、HTTPX、Pydantic Settings 和 Redis。

| 模块 | 职责 |
|---|---|
| `app/api/` | 对移动端提供认证、账户、Key、聊天和图片接口 |
| `app/services/newapi.py` | 适配 NewAPI 用户 API 与 OpenAI 兼容 API |
| `app/services/session_store.py` | Redis 会话、2FA 临时状态和 Token 计数 |
| `app/core/security.py` | Session Token、Redis Key 摘要和 Fernet 加密 |
| `app/dependencies.py` | Bearer 认证、上游令牌刷新和并发刷新锁 |

## 认证流程

1. App 将用户名和密码提交给你的应用后端；
2. 后端请求 NewAPI 登录接口；
3. 上游 access token / cookie 被加密后写入 Redis；
4. 后端生成独立的高熵 Session Token 返回给 App；
5. App 使用 Secure Store 保存 Session Token；
6. 后续请求由后端解密上游会话并在必要时刷新。

移动端不会持久保存 NewAPI 密码或上游 Cookie。

## 数据边界

- **Redis**：服务端登录会话、待处理 2FA、累计 Token；
- **设备本地**：聊天历史、语言偏好、当前 Session Token；
- **NewAPI**：用户、额度、模型权限和 API Key；
- **本项目默认不提供跨设备聊天同步**。
