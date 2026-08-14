// @vitest-environment happy-dom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMutate = vi.fn();
const invalidateGames = vi.fn();
let mockedIconUrl: string | undefined = "/icon.png";
const mutationConfigs: Array<{ onSuccess?: () => void }> = [];

vi.mock("@/lib/trpc", () => ({
  trpc: {
    publicGames: {
      list: { useQuery: () => ({ data: [{ id: 7, name: "坦克测试", slug: "tank-test", platform: "nes", genre: "action", description: "旧简介", players: "单人", input: "键盘", romUrl: "/rom.nes", romName: "tank.nes", iconUrl: mockedIconUrl }] }) },
      delete: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      create: { useMutation: (options: { onSuccess?: () => void }) => { mutationConfigs.push(options); return { isPending: false, mutate: vi.fn() }; } },
      update: { useMutation: (options: { onSuccess?: () => void }) => { mutationConfigs.push(options); return { isPending: false, mutate: (input: unknown) => { updateMutate(input); options.onSuccess?.(); } }; } },
    },
    publicSaves: {
      list: { useQuery: () => ({ data: [] }) },
      get: { useQuery: () => ({ data: { available: false } }) },
      put: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      rename: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      delete: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
    },
    useUtils: () => ({ publicGames: { list: { invalidate: invalidateGames } }, publicSaves: { list: { invalidate: vi.fn() } } }),
  },
}));

import Home from "./Home";

describe("Home public game editor interaction", () => {
  beforeEach(() => {
    mockedIconUrl = "/icon.png";
    cleanup();
    updateMutate.mockClear();
    invalidateGames.mockClear();
    mutationConfigs.length = 0;
  });

  it("uses a default icon when a public game has no icon URL", () => {
    mockedIconUrl = undefined;
    render(<Home />);
    const fallback = screen.getByTestId("game-icon-tank-test");
    expect(fallback.className).toContain("game-icon-fallback");
    expect(fallback.querySelector("svg")).toBeTruthy();
    cleanup();
  });

  it("opens, backfills, submits without replacement files, closes, and refreshes", () => {
    render(<Home />);
    expect(screen.getByTestId("game-icon-tank-test").getAttribute("src")).toBe("/icon.png");
    fireEvent.click(screen.getByTestId("public-game-edit-tank-test"));

    expect(screen.getByTestId("public-game-editor")).toBeTruthy();
    expect((screen.getByTestId("public-game-editor-name") as HTMLInputElement).value).toBe("坦克测试");
    expect(screen.getByTestId("public-game-editor-icon")).toBeTruthy();
    expect(screen.getByTestId("public-game-editor-current-icon")).toBeTruthy();

    fireEvent.click(screen.getByTestId("public-game-editor-submit"));

    expect(updateMutate).toHaveBeenCalledWith(expect.objectContaining({ gameId: 7, name: "坦克测试", slug: "tank-test" }));
    expect(updateMutate.mock.calls[0][0]).not.toHaveProperty("romPayloadBase64");
    expect(screen.queryByTestId("public-game-editor")).toBeNull();
    expect(invalidateGames).toHaveBeenCalled();
  });
});
