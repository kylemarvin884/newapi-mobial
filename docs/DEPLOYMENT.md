# NewAPI Mobile 服务器部署指南

本文档面向第一次部署 NewAPI Mobile 的服务器管理员。按顺序完成后，你将得到：

- 一个运行于 Docker 中的 FastAPI + Redis 后端；
- 一个带自动 HTTPS 的公开 API 域名；
- 一个连接到你自己后端和 NewAPI 实例的移动端构建。

> NewAPI Mobile 不是 NewAPI 本身。你必须已经拥有一个可访问的 NewAPI 实例，并拥有修改其注册、邮件和用户策略的权限。

## 1. 部署拓扑

```text
Android / iOS App
        │ HTTPS
        ▼
api.example.com（Caddy 或 Nginx）
        │ 127.0.0.1:8100
        ▼
FastAPI 容器 ────── Redis 容器
        │ HTTPS
        ▼
你的 NewAPI 实例
```

API 容器只绑定服务器回环地址 `127.0.0.1:8100`，Redis 不向宿主机或公网开放。

## 2. 准备条件

推荐环境：

- Ubuntu 22.04 / 24.04 或 Debian 12；
- 至少 1 核 CPU、1 GB 内存、10 GB 可用磁盘；
- 一个指向服务器公网 IP 的域名，如 `api.example.com`；
- 已安装 Git、Docker Engine 和 Docker Compose 插件；
- 公网防火墙已开放 TCP 80、443，未开放 6379、8100；
- 一个可通过 HTTPS 访问的 NewAPI 地址。

检查 Docker：

```bash
docker --version
docker compose version
```

若尚未安装 Docker，请使用 Docker 官方文档提供的仓库安装方式，不要使用来源不明的一键脚本。

## 3. DNS 与防火墙

在域名服务商处添加：

- `A` 记录：`api.example.com` → 服务器 IPv4；
- 若服务器正确配置 IPv6，再添加 `AAAA` 记录。

等待解析生效后，在服务器检查：

```bash
getent hosts api.example.com
```

只开放必要端口。以 UFW 为例：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

云服务器还需要在安全组中开放 80 和 443。

## 4. 获取项目

将下面仓库地址替换成项目真实 Git 地址：

```bash
sudo mkdir -p /opt/newapi-mobial
sudo chown "$USER":"$USER" /opt/newapi-mobial
git clone https://github.com/kylemarvin884/newapi-mobial.git /opt/newapi-mobial
cd /opt/newapi-mobial
```

也可以下载 Release 源码压缩包并解压到 `/opt/newapi-mobial`。最终目录中必须能看到 `docker-compose.yml`、`server/` 和 `mobile/`。

## 5. 配置后端

复制示例文件：

```bash
cd /opt/newapi-mobial
cp server/.env.example server/.env
chmod 600 server/.env
```

生成会话加密密钥：

```bash
openssl rand -hex 32
```

编辑配置：

```bash
nano server/.env
```

最小生产配置示例：

```dotenv
ENVIRONMENT=production
NEWAPI_BASE_URL=https://newapi.example.com
REDIS_URL=redis://redis:6379/0
SESSION_SECRET=把刚才生成的64位十六进制随机值粘贴到这里
SESSION_TTL_SECONDS=2592000
REQUEST_TIMEOUT_SECONDS=60
QUOTA_PER_UNIT=500000
CURRENCY_SYMBOL=¥
CORS_ORIGINS=[]
```

字段说明：

| 变量 | 必填 | 说明 |
|---|---:|---|
| `NEWAPI_BASE_URL` | 是 | 你的 NewAPI 根地址，不带结尾 `/`，也不要附加 `/api` |
| `SESSION_SECRET` | 是 | 至少 32 字符；更换后现有用户会话将全部失效 |
| `REDIS_URL` | 是 | 使用 Compose 时保持默认值 |
| `SESSION_TTL_SECONDS` | 否 | App 会话有效期，默认 30 天 |
| `REQUEST_TIMEOUT_SECONDS` | 否 | 调用 NewAPI 的超时秒数 |
| `QUOTA_PER_UNIT` | 是 | 必须与 NewAPI 的额度换算单位一致 |
| `CURRENCY_SYMBOL` | 否 | App 显示的货币符号 |
| `CORS_ORIGINS` | 否 | 原生 App 通常保持 `[]`；Web 客户端需填 JSON 数组 |

不要提交 `server/.env`，也不要把它发送给其他人。

### NewAPI 侧准备

根据你要开放的功能，在 NewAPI 管理后台确认：

- 用户登录可用；
- 如允许注册，已启用密码注册和邮箱验证，并配置 SMTP；
- 用户分组和模型已正确关联；
- 用户可以创建 API Key；
- 已设置合理的单用户 Key 数量、额度和请求频率限制；
- NewAPI 的公网证书有效，服务器时间准确。

## 6. 启动后端

```bash
cd /opt/newapi-mobial
docker compose build --pull
docker compose up -d
```

查看状态和日志：

```bash
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=50 redis
```

本机健康检查：

```bash
curl --fail http://127.0.0.1:8100/health
```

期望输出：

```json
{"status":"ok"}
```

如果失败，先执行 `docker compose logs api`。最常见原因是缺少 `server/.env`、`SESSION_SECRET` 太短，或配置文件格式错误。

## 7. 配置 HTTPS（推荐 Caddy）

Caddy 能自动申请和续期 Let's Encrypt 证书，适合首次部署。

安装 Caddy 后，复制模板：

```bash
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile
sudo sed -i 's/api\.example\.com/你的API域名/g' /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

例如你的域名是 `api.my-domain.com`：

```bash
sudo sed -i 's/api\.example\.com/api.my-domain.com/g' /etc/caddy/Caddyfile
```

验证公网 HTTPS：

```bash
curl --fail https://api.my-domain.com/health
```

若证书申请失败，请检查：

1. 域名是否已解析到这台服务器；
2. 80/443 是否同时在系统防火墙和云安全组开放；
3. 是否已有 Nginx、Apache 或其他程序占用 80/443；
4. Caddy 日志：`journalctl -u caddy -n 100 --no-pager`。

## 8. 配置 HTTPS（可选 Nginx + Certbot）

如果服务器已经使用 Nginx，可使用项目模板。先把模板复制到临时文件并替换域名：

```bash
cd /opt/newapi-mobial
sed 's/api\.example\.com/api.my-domain.com/g' deploy/nginx-bootstrap.conf \
  | sudo tee /etc/nginx/sites-available/newapi-mobile >/dev/null
sudo ln -s /etc/nginx/sites-available/newapi-mobile /etc/nginx/sites-enabled/newapi-mobile
sudo mkdir -p /var/www/certbot
sudo nginx -t
sudo systemctl reload nginx
```

申请证书：

```bash
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d api.my-domain.com
```

安装 HTTPS 配置：

```bash
sed 's/api\.example\.com/api.my-domain.com/g' deploy/nginx-app-api.conf \
  | sudo tee /etc/nginx/sites-available/newapi-mobile >/dev/null
sudo nginx -t
sudo systemctl reload nginx
curl --fail https://api.my-domain.com/health
```

项目 Nginx 模板还提供可选的 APK、版本清单和下载页面。它假定项目位于 `/opt/newapi-mobial`；若使用其他目录，请同步替换模板内路径。

## 9. 连接移动端

后端部署成功并不意味着旧 APK 会自动连接你的服务器。API 地址在构建时写入 App，因此必须用自己的地址重新构建。

```bash
cd /opt/newapi-mobial/mobile
cp .env.example .env
nano .env
```

至少修改：

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://api.my-domain.com/api/v1
```

如果启用应用内更新、下载和分享页面，还应设置其余 URL。详见 `mobile/.env.example`。

编辑 `mobile/.env` 中的应用身份配置：

```dotenv
APP_NAME=你的应用名称
APP_SLUG=your-app-slug
APP_SCHEME=yourapp
ANDROID_PACKAGE=com.yourcompany.yourapp
IOS_BUNDLE_IDENTIFIER=com.yourcompany.yourapp
EAS_PROJECT_ID=
EXPO_PUBLIC_STORAGE_NAMESPACE=your-app-slug
```

`mobile/app.config.ts` 会在构建时将这些值应用到 Expo 配置。首次使用 EAS 时运行 `npx eas-cli init`，它会创建或关联你自己的 EAS 项目；不要复用仓库作者的项目 ID。仍需更新 `mobile/app.json` 中的版本号、Android `versionCode` 和 iOS `buildNumber`。

本地预览：

```bash
npm ci
npm run typecheck
npm run lint
npx expo start
```

> Expo Go 不能验证 Android 原生桌面小组件。小组件必须使用 Development Build 或正式 APK。

### 使用 EAS 构建 Android APK

```bash
cd /opt/newapi-mobial/mobile
npx eas-cli login
npx eas-cli init
```

`mobile/.env` 适合本地构建，但默认不会作为机密上传到 EAS。请用 EAS 环境变量配置你的 `EXPO_PUBLIC_*` 值，例如：

```bash
npx eas-cli env:create --name EXPO_PUBLIC_API_BASE_URL \
  --value https://api.my-domain.com/api/v1 \
  --environment preview \
  --visibility plaintext
```

生产环境再以 `--environment production` 创建相同变量。其他下载和更新 URL 按需创建。然后运行：

```bash
npx eas-cli build --platform android --profile preview
```

`preview` 配置生成可直接安装的 APK。每次修改 API 地址或 App 代码，都必须重新构建并安装。

### iOS

iOS 真机构建需要 Apple Developer 账号、属于你的 Bundle ID 和签名凭据：

```bash
npx eas-cli build --platform ios --profile production
```

商店发布前还需准备隐私政策、数据使用说明和应用商店资料。

## 10. 应用品牌与更新清单

项目默认不绑定任何个人品牌。部署者可以在 `mobile/.env` 或 EAS 环境变量中自定义：

- App 显示名称、slug、Deep Link scheme；
- Android package 和 iOS Bundle ID；
- API、下载、更新清单和分享地址；
- EAS projectId；
- 本地存储命名空间。

修改这些值后必须重新构建 App。已经安装的旧 App 不会自动改变名称、包名或后端地址。

### 可选：托管 APK 和更新清单

若要让 Android App 内的“检查更新”可用：

1. 将 APK 按你的应用名称命名（例如 `my-ai.apk`），放到服务器 `/opt/newapi-mobial/`；
2. 复制并修改 `android-release.example.json` 为 `android-release.json`；
3. 填入你的域名、版本号、文件大小和 SHA-256；
4. 使用项目 Nginx 模板，或在 Caddy 中自行添加静态文件路由；
5. 确保 App 构建时配置了对应的清单和下载 URL。

计算文件信息：

```bash
stat -c %s app.apk
sha256sum app.apk
```

每次发布需同步递增：

- `mobile/app.json` 的 `expo.version`；
- Android 的 `versionCode`；
- iOS 的 `buildNumber`；
- 发布清单中的版本字段。

## 11. 升级与回滚

升级前备份配置：

```bash
cd /opt/newapi-mobial
cp server/.env "$HOME/newapi-mobile.env.backup"
docker compose exec redis redis-cli BGSAVE
```

升级：

```bash
git pull --ff-only
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:8100/health
curl --fail https://api.my-domain.com/health
```

查看日志：

```bash
docker compose logs -f --tail=200 api
```

代码升级失败时，可切回之前的 Git tag/commit 后重新执行 `docker compose up -d --build`。不要在没有备份的情况下删除 Redis Volume。

## 12. 备份与卸载

重要数据：

- `server/.env`：部署配置和会话加密密钥；
- Docker Volume `mobile_redis`：会话、待处理登录和累计 Token；
- 自行托管的 APK、发布清单和下载页面。

停止服务但保留数据：

```bash
docker compose down
```

完全删除（会删除 Redis 数据，谨慎执行）：

```bash
docker compose down -v
```

## 13. 上线验收清单

- [ ] `curl http://127.0.0.1:8100/health` 成功；
- [ ] `curl https://你的域名/health` 成功且证书有效；
- [ ] 6379 和 8100 无法从公网访问；
- [ ] `server/.env` 权限为 600，且未提交到 Git；
- [ ] `SESSION_SECRET` 是独立随机值；
- [ ] NewAPI 登录、注册（若开放）、模型分组和 Key 创建正常；
- [ ] App 使用自己的 API 域名重新构建；
- [ ] Android 包名、iOS Bundle ID、EAS projectId 已替换；
- [ ] 登录、2FA、余额、Key 管理、聊天和生图逐项测试；
- [ ] 已设置限流、监控、备份和隐私政策。

## 14. 故障排查

### App 提示网络请求失败

- 用手机浏览器访问 `https://你的域名/health`；
- 确认 App 构建时地址包含 `/api/v1`；
- 确认修改地址后重新构建并安装了 APK；
- 查看 `docker compose logs api` 和反向代理日志。

### 返回 401

- 登录会话可能过期；先退出再重新登录；
- 检查 NewAPI 登录/刷新接口是否与当前版本兼容；
- 检查服务器时间：`timedatectl status`；
- 不要随意更换 `SESSION_SECRET`。

### 登录成功但没有模型

检查 NewAPI 用户分组、模型授权及 `/api/user/models?group=...` 的返回。

### 聊天或生图超时

增加 `REQUEST_TIMEOUT_SECONDS`，并同时调整反向代理超时；确认上游模型和 API Key 可用。

### 修改配置后没有生效

后端配置变更后重建容器：

```bash
docker compose up -d --build --force-recreate api
```

移动端 `EXPO_PUBLIC_*` 变量是构建时配置，修改后必须重新构建 App。
