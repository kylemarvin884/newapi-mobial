# 发布与运维

## 查看运行状态

```bash
cd /opt/newapi-mobial
docker compose ps
docker compose logs --tail=200 api
docker compose logs --tail=100 redis
curl --fail http://127.0.0.1:8100/health
curl --fail https://你的API域名/health
```

## 升级

```bash
cd /opt/newapi-mobial
cp server/.env "$HOME/newapi-mobial.env.backup"
docker compose exec redis redis-cli BGSAVE
git pull --ff-only
docker compose build --pull
docker compose up -d
docker compose ps
```

升级后应测试登录、余额、模型、聊天和生图，而不只是 `/health`。

## 回滚

记录升级前的 commit：

```bash
git rev-parse HEAD
```

失败时切回已知可用的 tag/commit，再重建：

```bash
git checkout <KNOWN_GOOD_COMMIT>
docker compose up -d --build
```

## 数据与备份

需要保护：

- `server/.env`；
- Redis Docker Volume；
- APK、发布清单和下载页面（若自行托管）；
- Nginx/Caddy 站点配置。

`docker compose down` 保留 Volume；`docker compose down -v` 会删除 Redis 数据，不应作为普通停止命令。

## 文档站更新

本仓库使用 MkDocs Material：

```bash
python -m pip install -r requirements-docs.txt
$env:DOCS_SITE_URL = 'https://docs.example.com/'
$env:REPO_URL = 'https://github.com/your-org/your-repo'
$env:REPO_NAME = 'your-org/your-repo'
mkdocs build --strict

# Linux/macOS 示例：
# DOCS_SITE_URL=https://docs.example.com/ REPO_URL=https://github.com/your-org/your-repo REPO_NAME=your-org/your-repo mkdocs build --strict
```

生成目录是 `site/`。将其同步到服务器文档站根目录，例如：

```bash
rsync -az --delete site/ root@服务器:/var/www/docs/
```

仓库提供 `deploy/deploy-docs.sh`，在服务器拉取公开仓库后可直接执行：

```bash
cd /opt/newapi-mobial
bash deploy/deploy-docs.sh
```

默认部署目录是 `/var/www/docs`，可通过 `WEB_ROOT` 环境变量覆盖：

```bash
WEB_ROOT=/var/www/docs bash deploy/deploy-docs.sh
```

在 Web 服务器中创建纯静态站点，绑定你自己的文档域名（例如 `docs.example.com`），申请 Let's Encrypt 证书并开启 HTTP → HTTPS。网站根目录指向 `/var/www/docs`（或你自定义的 `WEB_ROOT`），默认文档使用 `index.html`。

## 日志和隐私

公开日志前先检查是否含有：

- Authorization header；
- NewAPI Cookie 或 API Key；
- 邮箱、用户 ID 或聊天内容；
- `SESSION_SECRET` 或完整 `.env`。

生产环境应启用日志轮转、磁盘告警、容器监控、NTP 和系统安全更新。
