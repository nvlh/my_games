import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { validatePublicGameFile } from "./db";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: undefined,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("publicGames", () => {
  it("lists public games for anonymous visitors", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.publicGames.list()).resolves.toBeDefined();
  });

  it("validates ROM and image file contracts", () => {
    expect(() => validatePublicGameFile("game.gba", "application/octet-stream", "rom")).not.toThrow();
    expect(() => validatePublicGameFile("game.nes", "application/octet-stream", "rom")).not.toThrow();
    expect(() => validatePublicGameFile("game.wsc", "application/octet-stream", "rom")).not.toThrow();
    expect(() => validatePublicGameFile("game.exe", "application/octet-stream", "rom")).toThrow("不支持的游戏文件格式");
    expect(() => validatePublicGameFile("cover.webp", "image/webp", "image")).not.toThrow();
    expect(() => validatePublicGameFile("cover.svg", "image/svg+xml", "image")).toThrow("仅支持 WebP");
  });

  it("validates edit IDs before touching the database", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.publicGames.update({ gameId: 0, name: "编辑测试", slug: "edit-test", platform: "nes", genre: "action", players: "单人", input: "键盘" })).rejects.toThrow();
  });

  it("validates row deletion IDs before touching the database", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.publicGames.delete({ gameId: 0 })).rejects.toThrow();
    await expect(caller.publicSaves.delete({ saveId: 0 })).rejects.toThrow();
  });

  it("rejects unsupported platforms and oversized ROM payloads", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const base = {
      name: "Test Game",
      slug: "test-game",
      genre: "action" as const,
      players: "单人",
      input: "键盘",
      romName: "test.gba",
      romContentType: "application/octet-stream",
      romPayloadBase64: "AA==",
    };
    await expect(caller.publicGames.create({ ...base, platform: "unknown" as never })).rejects.toThrow();
    await expect(caller.publicGames.create({ ...base, platform: "gba", romPayloadBase64: "x".repeat(42_000_001) })).rejects.toThrow();
  });
});
