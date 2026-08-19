#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/your-org/your-repo.git}"
SOURCE_DIR="${SOURCE_DIR:-/opt/newapi-mobial}"
WEB_ROOT="${WEB_ROOT:-/www/wwwroot/docs.example.com}"
VENV_DIR="${VENV_DIR:-/opt/newapi-mobial-docs-venv}"
BRANCH="${BRANCH:-main}"

if ! command -v git >/dev/null 2>&1; then
  echo "错误：未安装 git" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "错误：未安装 python3" >&2
  exit 1
fi

if [[ -d "$SOURCE_DIR/.git" ]]; then
  git -C "$SOURCE_DIR" fetch --prune origin
  git -C "$SOURCE_DIR" checkout "$BRANCH"
  git -C "$SOURCE_DIR" pull --ff-only origin "$BRANCH"
else
  rm -rf "$SOURCE_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$SOURCE_DIR"
fi

python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --disable-pip-version-check -r "$SOURCE_DIR/requirements-docs.txt"
"$VENV_DIR/bin/mkdocs" build --strict --config-file "$SOURCE_DIR/mkdocs.yml"

install -d -m 0755 "$WEB_ROOT"
find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
cp -a "$SOURCE_DIR/site/." "$WEB_ROOT/"
find "$WEB_ROOT" -type d -exec chmod 0755 {} +
find "$WEB_ROOT" -type f -exec chmod 0644 {} +

if id www >/dev/null 2>&1; then
  chown -R www:www "$WEB_ROOT"
fi

echo "文档已部署到 $WEB_ROOT"
echo "请访问你的文档域名（默认构建目录：$WEB_ROOT）"
