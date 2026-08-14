# 小霸王街机厅 VPS 部署说明

## 运行环境

建议使用 Ubuntu 22.04/24.04、Node.js 20 或更高版本、pnpm 10、MySQL 8/TiDB，以及 HTTPS 反向代理。推荐起步配置为 2 vCPU、4 GB RAM、50 GB SSD。

## GitHub 一键安装与构建

在翼龙 Console 中执行以下命令，脚本会从 GitHub 克隆项目、启用 pnpm、安装依赖并构建生产文件：

```bash
curl -fsSL https://raw.githubusercontent.com/nvlh/my_games/main/install-pterodactyl.sh | bash
```

脚本默认安装到 `/home/container/xiaobawang-arcade`，也可以自定义目录：

```bash
APP_DIR=/home/container/xiaobawang-arcade bash install-pterodactyl.sh
```

脚本完成后，如果面板不能输入 Startup Command，只需打开项目根目录的 `index.js`，修改：

```js
const FIXED_PORT = 3600;
const USE_PANEL_PORT = false;
```

把 `3600` 换成翼龙实际分配的 TCP 端口，然后将 Main File 设置为 `index.js`。本地开发或手动构建仍可执行：

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

生产环境不要执行 `pnpm drizzle-kit migrate` 代替审阅迁移；请先检查 `drizzle/` 下的 SQL，再在目标数据库中执行迁移。当前公共存档迁移包含 `drizzle/0000_mute_romulus.sql` 和 `drizzle/0001_adorable_leo.sql`。

## 必需环境变量

至少需要设置 `DATABASE_URL`、`JWT_SECRET`、`BUILT_IN_FORGE_API_URL` 和 `BUILT_IN_FORGE_API_KEY`。数据库用于保存游戏和公共存档索引；对象存储用于保存存档快照。若改用自建对象存储，需要同步替换 `server/storage.ts` 的实现，不要把 ROM 或存档字节直接写入数据库。

## SVER00 / 受限 Node 主机

如果主机日志显示 `Invalid PORT: {{SERVER_PORT}}`，说明主机没有替换翼龙模板变量。SVER00 这类受限 Node 主机必须在面板中使用实际数字 TCP 应用端口，例如 `3600`，不能把 `{{SERVER_PORT}}` 原样写入环境变量。

打开根目录 `index.js`，把 `FIXED_PORT` 改成实际 TCP 端口，并保持 `USE_PANEL_PORT = false`。启动后成功日志应为 `Server running on 0.0.0.0:实际端口/`。如果直接打开域名返回 404，但 `http://服务器IP:3600` 可以访问，说明 Node 服务正常，域名还需要由主机管理员配置反向代理到 `http://127.0.0.1:3600`；普通受限用户无法修改系统级 Nginx。

`OAUTH_SERVER_URL is not configured` 只影响 OAuth 登录初始化，不影响当前匿名公共存档和公开游戏库页面；只有启用登录功能时才需要配置真实 OAuth 服务地址。

## 翼龙面板（Pterodactyl / Pingless）

翼龙默认启动模板可能会执行 `ts-node /home/container/${MAIN_FILE}`；本项目先构建到 `dist/index.js`，再由根目录 `index.js` 加载生产服务。请将 `MAIN_FILE` 设置为 `index.js`，或把启动命令改为下面的生产启动命令：

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npm install && npm run build && PORT=${SERVER_PORT} NODE_ENV=production node index.js
```

如果翼龙无法展开 `${SERVER_PORT}`，请改成实际数字端口，例如 `PORT=3600`；不要把 `{{SERVER_PORT}}` 原样传给 Node。

如果翼龙面板会自动执行 `npm install`，请在环境变量中设置 `NPM_CONFIG_LEGACY_PEER_DEPS=true`，或在安装命令中加入 `--legacy-peer-deps`。当前项目已移除与 Vite 7 不兼容的 JSX 定位插件，正常情况下不再需要该兼容参数。

如果面板支持环境变量，可以把 `USE_PANEL_PORT` 改为 `true`，让 `index.js` 读取翼龙注入的 `PORT`；如果面板不支持输入命令或变量，则保持 `USE_PANEL_PORT = false`，直接编辑 `FIXED_PORT`。不要把 `{{SERVER_PORT}}` 原样写进端口配置。

请把 `MAIN_FILE` 设置为 `index.js`。根目录 `index.js` 会加载生产构建文件 `dist/index.js`，并确保构建步骤已经先执行。

## HTTP 502 排查

HTTP 502 表示域名代理没有连接到 Node 服务，常见原因是主文件没有设置为 `index.js`、构建后的 `dist/index.js` 不存在、`FIXED_PORT` 与翼龙分配端口不一致，或反向代理转发到了错误端口。启动成功日志应包含 `Server running on 0.0.0.0:实际端口/`；如果没有这行，说明 Node 尚未成功启动。如果有这行但域名仍为 502，说明代理目标端口需要改成相同的实际端口。

### 翼龙自动 npm install 被 Killed

部分翼龙 Node Egg 的默认启动模板会在每次启动前自动执行：

```bash
npm install
node /home/container/${MAIN_FILE}
```

如果控制台出现 `Killed /usr/local/bin/npm install`，这是容器内存限制导致安装进程被系统终止。由于安装没有完成，随后就会出现 `Cannot find module '/home/container/dist/index.js'`。首次部署必须先完成一次依赖安装和 `pnpm build`；后续重启不要重复安装依赖。

如果可以编辑 Startup Command，请移除自动 `npm install`，只保留启动 `index.js`，并将 Main File 设置为 `index.js`。如果面板不能修改启动模板，请让主机管理员关闭 Egg 的自动安装步骤，或提高容器内存后完成一次安装构建。不能输入命令时，用户只需确认 Main File 为 `index.js`，并在项目根目录把 `FIXED_PORT` 改成翼龙分配端口，保持 `USE_PANEL_PORT = false`；但 `dist/index.js` 必须已经存在。

启动成功后应看到：

```text
Server running on 0.0.0.0:实际端口/
```

如果没有该日志，域名代理即使端口正确也会返回 502。

## 反向代理

Node 服务必须监听翼龙分配的实际端口。`index.js` 提供固定端口配置，方便不能输入命令的面板；Nginx/Caddy 仍需将 HTTPS 流量转发到同一个应用端口，并设置上传请求大小限制。当前存档快照单条限制为 2 MB，ROM 不由网站自动上传或分发。

## 版权与资源

本项目不包含 ROM、BIOS、原版音乐、官方封面或未经授权的游戏素材。用户只能上传自己拥有或获授权的文件。真正的 GBA、土星 SS 和 PSP 模拟器核心仍需单独取得合法授权并适配。
