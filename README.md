# 小霸王街机厅

这是一个面向浏览器的复古游戏库。首页以“我的游戏库”为主入口，支持原创 Babylon.js 原型、用户自行导入的 ROM、NES 浏览器模拟器、匿名服务器存档、游戏管理、下载和删除操作。项目不内置或分发商业 ROM、BIOS、原版音乐或未经授权的封面素材；请仅上传你拥有或获授权使用的文件。

## 在线地址

项目预览与部署站点：<https://xiaobawang-c6sjtqci.manus.space>

GitHub 仓库：<https://github.com/nvlh/my_games>

## 技术栈与目录

| 目录或文件 | 作用 |
| --- | --- |
| `client/` | React 19 前端、游戏库页面和 NES 播放器 |
| `server/` | Express、tRPC、数据库助手和对象存储接口 |
| `drizzle/` | MySQL/TiDB 数据表与迁移 SQL |
| `shared/` | 前后端共享类型和常量 |
| `install-pterodactyl.sh` | 翼龙 Node VPS 下载、安装和构建脚本 |
| `DEPLOY_VPS.md` | 受限 VPS、反向代理和环境变量说明 |

## 本地开发

项目需要 Node.js 20 或更高版本、pnpm 10、MySQL 8/TiDB，以及用于存储 ROM 和存档快照的 S3 兼容对象存储。安装依赖后，可执行以下命令：

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install
pnpm check
pnpm test
pnpm dev
```

生产构建完成后，翼龙只需将主文件设置为根目录 `index.js`。如果面板不能输入启动命令，请直接打开 `index.js`，修改这一行：

```js
const FIXED_PORT = 3600;
```

把 `3600` 换成翼龙分配的 TCP 端口，并保持 `const USE_PANEL_PORT = false;` 不变。`index.js` 会自动加载 `dist/index.js`，监听 `0.0.0.0`，无需在面板中输入 `PORT=...` 命令。

## 必需环境变量

生产环境至少需要准备以下变量。不要把真实密钥提交到 GitHub；请在翼龙面板的 Environment 或 Secrets 中填写。

| 变量 | 用途 |
| --- | --- |
| `PORT` | 翼龙分配给 Node 应用的 TCP 端口 |
| `NODE_ENV=production` | 启用生产运行模式 |
| `DATABASE_URL` | MySQL/TiDB 连接地址，用于游戏和存档索引 |
| `JWT_SECRET` | 会话签名密钥 |
| `BUILT_IN_FORGE_API_URL` | 对象存储服务接口地址 |
| `BUILT_IN_FORGE_API_KEY` | 对象存储服务访问密钥 |
| `OAUTH_SERVER_URL` | 仅在启用 OAuth 登录时需要；匿名游戏库可暂不配置 |

## 翼龙 Node VPS 一键安装

在翼龙服务器的 Console 中执行下面的命令。它会从 GitHub 克隆项目、启用 pnpm、安装依赖并生成 `dist/index.js`；根目录 `index.js` 是翼龙默认启动入口，不会自动启动常驻进程，也不会覆盖已有 `.env` 文件。

```bash
curl -fsSL https://raw.githubusercontent.com/nvlh/my_games/main/install-pterodactyl.sh | bash
```

默认目录是 `/home/container/xiaobawang-arcade`。如需指定目录或分支，可使用：

```bash
REPO_URL=https://github.com/nvlh/my_games.git \
APP_DIR=/home/container/xiaobawang-arcade \
BRANCH=main \
bash install-pterodactyl.sh
```

如果你的翼龙容器当前目录就是项目目录，也可以直接执行：

```bash
bash install-pterodactyl.sh
```

安装完成后，如果面板允许填写 Main File，请填写根目录的 `index.js`。如果面板不能输入 Startup Command，则不需要填写命令；直接在项目根目录 `index.js` 中修改：

```js
const FIXED_PORT = 3600;
const USE_PANEL_PORT = false;
```

其中 `3600` 必须改成翼龙分配的实际 TCP 端口。不要把 `{{SERVER_PORT}}` 写进 `FIXED_PORT`。如果面板要求填写 Main File，应填写根目录的：

```text
index.js
```

根目录 `index.js` 会加载生产构建文件 `dist/index.js`。

## 数据库迁移

首次部署前，请先在目标数据库中审阅 `drizzle/0000_mute_romulus.sql`、`drizzle/0001_adorable_leo.sql` 和后续迁移，再按数据库管理员流程执行。不要在没有备份和审阅的情况下直接执行破坏性 SQL。ROM 文件和存档快照应保存在对象存储中，数据库只保存索引和元数据。

## 游戏库使用方法

打开网站后，页面会直接进入“我的游戏库”。使用平台筛选查看条目；使用“导入合法 ROM”读取当前浏览器会话中的本地 ROM；使用每个公开游戏行后的“编辑”按钮修改已收录游戏；新游戏上传请通过现有公开游戏上传流程或管理入口完成。公开或本地 ROM 条目后面提供下载、开始、删除和存档入口。内置原创原型不提供 ROM 下载和删除，因此这两个按钮会显示为禁用状态。

选择游戏条目后，存档下拉中第一项是“新存档”，其后是该游戏已有的历史存档。选中历史存档后，右侧会出现 X 删除按钮；存档、读取和覆盖操作始终跟随当前游戏，不再单独显示公共存档区域。

## 受限 VPS 注意事项

如果日志出现 `Killed /usr/local/bin/npm install`，表示容器在安装依赖时触发了内存限制；后面的 `Cannot find module '/home/container/dist/index.js'` 只是因为安装和构建没有完成，并不是端口错误。请先使用更大内存的 Node 容器，或让主机管理员提高内存限制，然后重新完成依赖安装和 `pnpm build`。安装脚本已关闭 npm 审计、资金提示和进度输出，并启用兼容参数，但无法绕过容器本身的内存上限。

若日志出现 `Invalid PORT: {{SERVER_PORT}}`，说明面板没有替换模板变量，请改用实际 TCP 端口。若通过域名访问返回 502，先确认启动日志含有 `Server running on 0.0.0.0:实际端口/`；如果有该行仍为 502，则需要由主机管理员把反向代理转发到同一个端口。普通无 root 用户通常不能修改系统级反向代理配置。

## 许可证与资源边界

项目源码使用仓库中的许可证声明。模拟器核心、ROM、BIOS、封面和截图可能分别受不同版权或许可证约束。使用前请确认相应文件的授权，不要通过本项目分发商业游戏文件。

## 参考资料

[1]: https://nodejs.org/en/download Node.js 官方下载页面
[2]: https://pterodactyl.io/project/introduction.html Pterodactyl 官方项目说明
[3]: https://pnpm.io/installation pnpm 官方安装文档
