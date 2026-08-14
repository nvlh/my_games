# NES 验证记录

日期：2026-08-14。

使用无商业素材的最小自制 iNES 测试 ROM，通过 `/?demo=nes` 打开实际 NES 模拟器弹窗。截图确认弹窗已显示 `NES CORE TEST` 标题、NES 画布区域、`NES 已就绪` 状态条、`暂停` 按钮和右上角退出入口；页面没有误启动 Babylon 原型。

自动测试覆盖：iNES 头部转码、最小 ROM 加载、帧运行、状态保存/恢复、NES 存档 payload 校验、错误 ROM/读取失败提示和 NES 开始门禁。当前 `pnpm check` 通过，Vitest 为 4 个测试文件、12 项测试全部通过。

测试 ROM 仅用于开发验证，不包含商业游戏内容。用户上传的合法 `.nes` 文件会通过服务器 `romUrl` 或本地 `File` 进入同一模拟器组件。

## 错误态验证

使用 `/?demo=nes-error` 让前端请求不存在的 `/missing-demo-rom.nes`。实际截图确认游戏弹窗标题为 `NES ERROR TEST`，画布区域保持可见，状态条显示 `NES 加载失败: Not a valid NES ROM.`，右上角退出入口和暂停控制仍存在，错误没有静默吞掉。
