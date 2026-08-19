# NewAPI Mobile（Kyle AI）

Kyle AI 是一个面向 NewAPI 的开源移动客户端与安全代理后端。用户可以在 Android / iOS App 中登录自己的 NewAPI 账号，进行多模型聊天、AI 生图、余额查询及 API Key 管理。

> 目标：服务器管理员只需阅读仓库文档，就能将后端部署到自己的 Linux 服务器，并构建连接自己域名和 NewAPI 实例的 App。

## 功能

- 用户名密码登录、邮箱验证码注册、TOTP / 备用码两步验证；
- NewAPI 登录凭据由后端加密存储，移动端只保存独立随机会话令牌；
- 按用户分组展示模型，支持文本聊天与图片生成；
- 查看余额、累计消耗、请求次数和 App 侧累计 Token；
- 创建、启停、显示、复制和删除用户 API Key；
- 本机多会话历史、Markdown 回复、中英文界面；
- Android 余额桌面小组件；
- 可选的 APK 下载页、分享和应用内版本检查。

## 架构

```text
Expo / React Native App
          │ HTTPS
          ▼
FastAPI 安全代理 ─── Redis（加密会话）
          │ HTTPS
          ▼
       NewAPI
```

| 模块 | 技术 |
|---|---|
| 移动端 | Expo 54、React Native、TypeScript、Expo Router |
| 后端 | Python 3.12、FastAPI、HTTPX |
| 会话 | Redis、Fernet 加密、滑动过期 |
| 部署 | Docker Compose、Caddy 或 Nginx、HTTPS |

## 快速开始

### 服务器管理员

完整教程见 **[服务器部署指南](docs/DEPLOYMENT.md)**。其中包括：

1. DNS、端口和服务器准备；
2. Docker 与 Redis 部署；
3. 后端环境变量配置；
4. Caddy 自动 HTTPS；
5. Nginx + Certbot 可选方案；
6. 移动端 API 地址和品牌配置；
7. EAS 构建 APK / iOS；
8. 升级、备份、回滚和故障排查。

后端最短启动流程：

```bash
git clone https://github.com/kylemarvin884/newapi-mobial.git /opt/newapi-mobial
cd /opt/newapi-mobial
cp server/.env.example server/.env
openssl rand -hex 32
nano server/.env
docker compose up -d --build
curl --fail http://127.0.0.1:8100/health
```

在 `server/.env` 中至少替换：

```dotenv
NEWAPI_BASE_URL=https://你的-newapi-域名
SESSION_SECRET=openssl生成的随机值
```

随后必须配置 HTTPS，且应使用自己的 API 域名重新构建 App。旧 APK 不会自动连接新服务器。

### 移动端开发

```bash
cd mobile
cp .env.example .env
npm ci
npm run typecheck
npm run lint
npx expo start
```

在 `mobile/.env` 中配置：

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://你的-api-域名/api/v1
```

生产构建前还必须修改 `mobile/app.json` 中的 Android 包名、iOS Bundle ID 和 EAS projectId。详见部署指南。

## 配置文件

| 文件 | 用途 | 是否可提交 |
|---|---|---:|
| `server/.env.example` | 后端配置模板 | 是 |
| `server/.env` | 后端真实密钥和环境配置 | 否 |
| `mobile/.env.example` | App 构建变量模板 | 是 |
| `mobile/.env` | 当前构建环境变量 | 否 |
| `deploy/Caddyfile.example` | 推荐 HTTPS 反代模板 | 是 |
| `deploy/nginx-*.conf` | Nginx / Certbot 模板 | 是 |
| `android-release.example.json` | 可选 Android 更新清单模板 | 是 |

## 本地验证

后端：

```bash
cd server
python -m pip install -e ".[dev]"
pytest
```

移动端：

```bash
cd mobile
npm ci
npm run typecheck
npm run lint
npx expo install --check
```

部署配置：

```bash
cp server/.env.example server/.env
# 把 SESSION_SECRET 改成至少 32 字符的测试值
docker compose config
rm server/.env
```

## 安全说明

- 不要公开 Redis、8100 端口、`server/.env`、NewAPI Cookie 或 API Key；
- 必须为每次部署生成独立的 `SESSION_SECRET`；
- 生产环境仅允许 HTTPS；
- 在 NewAPI 和反向代理层配置账户、验证码、聊天及 Key Reveal 限流；
- 服务器应启用 NTP、日志监控、定期备份和安全更新；
- 正式发布前准备隐私政策，说明账号、聊天内容和 API Key 如何处理。

## 数据范围

聊天历史默认保存在用户设备本机，并按 NewAPI 用户 ID 隔离。退出登录或重启 App 后仍保留；卸载 App、清除数据或换设备不会自动同步。当前最多保存 40 个对话，每个对话最多保留 80 条消息。

## API

后端健康检查：

```text
GET /health
```

业务 API 前缀：

```text
/api/v1
```

开发环境可在 `/docs` 查看 FastAPI 文档；生产环境默认关闭文档页面。

## 开发文档

公开开发文档：<https://docs.lianhaotian.com>

本地构建文档站：

```bash
python -m pip install -r requirements-docs.txt
mkdocs serve
```

## 许可证与贡献

本项目采用 [MIT License](LICENSE)。贡献代码前请运行后端测试、移动端类型检查、lint 和文档严格构建。
