// 翼龙/Pterodactyl 默认启动入口。
// 只需要修改下面 FIXED_PORT 的数字即可更换服务器端口。
const FIXED_PORT = 3600;

// 先设置 PORT，再加载生产构建，确保服务器使用上面的固定端口。
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.PORT = String(FIXED_PORT);

// 生产构建由 pnpm build 生成 dist/index.js，面板只需启动根目录 index.js。
await import("./dist/index.js");
