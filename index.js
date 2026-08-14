// Pingless / Pterodactyl 根目录启动入口。
// 该入口直接运行项目源代码和 Vite 中间件，不读取 dist/index.js，也不会自动创建 dist/。
// 只需要把下面的端口改成 Pingless 分配的实际 TCP 端口。
const FIXED_PORT = 3600;

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const tsxCli = resolve(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");

if (!existsSync(tsxCli)) {
  console.error("[Startup] 找不到 tsx 运行器。请确认 Pingless 已完成 npm install，并保留 devDependencies。");
  process.exit(1);
}

const env = {
  ...process.env,
  NODE_ENV: "development",
  PORT: String(FIXED_PORT),
};

console.log("[Startup] 直接运行源代码模式，不依赖 dist/index.js");
console.log(`[Startup] PORT=${env.PORT}`);

const child = spawn(process.execPath, [tsxCli, resolve(projectRoot, "server", "_core", "index.ts")], {
  cwd: projectRoot,
  env,
  stdio: "inherit",
});

const forwardSignal = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("error", (error) => {
  console.error("[Startup] 源代码服务启动失败。", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[Startup] 子进程收到 ${signal} 并退出。`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
