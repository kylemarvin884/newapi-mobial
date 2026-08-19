# NewAPI Mobile

NewAPI Mobile（应用显示名称为 Kyle AI）是一个连接 NewAPI 的跨平台移动客户端和安全代理后端。

<div class="grid cards" markdown>

-   :material-server-security: **自托管后端**

    ---

    使用 Docker Compose 部署 FastAPI 和 Redis，通过 Caddy 或 Nginx 提供 HTTPS。

    [:octicons-arrow-right-24: 开始部署](DEPLOYMENT.md)

-   :material-cellphone: **移动客户端**

    ---

    基于 Expo / React Native，支持 Android 和 iOS，构建时连接你的服务器。

    [:octicons-arrow-right-24: 本地开发](development.md)

-   :material-api: **NewAPI 集成**

    ---

    支持登录、注册、两步验证、余额、API Key、模型分组、聊天和生图。

    [:octicons-arrow-right-24: API 概览](api.md)

-   :material-shield-lock: **安全会话**

    ---

    上游凭据经 Fernet 加密保存到 Redis，App 仅持有独立随机会话令牌。

    [:octicons-arrow-right-24: 查看架构](architecture.md)

</div>

## 适用对象

- 想为自己的 NewAPI 实例提供移动 App 的管理员；
- 需要在 Linux 服务器自托管后端的开发者；
- 希望二次开发 Expo App、后端代理或部署流程的贡献者。

## 最短部署路径

1. 准备可用的 NewAPI 实例、Linux 服务器和 API 域名；
2. 复制 `server/.env.example` 并填写自己的 NewAPI 地址与随机密钥；
3. 使用 Docker Compose 启动后端；
4. 使用 Caddy 或 Nginx 配置 HTTPS；
5. 将自己的 API 地址写入移动端构建环境；
6. 重新构建并安装 Android / iOS App。

!!! warning "旧安装包不会自动切换服务器"
    API 地址会在 App 构建时写入。修改服务器环境变量不会改变已经安装的 App，必须重新构建。

## 快速命令

```bash
git clone https://github.com/kylemarvin884/newapi-mobial.git
cd newapi-mobial
cp server/.env.example server/.env
openssl rand -hex 32
nano server/.env
docker compose build --pull
docker compose up -d
curl --fail http://127.0.0.1:8100/health
```

继续阅读[服务器部署指南](DEPLOYMENT.md)，完成 DNS、HTTPS、移动端构建和上线验收。
