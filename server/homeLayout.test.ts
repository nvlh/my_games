import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const cssSource = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("library-first homepage layout contract", () => {
  it("keeps the library as the primary page section without the removed archive areas", () => {
    expect(homeSource).toContain('className="library-console library-only"');
    expect(homeSource).toContain('data-testid="game-library-list"');
    expect(homeSource).not.toContain('className="archive-rail"');
    expect(homeSource).not.toContain('className="display-stage"');
    expect(homeSource).not.toContain('className="intro-block"');
    expect(homeSource).not.toContain('className="game-track"');
    expect(homeSource).not.toContain("今日展柜");
    expect(homeSource).not.toContain('className="manage-button"');
    expect(homeSource).toContain("public-game-edit-");
    expect(homeSource).toContain("编辑公开游戏");
    expect(homeSource).toContain('data-testid="public-game-editor"');
    expect(homeSource).toContain('data-testid="public-game-editor-submit"');
    expect(homeSource).toContain("toPublicGameEditorForm");
    expect(homeSource).toContain("editPublicGame(game)");
    expect(homeSource).toContain("updateGame.mutate");
    expect(homeSource).toContain("void trpcUtils.publicGames.list.invalidate()");
  });

  it("retains responsive rules for the game library controls", () => {
    expect(cssSource).toContain(".library-console");
    expect(cssSource).toContain(".row-actions");
    expect(cssSource).toMatch(/@media[^{}]*max-width/);
  });
});
