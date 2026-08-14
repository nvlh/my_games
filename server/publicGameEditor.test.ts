import { describe, expect, it } from "vitest";
import { buildPublicGameUpdateInput, getEditorView, isEditingPublicGame, shouldCloseEditorAfterSuccess, toPublicGameEditorForm } from "../client/src/game/publicGameEditor";

const game = { id: 7, name: "坦克测试", slug: "tank-test", platform: "nes", genre: "action", description: "旧简介", players: "单人", input: "键盘" };

describe("public game editor workflow strategy", () => {
  it("opens edit mode and maps the selected game into the form", () => {
    expect(isEditingPublicGame(game.id)).toBe(true);
    expect(getEditorView(game.id)).toEqual({ title: "编辑游戏", submitLabel: "保存修改", section: "EDIT" });
    expect(toPublicGameEditorForm(game)).toEqual({ name: "坦克测试", slug: "tank-test", platform: "nes", genre: "action", description: "旧简介", players: "单人", input: "键盘" });
  });

  it("builds update input without file fields when files are left blank", () => {
    const input = buildPublicGameUpdateInput(game.id, toPublicGameEditorForm(game));
    expect(input).toEqual({ ...toPublicGameEditorForm(game), gameId: 7 });
    expect("romPayloadBase64" in input).toBe(false);
    expect("coverPayloadBase64" in input).toBe(false);
    expect("iconPayloadBase64" in input).toBe(false);
    expect("screenshotPayloadBase64" in input).toBe(false);
  });

  it("adds only the selected replacement file payloads", () => {
    const input = buildPublicGameUpdateInput(game.id, toPublicGameEditorForm(game), { rom: { name: "new.nes", contentType: "application/octet-stream", payloadBase64: "AA==" }, icon: { name: "tank.png", contentType: "image/png", payloadBase64: "iVBORw==" } });
    expect(input.romName).toBe("new.nes");
    expect(input.iconName).toBe("tank.png");
    expect(input.iconContentType).toBe("image/png");
    expect(input.coverPayloadBase64).toBeUndefined();
    expect(shouldCloseEditorAfterSuccess(true)).toBe(true);
    expect(shouldCloseEditorAfterSuccess(false)).toBe(false);
  });
});
