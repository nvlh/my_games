export type LibraryRowKind = "prototype" | "public" | "imported";

export function getLibraryRowActions(kind: LibraryRowKind, platform?: string) {
  const canStart = kind === "prototype" || platform === "nes";
  return {
    canStart,
    canDownload: kind !== "prototype",
    canDelete: kind !== "prototype",
    canSave: kind === "prototype" || platform === "nes",
  } as const;
}

export function getSaveOptionLabels(saveNames: string[]) {
  return ["新存档", ...saveNames];
}

export function shouldShowSaveDelete(saveId?: number) {
  return Boolean(saveId);
}
