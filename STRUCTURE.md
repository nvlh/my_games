# 小霸王街机厅结构

## React 外壳

`client/src/pages/Home.tsx` 负责档案大厅、游戏选择、投币启动弹窗和响应式 UI；`client/src/components/GameCanvas.tsx` 负责 Babylon Engine 生命周期，只承载画布，不包含档案室 UI 状态。

## Babylon 游戏层

`client/src/game/scene.ts` 导出 `createGameScene(engine, canvas, mode, demo)`，根据 `ArcadeMode` 加载三种原创风格的展柜背景、玩家方块、投射物和统一键盘输入。后续可将每个模式拆为 `runner.ts`、`tank.ts` 与 `snow.ts`，继续保持与 React 解耦。

## 资产策略

大图不进入项目目录；生成资产保存在 `/home/ubuntu/webdev-static-assets/` 并通过 `/manus-storage/...` 生命周期 URL 引用。首版卡片媒体使用 CSS 生成的像素展柜纹理，避免生成失败占位影响交付；主展柜使用已生成的 CRT 档案室参考图。
