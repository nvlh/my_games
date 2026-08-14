import { describe, expect, it } from "vitest";
import { getLibraryRowActions, getSaveOptionLabels, shouldShowSaveDelete } from "../client/src/game/libraryActions";

describe("library row action contracts", () => {
  it("keeps built-in prototypes playable but not downloadable or deletable", () => {
    expect(getLibraryRowActions("prototype")).toEqual({ canStart: true, canDownload: false, canDelete: false, canSave: true });
  });

  it("allows NES public and imported rows to download, delete, play, and save", () => {
    expect(getLibraryRowActions("public", "nes")).toEqual({ canStart: true, canDownload: true, canDelete: true, canSave: true });
    expect(getLibraryRowActions("imported", "nes")).toEqual({ canStart: true, canDownload: true, canDelete: true, canSave: true });
    expect(getLibraryRowActions("public", "gba").canStart).toBe(false);
  });

  it("shows save deletion only for a selected historical save", () => {
    expect(shouldShowSaveDelete()).toBe(false);
    expect(shouldShowSaveDelete(0)).toBe(false);
    expect(shouldShowSaveDelete(12)).toBe(true);
  });

  it("always puts new save before historical save names", () => {
    expect(getSaveOptionLabels(["昨晚通关", "备用档"])).toEqual(["新存档", "昨晚通关", "备用档"]);
  });
});
