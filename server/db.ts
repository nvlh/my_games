import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertPublicGame, InsertPublicSave, InsertUser, PublicGame, PublicSave, publicGames, publicSaves, users } from "../drizzle/schema";
import { storagePut } from "./storage";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
const publicSaveWrites = new Map<string, number>();

export function createDefaultPublicSaveName(date = new Date()) {
  return `存档 ${date.toLocaleString("zh-CN")}`;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getPublicSave(platform: string, gameSlug: string, slot: number): Promise<PublicSave | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(publicSaves).where(and(eq(publicSaves.platform, platform), eq(publicSaves.gameSlug, gameSlug), eq(publicSaves.slot, slot))).limit(1);
  return result[0];
}

export async function listPublicSaves(platform: string, gameSlug: string): Promise<PublicSave[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(publicSaves).where(and(eq(publicSaves.platform, platform), eq(publicSaves.gameSlug, gameSlug))).orderBy(desc(publicSaves.updatedAt));
}

export async function getPublicSaveById(id: number): Promise<PublicSave | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(publicSaves).where(eq(publicSaves.id, id)).limit(1);
  return result[0];
}

export async function deletePublicSave(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库暂不可用");
  await db.delete(publicSaves).where(eq(publicSaves.id, id));
  publicSaveWrites.delete(`save:${id}`);
  return { success: true } as const;
}

export async function renamePublicSave(id: number, saveName: string) {
  const db = await getDb();
  if (!db) throw new Error("数据库暂不可用");
  const normalized = saveName.trim().slice(0, 160);
  if (!normalized) throw new Error("存档名称不能为空");
  await db.update(publicSaves).set({ saveName: normalized }).where(eq(publicSaves.id, id));
  return getPublicSaveById(id);
}

const ROM_EXTENSIONS = new Set(["nes", "gba", "wsc", "iso", "cue", "bin", "cso", "pbp"]);
const IMAGE_EXTENSIONS = new Set(["webp", "png", "jpg", "jpeg"]);
const IMAGE_TYPES = new Set(["image/webp", "image/png", "image/jpeg"]);

export function validatePublicGameFile(name: string, contentType: string, kind: "rom" | "image") {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (kind === "rom" && !ROM_EXTENSIONS.has(extension)) throw new Error("不支持的游戏文件格式");
  if (kind === "image" && (!IMAGE_EXTENSIONS.has(extension) || !IMAGE_TYPES.has(contentType.toLowerCase()))) throw new Error("封面和截图仅支持 WebP、PNG 或 JPEG");
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160) || "file";
}

export async function listPublicGames() {
  const db = await getDb();
  if (!db) return [] as PublicGame[];
  return db.select().from(publicGames).orderBy(desc(publicGames.updatedAt));
}

export async function deletePublicGame(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库暂不可用");
  const game = await getPublicGameById(id);
  if (!game) throw new Error("游戏不存在");
  await db.delete(publicSaves).where(eq(publicSaves.gameSlug, game.slug));
  await db.delete(publicGames).where(eq(publicGames.id, id));
  return { success: true } as const;
}

export async function getPublicGameById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(publicGames).where(eq(publicGames.id, id)).limit(1);
  return result[0];
}

export async function createPublicGame(input: {
  name: string; slug: string; platform: string; genre: string; description?: string; players: string; input: string; keySettings?: string; fileLabel?: string; buttonLabel?: string;
  romName: string; romContentType: string; romPayloadBase64: string;
  coverName?: string; coverContentType?: string; coverPayloadBase64?: string;
  iconName?: string; iconContentType?: string; iconPayloadBase64?: string;
  screenshotName?: string; screenshotContentType?: string; screenshotPayloadBase64?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库暂不可用");
  validatePublicGameFile(input.romName, input.romContentType, "rom");
  if (input.coverPayloadBase64) validatePublicGameFile(input.coverName ?? "cover.webp", input.coverContentType ?? "image/webp", "image");
  if (input.screenshotPayloadBase64) validatePublicGameFile(input.screenshotName ?? "screen.webp", input.screenshotContentType ?? "image/webp", "image");
  const romBytes = Buffer.from(input.romPayloadBase64, "base64");
  if (romBytes.length === 0 || romBytes.length > 30 * 1024 * 1024) throw new Error("游戏文件必须大于 0 且不超过 30 MB");
  const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 150) || `game-${Date.now()}`;
  const rom = await storagePut(`public-games/${input.platform}/${slug}/rom/${safeFileName(input.romName)}`, romBytes, input.romContentType);
  let coverKey: string | undefined;
  if (input.coverPayloadBase64) {
    const bytes = Buffer.from(input.coverPayloadBase64, "base64");
    if (bytes.length > 5 * 1024 * 1024) throw new Error("封面不能超过 5 MB");
    const cover = await storagePut(`public-games/${input.platform}/${slug}/cover/${safeFileName(input.coverName ?? "cover.webp")}`, bytes, input.coverContentType ?? "image/webp");
    coverKey = cover.key;
  }
  let iconKey: string | undefined;
  if (input.iconPayloadBase64) {
    validatePublicGameFile(input.iconName ?? "icon.webp", input.iconContentType ?? "image/webp", "image");
    const bytes = Buffer.from(input.iconPayloadBase64, "base64");
    if (bytes.length > 2 * 1024 * 1024) throw new Error("游戏图标不能超过 2 MB");
    const icon = await storagePut(`public-games/${input.platform}/${slug}/icon/${safeFileName(input.iconName ?? "icon.webp")}`, bytes, input.iconContentType ?? "image/webp");
    iconKey = icon.key;
  }
  let screenshotKeys: string | undefined;
  if (input.screenshotPayloadBase64) {
    const bytes = Buffer.from(input.screenshotPayloadBase64, "base64");
    if (bytes.length > 8 * 1024 * 1024) throw new Error("截图不能超过 8 MB");
    const screenshot = await storagePut(`public-games/${input.platform}/${slug}/screenshots/${safeFileName(input.screenshotName ?? "screen.webp")}`, bytes, input.screenshotContentType ?? "image/webp");
    screenshotKeys = JSON.stringify([screenshot.key]);
  }
  const values: InsertPublicGame = {
    name: input.name.trim().slice(0, 160), slug, platform: input.platform, genre: input.genre,
    description: input.description?.trim().slice(0, 2000) || null, players: input.players, input: input.input,
    keySettings: input.keySettings?.trim().slice(0, 500) || null,
    fileLabel: input.fileLabel?.trim().slice(0, 80) || "游戏文件",
    buttonLabel: input.buttonLabel?.trim().slice(0, 80) || "开始",
    romKey: rom.key, romName: input.romName.slice(0, 255), romSizeBytes: romBytes.length, romContentType: input.romContentType,
    coverKey: coverKey ?? null, iconKey: iconKey ?? null, screenshotKeys: screenshotKeys ?? null,
  };
  await db.insert(publicGames).values(values);
  const created = await db.select().from(publicGames).where(eq(publicGames.slug, slug)).limit(1);
  return created[0];
}

export async function updatePublicGame(input: {
  gameId: number; name: string; slug: string; platform: string; genre: string; description?: string; players: string; input: string; keySettings?: string; fileLabel?: string; buttonLabel?: string;
  romName?: string; romContentType?: string; romPayloadBase64?: string;
  coverName?: string; coverContentType?: string; coverPayloadBase64?: string;
  iconName?: string; iconContentType?: string; iconPayloadBase64?: string;
  screenshotName?: string; screenshotContentType?: string; screenshotPayloadBase64?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库暂不可用");
  const existing = await getPublicGameById(input.gameId);
  if (!existing) throw new Error("游戏不存在");
  const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 150) || existing.slug;
  const updates: Partial<InsertPublicGame> = {
    name: input.name.trim().slice(0, 160), slug, platform: input.platform, genre: input.genre,
    description: input.description?.trim().slice(0, 2000) || null, players: input.players, input: input.input,
    keySettings: input.keySettings?.trim().slice(0, 500) || null,
    fileLabel: input.fileLabel?.trim().slice(0, 80) || existing.fileLabel || "游戏文件",
    buttonLabel: input.buttonLabel?.trim().slice(0, 80) || existing.buttonLabel || "开始",
  };
  if (input.romPayloadBase64 && input.romName) {
    validatePublicGameFile(input.romName, input.romContentType ?? "application/octet-stream", "rom");
    const romBytes = Buffer.from(input.romPayloadBase64, "base64");
    if (romBytes.length === 0 || romBytes.length > 30 * 1024 * 1024) throw new Error("游戏文件必须大于 0 且不超过 30 MB");
    const rom = await storagePut(`public-games/${input.platform}/${slug}/rom/${safeFileName(input.romName)}`, romBytes, input.romContentType ?? "application/octet-stream");
    updates.romKey = rom.key; updates.romName = input.romName.slice(0, 255); updates.romSizeBytes = romBytes.length; updates.romContentType = input.romContentType ?? "application/octet-stream";
  }
  if (input.coverPayloadBase64 && input.coverName) {
    validatePublicGameFile(input.coverName, input.coverContentType ?? "image/webp", "image");
    const bytes = Buffer.from(input.coverPayloadBase64, "base64");
    if (bytes.length > 5 * 1024 * 1024) throw new Error("封面不能超过 5 MB");
    const cover = await storagePut(`public-games/${input.platform}/${slug}/cover/${safeFileName(input.coverName)}`, bytes, input.coverContentType ?? "image/webp");
    updates.coverKey = cover.key;
  }
  if (input.iconPayloadBase64 && input.iconName) {
    validatePublicGameFile(input.iconName, input.iconContentType ?? "image/webp", "image");
    const bytes = Buffer.from(input.iconPayloadBase64, "base64");
    if (bytes.length > 2 * 1024 * 1024) throw new Error("游戏图标不能超过 2 MB");
    const icon = await storagePut(`public-games/${input.platform}/${slug}/icon/${safeFileName(input.iconName)}`, bytes, input.iconContentType ?? "image/webp");
    updates.iconKey = icon.key;
  }
  if (input.screenshotPayloadBase64 && input.screenshotName) {
    validatePublicGameFile(input.screenshotName, input.screenshotContentType ?? "image/webp", "image");
    const bytes = Buffer.from(input.screenshotPayloadBase64, "base64");
    if (bytes.length > 8 * 1024 * 1024) throw new Error("截图不能超过 8 MB");
    const screenshot = await storagePut(`public-games/${input.platform}/${slug}/screenshots/${safeFileName(input.screenshotName)}`, bytes, input.screenshotContentType ?? "image/webp");
    updates.screenshotKeys = JSON.stringify([screenshot.key]);
  }
  await db.update(publicGames).set(updates).where(eq(publicGames.id, input.gameId));
  const updated = await db.select().from(publicGames).where(eq(publicGames.id, input.gameId)).limit(1);
  return updated[0];
}

export async function savePublicSave(input: { platform: string; gameSlug: string; saveId?: number; saveName?: string; payloadBase64: string; contentType?: string; expectedVersion?: number }) {
  if (input.payloadBase64.length > 2_800_000) throw new Error("公共存档不能超过 2 MB");
  const db = await getDb();
  if (!db) throw new Error("数据库暂不可用");
  const existing = input.saveId ? await getPublicSaveById(input.saveId) : undefined;
  if (existing && (existing.platform !== input.platform || existing.gameSlug !== input.gameSlug)) throw new Error("存档与当前游戏不匹配");
  const saveKey = existing ? `${input.platform}:${input.gameSlug}:${existing.id}` : `${input.platform}:${input.gameSlug}:new`;
  const now = Date.now();
  const lastWrite = publicSaveWrites.get(saveKey) ?? 0;
  if (now - lastWrite < 3000) throw new Error("公共存档写入过于频繁，请稍后再试");
  if (existing && input.expectedVersion !== undefined && input.expectedVersion !== existing.version) throw new Error("公共存档版本已更新，请先重新读取");
  const bytes = Buffer.from(input.payloadBase64, "base64");
  if (bytes.length > 2 * 1024 * 1024) throw new Error("公共存档不能超过 2 MB");
  const uploaded = await storagePut(`public-saves/${input.platform}/${input.gameSlug}/${existing?.id ?? `new-${Date.now()}`}.sav`, bytes, input.contentType ?? "application/octet-stream");
  if (existing) {
    await db.update(publicSaves).set({ objectKey: uploaded.key, sizeBytes: bytes.length, version: existing.version + 1, ...(input.saveName?.trim() ? { saveName: input.saveName.trim().slice(0, 160) } : {}) }).where(eq(publicSaves.id, existing.id));
  } else {
    const values: InsertPublicSave = { platform: input.platform, gameSlug: input.gameSlug, slot: 1, saveName: input.saveName?.trim().slice(0, 160) || createDefaultPublicSaveName(), objectKey: uploaded.key, sizeBytes: bytes.length, version: 1 };
    const inserted = await db.insert(publicSaves).values(values);
    void inserted;
  }
  publicSaveWrites.set(saveKey, now);
  return existing ? getPublicSaveById(existing.id) : (await listPublicSaves(input.platform, input.gameSlug))[0];
}
