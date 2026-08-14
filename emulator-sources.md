# 浏览器模拟器核心来源记录

- JSNES 官方仓库：https://github.com/bfirsh/jsnes
  - JavaScript NES emulator，可在浏览器和 Node.js 运行。
  - 支持直接加载 string、Uint8Array 或 ArrayBuffer ROM 数据。
  - 提供 canvas、音频、键盘、手柄、帧循环；NES 状态可用 `toJSON()` / `fromJSON()` 保存与恢复；电池 RAM 有 `onBatteryRamWrite` 回调。
  - 可用 npm 安装 `jsnes`，或使用仓库构建产物。

- wasm-nes 官方仓库：https://github.com/kabukki/wasm-nes
  - Rust 编译为 WebAssembly，可在浏览器加载 Uint8Array；支持部分 mapper 与 cartridge RAM 存档，但项目页面明确列出准确性和音频仍有限制。

- EmulatorJS 官方系统文档：https://emulatorjs.org/docs/systems/
  - 官方系统列表包含 NES-Famicom、GBA、PSP、Sega Saturn 等；文档提示系统列表可能过时，应以更新核心列表为准。

- EmulatorJS 官方入门文档：https://emulatorjs.org/docs/getting-started/
  - 采用 RetroArch 核心的 WebAssembly 方案；示例使用 `EJS_core = 'nes'`，通过 `EJS_gameUrl` 加载游戏，`EJS_pathtodata` 指向核心数据目录。
  - 官方说明需将核心数据部署到网站服务器；BIOS 是否需要取决于系统/核心。

合规边界：模拟器核心代码与用户拥有合法权利的 ROM 是两件事。只从官方仓库/正式发行页获取核心，不下载或分发未经授权的 ROM、BIOS 或商业游戏素材。

## 当前项目选型

当前项目已安装 `jsnes@2.1.0`，包许可证为 Apache-2.0，官方仓库为 https://github.com/bfirsh/jsnes。项目仅植入模拟器代码，不包含任何商业 ROM 或 BIOS；用户的 NES 文件仍需由用户自行提供并拥有合法使用权。
