# 本地开发

## 移动端

要求：Node.js LTS、npm，以及 Android Studio / Xcode 或安装了 Expo Go 的真机。

```bash
cd mobile
cp .env.example .env
# 编辑 .env：至少填写 APP_NAME、EXPO_PUBLIC_API_BASE_URL、自己的包名
npm ci
npm run typecheck
npm run lint
npx expo start
```

手机不能使用电脑的 `127.0.0.1`。局域网调试时，应填写电脑局域网 IP，并确认防火墙允许访问；生产构建推荐使用有效的公网 HTTPS 域名。

### 常用命令

```bash
npm run android
npm run ios
npm run web
npm run typecheck
npm run lint
npx expo install --check
```

Android 桌面小组件包含原生代码，Expo Go 无法加载，需使用 Development Build 或 APK。

## 后端

要求 Python 3.12、Redis，以及可访问的 NewAPI。

```bash
cd server
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
# .\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
cp .env.example .env
pytest
uvicorn app.main:app --reload --port 8000
```

本地运行后访问：

- 健康检查：`http://127.0.0.1:8000/health`
- 开发 API 文档：`http://127.0.0.1:8000/docs`

将 `ENVIRONMENT` 设置为非 `production` 才会启用 Swagger 文档。

## 代码质量

提交前至少执行：

```bash
cd server
pytest

cd ../mobile
npm run typecheck
npm run lint
```

不要提交 `.env`、虚拟环境、`node_modules`、APK、证书、备份或临时构建目录。
