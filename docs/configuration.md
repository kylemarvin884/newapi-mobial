# 配置说明

## 后端环境变量

从模板创建真实配置：

```bash
cp server/.env.example server/.env
chmod 600 server/.env
```

| 变量 | 必填 | 默认/示例 | 说明 |
|---|---:|---|---|
| `ENVIRONMENT` | 否 | `production` | 生产模式关闭 `/docs` |
| `APP_NAME` | 否 | `NewAPI Mobile API` | 后端日志和 API 文档显示名称 |
| `REDIS_NAMESPACE` | 否 | `newapi-mobile` | 多套实例共用 Redis 时必须使用不同值 |
| `NEWAPI_BASE_URL` | 是 | `https://newapi.example.com` | NewAPI 根地址，不附加 `/api` |
| `REDIS_URL` | 是 | `redis://redis:6379/0` | Compose 内保持默认 |
| `SESSION_SECRET` | 是 | 随机 32+ 字符 | 加密会话；更换后旧会话失效 |
| `SESSION_TTL_SECONDS` | 否 | `2592000` | Session 滑动有效期 |
| `REQUEST_TIMEOUT_SECONDS` | 否 | `60` | NewAPI 请求超时 |
| `QUOTA_PER_UNIT` | 是 | `500000` | 与 NewAPI 额度单位一致 |
| `CURRENCY_SYMBOL` | 否 | `¥` | App 显示符号 |
| `CORS_ORIGINS` | 否 | `[]` | 浏览器来源 JSON 数组 |

生成密钥：

```bash
openssl rand -hex 32
```

!!! danger "不要公开密钥"
    不要提交 `server/.env`，也不要把它粘贴到 Issue、日志或截图中。

## 移动端构建变量

```bash
cd mobile
cp .env.example .env
```

最重要的变量：

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
```

应用身份和品牌也可以配置：

```dotenv
APP_NAME=我的 AI 助手
APP_SLUG=my-ai-assistant
APP_SCHEME=myaiassistant
ANDROID_PACKAGE=com.example.myaiassistant
IOS_BUNDLE_IDENTIFIER=com.example.myaiassistant
EAS_PROJECT_ID=你的EAS项目ID
EXPO_PUBLIC_STORAGE_NAMESPACE=my-ai-assistant
```

`APP_NAME` 是用户看到的应用名称；`APP_SLUG`、`APP_SCHEME`、Android package、iOS Bundle ID 和存储命名空间必须使用你自己的值。包名只能使用合法的反向域名格式，且不能与其他应用重复。

更新功能还可以配置：

```dotenv
EXPO_PUBLIC_ANDROID_DOWNLOAD_URL=https://api.example.com/downloads/app.apk
EXPO_PUBLIC_ANDROID_RELEASE_MANIFEST_URL=https://api.example.com/downloads/android-release.json
EXPO_PUBLIC_ANDROID_SHARE_URL=https://api.example.com/download
EXPO_PUBLIC_IOS_DOWNLOAD_URL=https://api.example.com/ios
EXPO_PUBLIC_IOS_RELEASE_MANIFEST_URL=https://api.example.com/downloads/ios-release.json
EXPO_PUBLIC_IOS_SHARE_URL=https://api.example.com/ios
```

`EXPO_PUBLIC_*` 会写入 App 包，不是秘密。EAS 云构建需要在 EAS 项目中创建相同环境变量。

## 原生应用身份

公开或商店构建前，推荐通过 `mobile/.env` 或 EAS 环境变量配置身份。`mobile/app.config.ts` 会将这些变量应用到 Expo 配置：

- `APP_NAME`：用户看到的应用名称；
- `APP_SLUG`：Expo 项目标识；
- `APP_SCHEME`：Deep Link scheme；
- `ANDROID_PACKAGE`：Android 包名；
- `IOS_BUNDLE_IDENTIFIER`：iOS Bundle ID；
- `EAS_PROJECT_ID`：你自己的 EAS 项目标识；
- `EXPO_PUBLIC_STORAGE_NAMESPACE`：本地存储命名空间。

不要复用其他人的包名、签名或 EAS projectId。没有配置 `EAS_PROJECT_ID` 时，先运行 `npx eas-cli init` 关联你自己的 EAS 项目。
