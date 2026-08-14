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

脚本只负责下载和安装完整依赖，不会构建或读取 dist/，也不会启动常驻 Node 进程或覆盖已有 .env 文件。
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

# 受限翼龙容器中关闭无关网络请求，减少安装阶段资源占用。
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_FUND=false
export NPM_CONFIG_PROGRESS=false
export NPM_CONFIG_LEGACY_PEER_DEPS=true

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
  pnpm install --frozen-lockfile --reporter=silent
else
  pnpm install --reporter=silent
fi

if [[ ! -f index.js ]]; then
  echo "错误：项目根目录没有找到 index.js 启动入口。" >&2
  exit 1
fi

cat <<EOF

安装完成。

翼龙 Main File：
  index.js

推荐启动命令：
  NODE_ENV=development node index.js

如果面板不能输入命令，只需把 index.js 顶部的 FIXED_PORT 改成翼龙分配的实际 TCP 端口，例如 3600；不要把 {{SERVER_PORT}} 原样传给 Node。
项目目录：$APP_DIR
启动入口：index.js（直接运行 server/_core/index.ts，不依赖 dist/）
EOF
