import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { createPublicGame, deletePublicGame, deletePublicSave, getPublicSaveById, listPublicGames, listPublicSaves, renamePublicSave, savePublicSave, updatePublicGame } from "./db";
import { storageGetSignedUrl } from "./storage";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  publicSaves: router({
    list: publicProcedure.input(z.object({ platform: z.enum(["nes", "gba", "wsc", "saturn", "psp"]), gameSlug: z.string().min(1).max(128) })).query(({ input }) => listPublicSaves(input.platform, input.gameSlug)),
    get: publicProcedure.input(z.object({ saveId: z.number().int().positive() })).query(async ({ input }) => {
      const save = await getPublicSaveById(input.saveId);
      if (!save) return { available: false } as const;
      const downloadUrl = await storageGetSignedUrl(save.objectKey);
      return { ...save, downloadUrl, available: true } as const;
    }),
    put: publicProcedure.input(z.object({ platform: z.enum(["nes", "gba", "wsc", "saturn", "psp"]), gameSlug: z.string().min(1).max(128), saveId: z.number().int().positive().optional(), saveName: z.string().max(160).optional(), payloadBase64: z.string().min(1).max(2_800_000), contentType: z.string().max(80).optional(), expectedVersion: z.number().int().min(1).optional() })).mutation(({ input }) => savePublicSave(input)),
    rename: publicProcedure.input(z.object({ saveId: z.number().int().positive(), saveName: z.string().trim().min(1).max(160) })).mutation(({ input }) => renamePublicSave(input.saveId, input.saveName)),
    delete: publicProcedure.input(z.object({ saveId: z.number().int().positive() })).mutation(({ input }) => deletePublicSave(input.saveId)),
  }),

  publicGames: router({
    list: publicProcedure.query(async () => {
      const games = await listPublicGames();
      return games.map((game) => ({
        ...game,
        romUrl: `/manus-storage/${game.romKey}`,
        coverUrl: game.coverKey ? `/manus-storage/${game.coverKey}` : null,
        iconUrl: game.iconKey ? `/manus-storage/${game.iconKey}` : null,
        screenshotUrls: game.screenshotKeys ? (JSON.parse(game.screenshotKeys) as string[]).map((key) => `/manus-storage/${key}`) : [],
      }));
    }),
    delete: publicProcedure.input(z.object({ gameId: z.number().int().positive() })).mutation(({ input }) => deletePublicGame(input.gameId)),
    create: publicProcedure.input(z.object({
      name: z.string().trim().min(1).max(160), slug: z.string().trim().min(1).max(160),
      platform: z.enum(["xiaobawang", "arcade", "nes", "gba", "wsc", "saturn", "psp"]),
      genre: z.enum(["action", "shooter", "platform", "fighting", "racing", "puzzle", "rpg", "adventure", "sports", "other"]),
      description: z.string().max(2000).optional(), players: z.string().min(1).max(32), input: z.string().min(1).max(80), keySettings: z.string().max(500).optional(), fileLabel: z.string().min(1).max(80).optional(), buttonLabel: z.string().min(1).max(80).optional(),
      romName: z.string().min(1).max(255), romContentType: z.string().max(100), romPayloadBase64: z.string().min(1).max(42_000_000),
      coverName: z.string().max(255).optional(), coverContentType: z.string().max(100).optional(), coverPayloadBase64: z.string().max(7_000_000).optional(),
      iconName: z.string().max(255).optional(), iconContentType: z.string().max(100).optional(), iconPayloadBase64: z.string().max(3_000_000).optional(),
      screenshotName: z.string().max(255).optional(), screenshotContentType: z.string().max(100).optional(), screenshotPayloadBase64: z.string().max(11_000_000).optional(),
    })).mutation(({ input }) => createPublicGame(input)),
    update: publicProcedure.input(z.object({
      gameId: z.number().int().positive(), name: z.string().trim().min(1).max(160), slug: z.string().trim().min(1).max(160),
      platform: z.enum(["xiaobawang", "arcade", "nes", "gba", "wsc", "saturn", "psp"]),
      genre: z.enum(["action", "shooter", "platform", "fighting", "racing", "puzzle", "rpg", "adventure", "sports", "other"]),
      description: z.string().max(2000).optional(), players: z.string().min(1).max(32), input: z.string().min(1).max(80), keySettings: z.string().max(500).optional(), fileLabel: z.string().min(1).max(80).optional(), buttonLabel: z.string().min(1).max(80).optional(),
      romName: z.string().max(255).optional(), romContentType: z.string().max(100).optional(), romPayloadBase64: z.string().max(42_000_000).optional(),
      coverName: z.string().max(255).optional(), coverContentType: z.string().max(100).optional(), coverPayloadBase64: z.string().max(7_000_000).optional(),
      iconName: z.string().max(255).optional(), iconContentType: z.string().max(100).optional(), iconPayloadBase64: z.string().max(3_000_000).optional(),
      screenshotName: z.string().max(255).optional(), screenshotContentType: z.string().max(100).optional(), screenshotPayloadBase64: z.string().max(11_000_000).optional(),
    })).mutation(({ input }) => updatePublicGame(input)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
