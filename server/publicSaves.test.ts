import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createDefaultPublicSaveName } from "./db";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: undefined,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("publicSaves", () => {
  it("uses a stable timestamp label for newly created saves", () => {
    expect(createDefaultPublicSaveName(new Date("2026-08-14T00:00:00Z"))).toContain("存档");
  });

  it("validates list, get and rename inputs", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.publicSaves.list({ platform: "gba", gameSlug: "runner" })).resolves.toBeDefined();
    await expect(caller.publicSaves.get({ saveId: 0 })).rejects.toThrow();
    await expect(caller.publicSaves.rename({ saveId: 1, saveName: "" })).rejects.toThrow();
  });

  it("rejects payloads over the public save limit", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.publicSaves.put({ platform: "gba", gameSlug: "runner", payloadBase64: "x".repeat(2_800_001) })).rejects.toThrow();
  });
});
