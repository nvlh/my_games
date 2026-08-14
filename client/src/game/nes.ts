import type { EmulatorData } from "jsnes";

export type NesSavePayload = { kind: "nes"; state: EmulatorData };

export function createMinimalNesRom() {
  const rom = new Uint8Array(16 + 16 * 1024 + 8 * 1024);
  rom.set([0x4e, 0x45, 0x53, 0x1a, 1, 1, 0, 0], 0);
  rom.set([0xea, 0x4c, 0x00, 0x80], 16);
  rom[16 + 0x3ffc] = 0x00;
  rom[16 + 0x3ffd] = 0x80;
  return rom.buffer;
}

export async function loadNesRom(source: { romUrl?: string; romFile?: Blob }) {
  const response = source.romFile ? undefined : await fetch(source.romUrl ?? "");
  if (response && !response.ok) throw new Error(`游戏文件读取失败（${response.status}）`);
  const buffer = source.romFile ? await source.romFile.arrayBuffer() : await response!.arrayBuffer();
  if (buffer.byteLength < 16) throw new Error("ROM 文件为空或长度不足");
  const binary = arrayBufferToBinary(buffer);
  if (binary.slice(0, 4) !== "NES\u001a") throw new Error("Not a valid NES ROM.");
  return binary;
}

export function arrayBufferToBinary(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let result = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    result += String.fromCharCode.apply(null, Array.from(bytes.subarray(offset, offset + chunkSize)));
  }
  return result;
}

export function createNesSavePayload(state: EmulatorData): NesSavePayload {
  return { kind: "nes", state };
}

export function canStartNesGame(platform: string, sourceAvailable: boolean) {
  return platform === "nes" && sourceAvailable;
}

export function formatNesLoadError(error: unknown) {
  if (error instanceof Error && error.message) return `NES 加载失败：${error.message}`;
  return "NES 加载失败：请确认文件是有效的 .nes ROM";
}

export function isNesSavePayload(value: unknown): value is NesSavePayload {
  return Boolean(value && typeof value === "object" && (value as { kind?: unknown }).kind === "nes" && (value as { state?: unknown }).state);
}
