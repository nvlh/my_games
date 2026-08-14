# ROM 游戏库目录规范

## 推荐目录结构

```text
rom-library/
├── gba/
│   ├── action/
│   │   └── game-slug/
│   │       ├── rom/              # 用户自行上传的合法 ROM，不提交到项目仓库
│   │       ├── cover.webp        # 游戏封面，推荐 640×360 或 3:2
│   │       ├── screenshots/      # 游戏截图，可放 1–4 张
│   │       └── game.json         # 标题、平台、类型、玩家数、描述
│   ├── rpg/
│   ├── platform/
│   └── strategy/
├── saturn/
│   ├── action/
│   ├── fighting/
│   ├── racing/
│   └── rpg/
└── psp/
    ├── action/
    ├── rpg/
    ├── racing/
    └── strategy/
```

## 图片应该放在哪里

对应游戏的**主封面**放在该游戏自己的目录中，文件名固定为 `cover.webp`。例如：

```text
rom-library/gba/action/metal-ranger/cover.webp
```

对应游戏的**游戏截图**放在同一目录下的 `screenshots/` 子目录中，例如：

```text
rom-library/gba/action/metal-ranger/screenshots/01-stage.webp
rom-library/gba/action/metal-ranger/screenshots/02-boss.webp
```

网站界面使用 `cover.webp` 作为游戏卡片和详情页主图；截图只在游戏详情页或预览弹窗中显示。图片不会放在 `rom/` 目录，也不建议把所有封面集中放在一个全局图片文件夹，因为这样会让平台、类型和游戏之间失去一一对应关系。

## 推荐图片规格

| 用途 | 文件名 | 推荐尺寸 | 格式 | 说明 |
|---|---|---:|---|---|
| 游戏卡片封面 | `cover.webp` | 640×360 或 3:2 | WebP/JPEG | 保留主体和安全留白，不放过多小字 |
| 游戏截图 | `screenshots/01-stage.webp` | 1280×720 或原始比例 | WebP/PNG | 按显示顺序编号 |
| 平台图标 | 由网站内置 | 64×64 | SVG/PNG | 不随单个游戏重复上传 |
| 品牌或类型图标 | 由网站内置 | 32–128 | SVG/PNG | 使用统一图标系统 |

## 元数据示例

```json
{
  "title": "铁锈突围",
  "slug": "metal-ranger",
  "platform": "gba",
  "genres": ["action", "platform"],
  "players": 1,
  "input": ["keyboard", "gamepad", "touch"],
  "romFile": "rom/metal-ranger.gba",
  "cover": "cover.webp",
  "screenshots": ["screenshots/01-stage.webp", "screenshots/02-boss.webp"],
  "license": "user-owned",
  "description": "用户自行导入的合法 ROM，网站仅保存游戏条目和本地运行配置。"
}
```

## 压缩包与 ROM 处理规则

当前版本不在浏览器中自动解压或上传 ROM。支持直接识别 `.gba`、`.iso`、`.cue`、`.bin`、`.cso` 和 `.pbp` 扩展名；`.zip`、`.7z`、`.rar` 等压缩包必须由用户在本地解压后，再选择其中合法的 ROM 文件。这样可以避免服务端解压未知文件、路径穿越和把多个游戏误识别为一个条目。若未来需要压缩包导入，应先在浏览器端完成安全解压、检查文件数量与大小，再交给对应模拟器核心。

## 元数据字段

`game.json` 至少包含 `title`、`slug`、`platform`、`genres`、`players`、`input`、`releaseStatus`、`license`、`romFile`、`cover` 和 `screenshots`。其中 `releaseStatus` 使用 `released`、`prototype` 或 `unreleased`；`license` 使用 `user-owned`、`authorized` 或 `original`。游戏库界面将展示平台、类型、玩家数、操控方式和运行状态，避免把本地导入误认为网站已托管 ROM。

## 前端图片引用方式

部署时不要在代码中引用项目内的大型本地路径。封面和截图应先上传到项目对象存储，使用返回的 `/manus-storage/{key}` URL 写入游戏元数据；如果只是用户本地预览，则使用浏览器 `URL.createObjectURL(file)`，关闭或清除条目时释放该 URL。`cover.webp` 用于游戏卡片，`screenshots/*` 用于详情页或预览弹窗。

## 上传与部署规则

在当前静态网站版本中，用户上传的 ROM 和图片应先作为浏览器本地文件读取，不应写入项目仓库，也不应由网站提供下载。若要让登录用户跨设备保存 ROM、封面和存档，需要先升级到带文件存储和用户管理的全栈项目，并增加大小限制、文件类型校验、删除入口与授权声明。

真实游戏名称、原版封面和截图只能在用户拥有相应授权或自行提供的前提下使用。没有授权时，建议使用原创封面或“风格化占位封面”，不要复制第三方商标、角色立绘或官方宣传图。

## NES 与 WSC 平台说明

NES 文件使用 `.nes` 扩展名，应归入 `NES` 平台；WSC 文件使用 `.wsc` 扩展名，应归入 `WSC / WonderSwan Color` 平台。`.gba` 只代表 GBA，不应把 `.wsc` 文件标记为 GBA。当前页面会根据扩展名分别显示 NES、GBA、WSC、土星 SS 或 PSP 标签；未接入对应模拟器核心的平台仍只显示已收录状态，不会误启动其他平台的游戏。
