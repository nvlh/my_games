export type PublicGameEditorForm = {
  name: string;
  slug: string;
  platform: string;
  genre: string;
  description: string;
  players: string;
  input: string;
};

export type PublicGameEditorRecord = PublicGameEditorForm & { id: number };

type OptionalFilePayload = {
  name: string;
  contentType: string;
  payloadBase64: string;
};

export function isEditingPublicGame(gameId?: number) {
  return gameId !== undefined;
}

export function toPublicGameEditorForm(game: PublicGameEditorRecord): PublicGameEditorForm {
  return {
    name: game.name,
    slug: game.slug,
    platform: game.platform,
    genre: game.genre,
    description: game.description,
    players: game.players,
    input: game.input,
  };
}

export function buildPublicGameUpdateInput(
  gameId: number,
  form: PublicGameEditorForm,
  files: { rom?: OptionalFilePayload; cover?: OptionalFilePayload; screenshot?: OptionalFilePayload } = {},
) {
  return {
    gameId,
    ...form,
    ...(files.rom ? { romName: files.rom.name, romContentType: files.rom.contentType, romPayloadBase64: files.rom.payloadBase64 } : {}),
    ...(files.cover ? { coverName: files.cover.name, coverContentType: files.cover.contentType, coverPayloadBase64: files.cover.payloadBase64 } : {}),
    ...(files.screenshot ? { screenshotName: files.screenshot.name, screenshotContentType: files.screenshot.contentType, screenshotPayloadBase64: files.screenshot.payloadBase64 } : {}),
  };
}

export function getEditorView(gameId?: number) {
  return isEditingPublicGame(gameId)
    ? { title: "编辑游戏", submitLabel: "保存修改", section: "EDIT" as const }
    : { title: "上传游戏", submitLabel: "公开上传", section: "UPLOAD" as const };
}

export function shouldCloseEditorAfterSuccess(success: boolean) {
  return success;
}
