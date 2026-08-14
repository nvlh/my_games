import { describe, expect, it } from "vitest";
import { NES } from "jsnes";
import { arrayBufferToBinary, canStartNesGame, createNesSavePayload, formatNesLoadError, isNesSavePayload, loadNesRom } from "../client/src/game/nes";

describe("NES browser core contracts", () => {
  it("converts an NES header buffer to the binary string expected by JSNES", () => {
    const bytes = new Uint8Array([0x4e, 0x45, 0x53, 0x1a, 1, 0, 0, 0]);
    expect(arrayBufferToBinary(bytes.buffer)).toBe("NES\u001a\u0001\u0000\u0000\u0000");
  });

  it("boots a minimal homebrew iNES ROM, renders a frame, and restores state", () => {
    const rom = new Uint8Array(16 + 16 * 1024 + 8 * 1024);
    rom.set([0x4e, 0x45, 0x53, 0x1a, 1, 1, 0, 0], 0);
    const programOffset = 16;
    rom.set([0xea, 0x4c, 0x00, 0x80], programOffset);
    rom[programOffset + 0x3ffc] = 0x00;
    rom[programOffset + 0x3ffd] = 0x80;
    const nes = new NES({ emulateSound: false });
    nes.loadROM(arrayBufferToBinary(rom.buffer));
    nes.frame();
    const state = nes.toJSON();
    expect(state.cpu).toBeDefined();
    const restored = new NES({ emulateSound: false });
    restored.loadROM(arrayBufferToBinary(rom.buffer));
    restored.fromJSON(state);
    expect(restored.toJSON().cpu).toBeDefined();
  });

  it("loads a local iNES blob through the same source function used by the component", async () => {
    const rom = new Blob([new Uint8Array([0x4e, 0x45, 0x53, 0x1a, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
    await expect(loadNesRom({ romFile: rom })).resolves.toContain(`NES${String.fromCharCode(0x1a)}`);
  });

  it("rejects failed URLs, empty responses, and invalid iNES files", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("", { status: 404 });
    await expect(loadNesRom({ romUrl: "/missing.nes" })).rejects.toThrow("404");
    globalThis.fetch = async () => new Response(new Uint8Array(0), { status: 200 });
    await expect(loadNesRom({ romUrl: "/empty.nes" })).rejects.toThrow("长度不足");
    globalThis.fetch = async () => new Response(new Uint8Array(16), { status: 200 });
    await expect(loadNesRom({ romUrl: "/invalid.nes" })).rejects.toThrow("Not a valid NES ROM");
    globalThis.fetch = originalFetch;
  });

  it("formats invalid ROM and read errors for the visible UI", () => {
    expect(formatNesLoadError(new Error("文件读取失败（404）"))).toContain("404");
    expect(formatNesLoadError("unknown")).toContain("有效的 .nes ROM");
  });

  it("only opens the NES start flow when the selected platform has a ROM source", () => {
    expect(canStartNesGame("nes", true)).toBe(true);
    expect(canStartNesGame("nes", false)).toBe(false);
    expect(canStartNesGame("gba", true)).toBe(false);
  });

  it("accepts a namespaced NES save payload and rejects unrelated snapshots", () => {
    const state = { cpu: {}, mmap: {}, ppu: {}, papu: {} };
    const payload = createNesSavePayload(state);
    expect(payload.kind).toBe("nes");
    expect(isNesSavePayload(payload)).toBe(true);
    expect(isNesSavePayload({ mode: "runner", x: 0, y: 0, pulse: 0 })).toBe(false);
    expect(isNesSavePayload(null)).toBe(false);
  });
});
