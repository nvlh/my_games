# 浏览器模拟器调研结论

EmulatorJS 官方文档说明，它通过 WebAssembly 在现代浏览器中运行，通常将游戏 ROM 作为 `EJS_gameUrl` 传入，并通过 `EJS_core` 指定模拟器核心；文档还提供 React/单页应用嵌入说明。[1]

官方系统列表列出 Nintendo Game Boy Advance、PSP 与 Sega Saturn，但页面特别提示系统列表可能过时，应以最新核心列表为准。[2] 因此项目可以把 GBA、PSP、SS 设计成三个独立适配器，不应假定三个平台具有相同的 ROM 格式、BIOS 需求或性能表现。

初步接入顺序建议为：先做 GBA 用户本地 ROM 导入和浏览器运行验证；再评估 PSP 与 SS 的 WebAssembly 核心、移动端帧率、音频同步和 BIOS 配置。ROM 只允许用户自行选择并在本地会话中加载，网站不提供 ROM 下载或预置未经授权的 BIOS/游戏文件。

[1]: https://emulatorjs.org/docs/getting-started/ "EmulatorJS Getting Started"
[2]: https://emulatorjs.org/docs/systems/ "EmulatorJS Supported Systems"
