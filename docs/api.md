# API 概览

公网业务 API 默认位于：

```text
https://你的域名/api/v1
```

除登录、注册和两步验证外，接口使用：

```http
Authorization: Bearer <your-app-session-token>
```

## 系统

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 进程健康检查 |

## 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/auth/verification` | 发送注册邮箱验证码 |
| POST | `/api/v1/auth/register` | 注册 NewAPI 用户 |
| POST | `/api/v1/auth/login` | 登录，可能返回 2FA challenge |
| POST | `/api/v1/auth/two-factor` | 完成两步验证 |
| POST | `/api/v1/auth/logout` | 注销并删除后端会话 |

## 账户

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/account/me` | 当前用户资料 |
| GET | `/api/v1/account/balance` | 余额、消耗和 Token |

## API Key

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/keys` | Key 列表 |
| GET | `/api/v1/keys/groups` | 可用分组 |
| POST | `/api/v1/keys` | 创建 Key |
| PUT | `/api/v1/keys/{id}` | 更新 Key |
| POST | `/api/v1/keys/{id}/toggle` | 启停 Key |
| POST | `/api/v1/keys/{id}/reveal` | 临时读取完整 Key |
| DELETE | `/api/v1/keys/{id}` | 删除 Key |

## AI

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/chat/models` | 用户可用模型 |
| GET | `/api/v1/chat/model-groups` | 分组模型列表 |
| POST | `/api/v1/chat/completions` | 非流式聊天 |
| POST | `/api/v1/chat/images` | 图片生成 |

## 错误

错误通常返回：

```json
{
  "detail": "可读的错误信息"
}
```

常见状态码：

- `400`：输入或 NewAPI 业务错误；
- `401`：会话失效，需要重新登录；
- `422`：请求字段未通过 Pydantic 校验；
- `502`：NewAPI 无法访问或返回无效响应。

生产环境应在反向代理和 NewAPI 两侧设置限流，尤其是验证码、登录、2FA、Key Reveal、聊天和生图接口。
