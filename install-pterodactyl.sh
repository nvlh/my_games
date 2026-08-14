#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/nvlh/my_games.git}"
APP_DIR="${APP_DIR:-/home/container/xiaobawang-arcade}"
BRANCH="${BRANCH:-main}"

usage() {
  cat <<'EOF'
用法：
  bash install-pterodactyl.sh
  APP_DIR=/home/container/game APP_PORT=3600 bash install-pterodactyl.sh

脚本只负责下载、安装依赖和构建，不会启动常驻 Node 进程，也不会覆盖已有 .env 文件。
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then
  echo "错误：缺少 git。请在翼龙镜像中选择带 git 的 Node.js 镜像。" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "错误：缺少 Node.js 20+。请在翼龙 Startup 镜像中选择 Node.js 20 或更高版本。" >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if (( NODE_MAJOR < 20 )); then
  echo "错误：当前 Node.js 版本为 $(node --version)，需要 Node.js 20 或更高版本。" >&2
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "错误：缺少 corepack，无法启用 pnpm。" >&2
  exit 1
fi

corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@10.4.1 --activate >/dev/null 2>&1 || true

if [[ -d "$APP_DIR/.git" ]]; then
  echo "更新已有项目：$APP_DIR"
  git -C "$APP_DIR" fetch --depth=1 origin "$BRANCH"
  git -C "$APP_DIR" checkout -q "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  echo "克隆项目到：$APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [[ ! -f package.json ]]; then
  echo "错误：仓库中没有 package.json，无法继续。" >&2
  exit 1
fi

if [[ -f pnpm-lock.yaml ]]; then
  pnpm install --frozen-lockfile
else
  pnpm install
fi

pnpm build

if [[ ! -f dist/index.js ]]; then
  echo "错误：构建结束但没有找到 dist/index.js。" >&2
  exit 1
fi

cat <<EOF

安装和构建完成。

翼龙 Startup Command：
  PORT=\${SERVER_PORT} NODE_ENV=production npm start

如果面板不能展开变量，请把 \${SERVER_PORT} 替换为翼龙分配的实际 TCP 端口，例如 3600；不要把 {{SERVER_PORT}} 原样传给 Node。
项目目录：$APP_DIR
生产入口：dist/index.js
EOF
