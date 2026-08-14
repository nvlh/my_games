import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const publicSaves = mysqlTable("public_saves", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 16 }).notNull(),
  gameSlug: varchar("gameSlug", { length: 128 }).notNull(),
  slot: int("slot").default(1).notNull(),
  saveName: varchar("saveName", { length: 160 }).default("未命名存档").notNull(),
  objectKey: varchar("objectKey", { length: 255 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PublicSave = typeof publicSaves.$inferSelect;
export type InsertPublicSave = typeof publicSaves.$inferInsert;

export const publicGames = mysqlTable("public_games", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  platform: varchar("platform", { length: 16 }).notNull(),
  genre: varchar("genre", { length: 32 }).notNull(),
  description: text("description"),
  players: varchar("players", { length: 32 }).notNull(),
  input: varchar("input", { length: 80 }).notNull(),
  keySettings: text("keySettings"),
  fileLabel: varchar("fileLabel", { length: 80 }).default("游戏文件").notNull(),
  buttonLabel: varchar("buttonLabel", { length: 80 }).default("开始").notNull(),
  romKey: varchar("romKey", { length: 255 }).notNull(),
  romName: varchar("romName", { length: 255 }).notNull(),
  romSizeBytes: int("romSizeBytes").notNull(),
  romContentType: varchar("romContentType", { length: 100 }).notNull(),
  coverKey: varchar("coverKey", { length: 255 }),
  iconKey: varchar("iconKey", { length: 255 }),
  screenshotKeys: text("screenshotKeys"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PublicGame = typeof publicGames.$inferSelect;
export type InsertPublicGame = typeof publicGames.$inferInsert;