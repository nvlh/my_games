// 设计提醒：像素街机档案馆。采用不对称档案室布局、CRT 展柜、投币橙行动色与短促反馈；文案要像街机状态屏，不像普通营销页。
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Gamepad2, Info, Play, Trash2, X } from "lucide-react";
import GameCanvas from "@/components/GameCanvas";
import NesEmulator, { type SaveableHandle } from "@/components/NesEmulator";
import { canStartNesGame, createMinimalNesRom } from "@/game/nes";
import type { ArcadeMode, GameSnapshot } from "@/game/scene";
import { getLibraryRowActions, getSaveOptionLabels, shouldShowSaveDelete } from "@/game/libraryActions";
import { trpc } from "@/lib/trpc";

type Game = { mode: ArcadeMode; number: string; title: string; subtitle: string; description: string; tags: string[]; accent: string; art: string; score: string; platform: "xiaobawang" | "arcade" };

const games: Game[] = [
  { mode: "runner", number: "A-01", title: "铁锈突围", subtitle: "SIDE-SCROLL RUNNER", description: "沿着工业边境向前推进，躲开火线，收集能量，保持连击。", tags: ["单人", "横版", "动作"], accent: "#F25C2A", art: "/manus-storage/arcade-runner-scene_be11261c.png", score: "HIGH 032800", platform: "arcade" },
  { mode: "tank", number: "B-07", title: "砖墙攻防", subtitle: "TANK MAZE", description: "在砖墙迷宫中寻找角度。每一发炮弹，都可能改变地图。", tags: ["双人预留", "迷宫", "策略"], accent: "#37D6C4", art: "/manus-storage/arcade-tank-snow-scenes_83a2ce04.png", score: "HIGH 014500", platform: "arcade" },
  { mode: "snow", number: "C-12", title: "雪线弹跳", subtitle: "SNOW PLATFORM", description: "踩着雪台一路向上，让每次弹跳都落在下一块安全的云朵上。", tags: ["单人", "平台", "轻冒险"], accent: "#FFD166", art: "/manus-storage/arcade-tank-snow-scenes_83a2ce04.png", score: "HIGH 008900", platform: "xiaobawang" },
];

export default function Home() {
  const demoMode = new URLSearchParams(window.location.search).get("demo");
  const demoNes = demoMode === "nes" || demoMode === "nes-error";
  const demoNesError = demoMode === "nes-error";
  const [demoNesFile] = useState(() => new File([createMinimalNesRom()], "homebrew-test.nes", { type: "application/octet-stream" }));
  const [selected, setSelected] = useState<ArcadeMode>("runner");
  const [playing, setPlaying] = useState(demoNes);
  const [demo, setDemo] = useState(() => new URLSearchParams(window.location.search).has("demo"));
  const [platform, setPlatform] = useState("all");
  const [librarySelection, setLibrarySelection] = useState<string>();
  const [selectedSaveId, setSelectedSaveId] = useState<number>();
  const [saveName, setSaveName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [saveError, setSaveError] = useState("");
  const [gameHandle, setGameHandle] = useState<SaveableHandle>();
  const [imported, setImported] = useState<{ name: string; platform: string; size: string; genre: string; players: string; input: string; status: string; file: File }[]>([]);
  const [importError, setImportError] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const [gameUploadError, setGameUploadError] = useState("");
  const [romFile, setRomFile] = useState<File>();
  const [coverFile, setCoverFile] = useState<File>();
  const [screenshotFile, setScreenshotFile] = useState<File>();
  const [gameForm, setGameForm] = useState({ name: "", slug: "", platform: "nes", genre: "action", description: "", players: "单人", input: "键盘/手柄" });
  const active = useMemo(() => games.find((game) => game.mode === selected) ?? games[0], [selected]);
  const publicGames = trpc.publicGames.list.useQuery();
  const selectedPublicGame = publicGames.data?.find((game) => game.slug === librarySelection);
  const selectedImportedGame = imported.find((game) => game.name === librarySelection);
  const selectedNesRom = demoNesError ? { romUrl: "/missing-demo-rom.nes" } : demoNes ? { romFile: demoNesFile } : selectedPublicGame?.platform === "nes" ? { romUrl: selectedPublicGame.romUrl } : selectedImportedGame?.platform === "nes" ? { romFile: selectedImportedGame.file } : undefined;
  const publicSaveListInput = useMemo(() => selectedPublicGame ? { platform: selectedPublicGame.platform as "nes" | "gba" | "wsc" | "saturn" | "psp", gameSlug: selectedPublicGame.slug } : demoNes ? { platform: "nes" as const, gameSlug: "homebrew-test" } : selectedImportedGame?.platform === "nes" ? { platform: "nes" as const, gameSlug: selectedImportedGame.name } : { platform: "gba" as const, gameSlug: active.mode }, [active.mode, demoNes, selectedImportedGame, selectedPublicGame]);
  const canUsePrototypeSave = librarySelection === active.mode || Boolean(selectedNesRom);
  const displayTitle = demoNesError ? "NES ERROR TEST" : demoNes ? "NES CORE TEST" : selectedPublicGame?.name ?? selectedImportedGame?.name ?? active.title;
  const publicSaves = trpc.publicSaves.list.useQuery(publicSaveListInput, { enabled: canUsePrototypeSave });
  const saveOptionLabels = getSaveOptionLabels(publicSaves.data?.map((item) => item.saveName) ?? []);
  const prototypeRowActions = getLibraryRowActions("prototype");
  const publicSave = trpc.publicSaves.get.useQuery({ saveId: selectedSaveId ?? 0 }, { enabled: Boolean(selectedSaveId) && canUsePrototypeSave });
  const trpcUtils = trpc.useUtils();
  const savePublic = trpc.publicSaves.put.useMutation({ onSuccess: (saved) => { setSaveError(""); if (saved?.id) { setSelectedSaveId(saved.id); setSaveName(saved.saveName); } void trpcUtils.publicSaves.list.invalidate(publicSaveListInput); }, onError: (error) => setSaveError(error.message) });
  const renamePublic = trpc.publicSaves.rename.useMutation({ onSuccess: () => { setSaveError(""); setRenameOpen(false); void trpcUtils.publicSaves.list.invalidate(publicSaveListInput); }, onError: (error) => setSaveError(error.message) });
  const deletePublicSave = trpc.publicSaves.delete.useMutation({ onSuccess: () => { setSaveError(""); setSelectedSaveId(undefined); setSaveName(""); void trpcUtils.publicSaves.list.invalidate(publicSaveListInput); }, onError: (error) => setSaveError(error.message) });
  const deletePublicGame = trpc.publicGames.delete.useMutation({ onSuccess: () => { setSaveError(""); setLibrarySelection(undefined); setSelectedSaveId(undefined); void trpcUtils.publicGames.list.invalidate(); }, onError: (error) => setSaveError(error.message) });
  const createGame = trpc.publicGames.create.useMutation({ onSuccess: () => { setGameUploadError(""); setManagerOpen(false); setRomFile(undefined); setCoverFile(undefined); setScreenshotFile(undefined); setGameForm({ name: "", slug: "", platform: "nes", genre: "action", description: "", players: "单人", input: "键盘/手柄" }); void trpcUtils.publicGames.list.invalidate(); }, onError: (error) => setGameUploadError(error.message) });
  const platformLabels = [{ id: "all", label: "全部平台" }, { id: "arcade", label: "街机" }, { id: "nes", label: "小霸王 NES" }, { id: "gba", label: "GBA" }, { id: "wsc", label: "WSC" }, { id: "saturn", label: "土星 SS" }, { id: "psp", label: "PSP" }];
  useEffect(() => {
    setSelectedSaveId(undefined);
    setSaveName("");
  }, [active.mode]);

  useEffect(() => {
    const first = publicSaves.data?.[0];
    if (!selectedSaveId && first) { setSelectedSaveId(first.id); setSaveName(first.saveName); }
  }, [publicSaves.data, selectedSaveId]);

  const saveDemoState = () => {
    const snapshot = gameHandle?.saveState() ?? { mode: active.mode, x: 0, y: 0, pulse: 0 };
    const payload = btoa(JSON.stringify({ ...snapshot, savedAt: new Date().toISOString() }));
    const creating = !selectedSaveId;
    const chosenName = saveName.trim() || `存档 ${new Date().toLocaleString("zh-CN")}`;
    if (!window.confirm(creating ? `创建公共存档“${chosenName}”？` : `覆盖公共存档“${chosenName}”？`)) return;
    const expectedVersion = publicSave.data?.available && "version" in publicSave.data ? publicSave.data.version : undefined;
    savePublic.mutate({ ...publicSaveListInput, saveId: selectedSaveId, saveName: chosenName, payloadBase64: payload, contentType: "application/json", expectedVersion });
  };

  const selectPublicSave = (id: number, name: string) => { setSelectedSaveId(id); setSaveName(name); };
  const createPublicSave = () => { setSelectedSaveId(undefined); setSaveName(`存档 ${new Date().toLocaleString("zh-CN")}`); };
  const renameSelectedSave = () => { if (!selectedSaveId) return; setRenameDraft(saveName); setRenameOpen(true); };
  const submitRename = () => { const nextName = renameDraft.trim(); if (!nextName) { setSaveError("存档名称不能为空"); return; } if (selectedSaveId) renamePublic.mutate({ saveId: selectedSaveId, saveName: nextName }); };
  const startLibraryGame = (selection: string, mode?: ArcadeMode) => { if (mode) setSelected(mode); setLibrarySelection(selection); setSelectedSaveId(undefined); setPlaying(true); };
  const downloadImportedGame = (file: File) => { const url = URL.createObjectURL(file); const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name; anchor.click(); URL.revokeObjectURL(url); };
  const removeImportedGame = (name: string) => { if (!window.confirm(`删除本地游戏“${name}”？`)) return; setImported((items) => items.filter((item) => item.name !== name)); if (librarySelection === name) { setLibrarySelection(undefined); setSelectedSaveId(undefined); setPlaying(false); } };
  const removePublicGame = (id: number, name: string) => { if (!window.confirm(`删除公开游戏“${name}”？该游戏的跟随存档也会被删除。`)) return; deletePublicGame.mutate({ gameId: id }); };
  const removeSelectedSave = (id: number, name: string) => { if (!window.confirm(`删除存档“${name}”？`)) return; deletePublicSave.mutate({ saveId: id }); };
  const loadPublicState = async () => {
    const url = publicSave.data && "downloadUrl" in publicSave.data ? publicSave.data.downloadUrl : undefined;
    if (!url || !gameHandle) return;
    const response = await fetch(url);
    if (!response.ok) { setSaveError("存档读取失败"); return; }
    const snapshot = await response.json() as GameSnapshot;
    gameHandle.loadState(snapshot);
  };
  const saveToolsFor = (slug: string) => { const selectedId = selectedSaveId; return librarySelection === slug && canUsePrototypeSave ? <div className="inline-save-tools" data-testid={`save-tools-${slug}`} onClick={(event) => event.stopPropagation()}><label><span>存档</span><select value={selectedSaveId?.toString() ?? "new"} onChange={(event) => { const id = Number(event.target.value); if (!id) createPublicSave(); else { const save = publicSaves.data?.find((item) => item.id === id); if (save) selectPublicSave(save.id, save.saveName); } }}><option value="new">{saveOptionLabels[0]}</option>{publicSaves.data?.map((item) => <option key={item.id} value={item.id}>{item.saveName}</option>)}</select><ChevronDown size={13} /></label><button type="button" onClick={loadPublicState} disabled={!gameHandle || !selectedSaveId || !publicSave.data?.available}>读档</button><button type="button" className="save-action" onClick={saveDemoState} disabled={savePublic.isPending}>{savePublic.isPending ? "保存中" : selectedSaveId ? "覆盖" : "保存"}</button>{shouldShowSaveDelete(selectedId) && selectedId !== undefined && <button type="button" className="save-delete-button" title="删除当前存档" aria-label={`删除存档 ${saveName}`} onClick={() => removeSelectedSave(selectedId, saveName)}><X size={13} /></button>}</div> : null; };


  const handleRomImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const supported = ["nes", "gba", "wsc", "iso", "cue", "bin", "cso", "pbp"];
    if (!supported.includes(extension)) { setImportError("不支持的文件格式，请选择 NES、GBA、WSC、SS 或 PSP 对应文件。"); event.target.value = ""; return; }
    setImportError("");
    const detected = extension === "nes" ? "nes" : extension === "gba" ? "gba" : extension === "wsc" ? "wsc" : extension === "iso" || extension === "cue" || extension === "bin" ? "saturn" : "psp";
    setImported((items) => [{ name: file.name, platform: detected, size: `${Math.max(1, Math.round(file.size / 1024 / 1024))} MB`, genre: detected === "gba" ? "动作" : detected === "saturn" ? "街机" : "冒险", players: "单人", input: "键盘/手柄", status: "本地已载入", file }, ...items]);
    event.target.value = "";
  };

  const readFileBase64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = () => reject(new Error("文件读取失败")); reader.readAsDataURL(file); });
  const submitGameUpload = async () => {
    if (!romFile) { setGameUploadError("请先选择游戏文件"); return; }
    if (!gameForm.name.trim()) { setGameUploadError("请填写游戏名称"); return; }
    const romExtension = romFile.name.split(".").pop()?.toLowerCase() ?? "";
    if (!( ["gba", "iso", "cue", "bin", "cso", "pbp"] as string[]).includes(romExtension)) { setGameUploadError("游戏文件仅支持 GBA、ISO、CUE、BIN、CSO 或 PBP"); return; }
    if (romFile.size > 30 * 1024 * 1024) { setGameUploadError("游戏文件不能超过 30 MB"); return; }
    for (const image of [coverFile, screenshotFile]) {
      if (!image) continue;
      const extension = image.name.split(".").pop()?.toLowerCase() ?? "";
      if (!( ["webp", "png", "jpg", "jpeg"] as string[]).includes(extension) || !["image/webp", "image/png", "image/jpeg"].includes(image.type)) { setGameUploadError("封面和截图仅支持 WebP、PNG 或 JPEG"); return; }
      if (image.size > 8 * 1024 * 1024) { setGameUploadError("封面或截图不能超过 8 MB"); return; }
    }
    const slug = gameForm.slug.trim() || gameForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      const romPayloadBase64 = await readFileBase64(romFile);
      const coverPayloadBase64 = coverFile ? await readFileBase64(coverFile) : undefined;
      const screenshotPayloadBase64 = screenshotFile ? await readFileBase64(screenshotFile) : undefined;
      createGame.mutate({ ...gameForm, platform: gameForm.platform as "xiaobawang" | "arcade" | "nes" | "gba" | "wsc" | "saturn" | "psp", genre: gameForm.genre as "action" | "shooter" | "platform" | "fighting" | "racing" | "puzzle" | "rpg" | "adventure" | "sports" | "other", slug, romName: romFile.name, romContentType: romFile.type || "application/octet-stream", romPayloadBase64, coverName: coverFile?.name, coverContentType: coverFile?.type, coverPayloadBase64, screenshotName: screenshotFile?.name, screenshotContentType: screenshotFile?.type, screenshotPayloadBase64 });
    } catch (error) { setGameUploadError(error instanceof Error ? error.message : "文件读取失败"); }
  };

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setPlaying(false); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);

  return (
    <main className="arcade-shell">
      <aside className="archive-rail">
        <div className="brand-mark" aria-label="小霸王街机厅标志"><img src="/manus-storage/arcade-coin-lightning-logo_f78ec9cd.png" alt="" /></div>
        <div className="rail-copy"><span>ARCADE</span><span>ARCHIVE</span></div>
        <div className="rail-rule" />
        <div className="rail-meta"><span>VOL. 01</span><span>1988—NOW</span></div>
        <div className="rail-bottom"><span className="status-dot" />ONLINE<br /><small>NO ROMS / ORIGINAL PLAY</small></div>
      </aside>

      <section className="archive-main">
        <section className="library-console library-only" aria-label="个人 ROM 游戏库">
          <div className="console-heading"><div><span className="section-index">03 / MY LIBRARY</span><h3>我的游戏库</h3></div><p>ROM 只在本次浏览器会话中读取。<br />网站不提供或分发游戏文件。</p></div>
          <div className="platform-tabs">{platformLabels.map((item) => <button key={item.id} type="button" className={platform === item.id ? "active" : ""} onClick={() => setPlatform(item.id)}>{item.label}</button>)}<button type="button" className="manage-button" onClick={() => { setGameUploadError(""); setManagerOpen(true); }}>游戏管理</button><label className="import-button"><Play size={13} /> 导入合法 ROM<input type="file" accept=".nes,.gba,.wsc,.iso,.cso,.pbp,.cue,.bin" onChange={handleRomImport} /></label>{imported.length > 0 && <button type="button" onClick={() => setImported([])}>清空本地条目</button>}</div>{importError && <div className="import-error"><Info size={14} /> {importError}</div>}
          <div className="import-list" data-testid="game-library-list">{games.filter((game) => platform === "all" || platform === game.platform).map((game) => <div role="button" tabIndex={0} className={`import-row ${librarySelection === game.mode ? "is-selected" : ""}`} key={game.mode} onClick={() => { setSelected(game.mode); setLibrarySelection(game.mode); setPlaying(false); setSelectedSaveId(undefined); }} onKeyDown={(event) => { if (event.key === "Enter") startLibraryGame(game.mode, game.mode); }}><span className="file-led" /><strong>{game.title}</strong><span>原创原型 · 单人</span><span>键盘/手柄</span><em>可运行</em><div className="row-actions" data-testid={`prototype-actions-${game.mode}`}><button type="button" disabled={!prototypeRowActions.canDownload} title="内置原创原型没有可下载 ROM" aria-label="内置原型不可下载"><Download size={12} /> 下载</button><button type="button" disabled={!prototypeRowActions.canDelete} title="内置原创原型不可删除" aria-label="内置原型不可删除"><Trash2 size={12} /> 删除</button><button type="button" className="row-start" data-testid={`start-${game.mode}`} onClick={(event) => { event.stopPropagation(); startLibraryGame(game.mode, game.mode); }}><Play size={12} /> 开始</button>{saveToolsFor(game.mode)}</div></div>)}{publicGames.data?.filter((game) => platform === "all" || game.platform === platform).map((game) => <div role="button" tabIndex={0} data-testid={`public-game-row-${game.slug}`} className={`import-row ${librarySelection === game.slug ? "is-selected" : ""}`} key={`public-${game.id}`} onClick={() => { setLibrarySelection(game.slug); setSelectedSaveId(undefined); setPlaying(false); }}><span className="file-led" /><strong>{game.name}</strong><span>{game.platform === "nes" ? "小霸王 NES" : game.platform.toUpperCase()} · {game.genre} · {game.players}</span><span>{game.input}</span><em>服务器已收录</em><div className="row-actions" data-testid={`public-game-actions-${game.slug}`}><a data-testid={`public-game-download-${game.slug}`} href={game.romUrl} download={game.romName} onClick={(event) => event.stopPropagation()}><Download size={12} /> 下载</a>{saveToolsFor(game.slug)}<button type="button" data-testid={`public-game-start-${game.slug}`} className="row-start" disabled={game.platform !== "nes"} title={game.platform === "nes" ? "开始游戏" : "该平台核心尚未接入"} onClick={(event) => { event.stopPropagation(); startLibraryGame(game.slug); }}><Play size={12} /> 开始</button><button type="button" data-testid={`public-game-delete-${game.slug}`} className="row-delete" title="删除游戏" onClick={(event) => { event.stopPropagation(); removePublicGame(game.id, game.name); }}><Trash2 size={12} /> 删除</button></div></div>)}{imported.filter((item) => platform === "all" || item.platform === platform).map((item) => <div role="button" tabIndex={0} data-testid={`imported-game-row-${item.name}`} className={`import-row ${librarySelection === item.name ? "is-selected" : ""}`} key={`${item.name}-${item.size}`} onClick={() => { setLibrarySelection(item.name); setSelectedSaveId(undefined); setPlaying(false); }}><span className="file-led" /><strong>{item.name}</strong><span>{item.platform === "nes" ? "小霸王 NES" : item.platform.toUpperCase()} · {item.genre} · {item.players}</span><span>{item.input}</span><em>{item.status}</em><div className="row-actions" data-testid={`imported-game-actions-${item.name}`}><button type="button" data-testid={`imported-game-download-${item.name}`} onClick={(event) => { event.stopPropagation(); downloadImportedGame(item.file); }}><Download size={12} /> 下载</button>{saveToolsFor(item.name)}<button type="button" data-testid={`imported-game-start-${item.name}`} className="row-start" disabled={item.platform !== "nes"} title={item.platform === "nes" ? "开始游戏" : "该平台核心尚未接入"} onClick={(event) => { event.stopPropagation(); startLibraryGame(item.name); }}><Play size={12} /> 开始</button><button type="button" data-testid={`imported-game-delete-${item.name}`} className="row-delete" title="删除本地游戏" onClick={(event) => { event.stopPropagation(); removeImportedGame(item.name); }}><Trash2 size={12} /> 删除</button></div></div>)}{games.filter((game) => platform === "all" || platform === game.platform).length === 0 && (!publicGames.data || publicGames.data.filter((game) => platform === "all" || game.platform === platform).length === 0) && imported.filter((item) => platform === "all" || item.platform === platform).length === 0 && <div className="empty-library"><Info size={16} /><span>当前平台还没有游戏。导入你拥有合法权利的 ROM，或切换到街机查看原创原型。</span></div>}{(games.length + (publicGames.data?.length ?? 0) + imported.length > 0) && !librarySelection && <div className="library-hint"><Info size={14} /> 请先点击一个游戏条目，开始按钮、存档下拉和下载/删除操作都在对应游戏后面。</div>}</div>
        </section>
        {saveError && <div className="save-error" role="alert"><Info size={14} /> {saveError}</div>}
        <footer className="archive-footer"><span><Gamepad2 size={15} /> 键盘 / 手柄均可</span><span><Info size={15} /> 原创风格复刻 · 不含原版 ROM</span><button type="button" onClick={() => setDemo(!demo)}>{demo ? "DEMO MODE ON" : "开启自动演示"}</button></footer>
      </section>

      {managerOpen && <div className="rename-modal" role="dialog" aria-modal="true" aria-label="公开游戏管理"><div className="rename-card game-manager-card"><span className="section-index">PUBLIC GAME / UPLOAD</span><h3>游戏管理</h3><p className="manager-note">公开入口：请只上传你拥有合法权利的游戏文件。ROM 最大 30 MB，封面建议 WebP 512×512，截图建议 WebP/PNG。</p><div className="manager-grid"><label>游戏名称<input value={gameForm.name} onChange={(event) => setGameForm({ ...gameForm, name: event.target.value })} placeholder="例如：我的街机游戏" /></label><label>英文标识<input value={gameForm.slug} onChange={(event) => setGameForm({ ...gameForm, slug: event.target.value })} placeholder="my-arcade-game" /></label><label>平台<select value={gameForm.platform} onChange={(event) => setGameForm({ ...gameForm, platform: event.target.value })}><option value="nes">小霸王 NES</option><option value="arcade">街机</option><option value="gba">GBA</option><option value="wsc">WSC / WonderSwan Color</option><option value="saturn">土星 SS</option><option value="psp">PSP</option></select></label><label>游戏类型<select value={gameForm.genre} onChange={(event) => setGameForm({ ...gameForm, genre: event.target.value })}><option value="action">动作</option><option value="shooter">射击</option><option value="platform">平台跳跃</option><option value="fighting">格斗</option><option value="racing">竞速</option><option value="puzzle">益智</option><option value="rpg">角色扮演</option><option value="adventure">冒险</option><option value="sports">体育</option><option value="other">其他</option></select></label><label>玩家数<input value={gameForm.players} onChange={(event) => setGameForm({ ...gameForm, players: event.target.value })} /></label><label>操控方式<input value={gameForm.input} onChange={(event) => setGameForm({ ...gameForm, input: event.target.value })} /></label></div><label className="manager-wide">简介<textarea value={gameForm.description} onChange={(event) => setGameForm({ ...gameForm, description: event.target.value })} rows={3} /></label><div className="manager-files"><label>游戏文件<input type="file" accept=".nes,.gba,.wsc,.iso,.cue,.bin,.cso,.pbp" onChange={(event) => setRomFile(event.target.files?.[0])} /></label><label>封面图片<input type="file" accept="image/webp,image/png,image/jpeg" onChange={(event) => setCoverFile(event.target.files?.[0])} /></label><label>游戏截图<input type="file" accept="image/webp,image/png,image/jpeg" onChange={(event) => setScreenshotFile(event.target.files?.[0])} /></label></div>{gameUploadError && <div className="import-error"><Info size={14} /> {gameUploadError}</div>}<div><button type="button" onClick={() => setManagerOpen(false)}>取消</button><button type="button" className="save-action" onClick={submitGameUpload} disabled={createGame.isPending}>{createGame.isPending ? "上传中" : "公开上传"}</button></div></div></div>}
      {renameOpen && <div className="rename-modal" role="dialog" aria-modal="true" aria-label="重命名公共存档"><div className="rename-card"><span className="section-index">PUBLIC SAVE / RENAME</span><h3>重命名存档</h3><input autoFocus value={renameDraft} maxLength={160} onChange={(event) => setRenameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitRename(); if (event.key === "Escape") setRenameOpen(false); }} /><div><button type="button" onClick={() => setRenameOpen(false)}>取消</button><button type="button" className="save-action" onClick={submitRename} disabled={renamePublic.isPending}>{renamePublic.isPending ? "保存中" : "确认"}</button></div></div></div>}
      {playing && <div className="game-modal" role="dialog" aria-modal="true" aria-label={`${displayTitle} 游戏窗口`}><div className="game-modal-head"><div><span>PLAYER 1 READY</span><strong>{displayTitle}</strong></div><div className="modal-actions"><span>WASD / 方向键移动 · J / 空格射击</span><button type="button" onClick={() => setPlaying(false)} aria-label="退出游戏"><X size={20} /></button></div></div><div className="game-viewport">{selectedNesRom ? <NesEmulator {...selectedNesRom} onReady={setGameHandle} /> : <GameCanvas mode={active.mode} demo={demo} onReady={setGameHandle} />}<div className="scanlines" />{!selectedNesRom && <div className="hud"><span>1P 00</span><span>SCORE 000000</span><span>TIME 99</span></div>}</div><div className="game-modal-foot"><span>ESC 返回档案室</span><span>INSERT COIN / ORIGINAL PROTOTYPE</span></div></div>}
    </main>
  );
}
