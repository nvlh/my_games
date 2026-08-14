import { useEffect, useRef, useState } from "react";
import { Browser } from "jsnes";
import { createNesSavePayload, formatNesLoadError, isNesSavePayload, loadNesRom } from "@/game/nes";

export type SaveableHandle = {
  saveState: () => unknown;
  loadState: (snapshot: unknown) => void;
};

type NesEmulatorProps = {
  romUrl?: string;
  romFile?: File;
  onReady?: (handle: SaveableHandle | undefined) => void;
};

export default function NesEmulator({ romUrl, romFile, onReady }: NesEmulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const browserRef = useRef<Browser | null>(null);
  const [status, setStatus] = useState("NES 核心加载中");
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container || (!romUrl && !romFile)) return;

    const load = async () => {
      try {
        setStatus("正在读取 NES 游戏文件");
        const romData = await loadNesRom({ romUrl, romFile });
        if (disposed) return;

        const browser = new Browser({
          container,
          onError: (nextError) => setError(formatNesLoadError(nextError)),
        });
        browser.loadROM(romData);
        browser.fitInParent();
        browserRef.current = browser;
        const handle: SaveableHandle = {
          saveState: () => createNesSavePayload(browser.nes.toJSON()),
          loadState: (snapshot) => {
            if (!isNesSavePayload(snapshot)) return;
            browser.nes.fromJSON(snapshot.state);
          },
        };
        onReady?.(handle);
        setStatus("NES 已就绪 · 方向键 / Z X / Enter · P 暂停");
      } catch (nextError) {
        const message = formatNesLoadError(nextError);
        setError(message);
        setStatus("NES 无法启动");
        onReady?.(undefined);
      }
    };

    void load();
    return () => {
      disposed = true;
      browserRef.current?.destroy();
      browserRef.current = null;
      onReady?.(undefined);
      container.replaceChildren();
    };
  }, [romFile, romUrl, onReady]);

  const togglePause = () => {
    const browser = browserRef.current;
    if (!browser) return;
    if (paused) {
      browser.start();
      setPaused(false);
      setStatus("NES 运行中 · P 暂停");
    } else {
      browser.stop();
      setPaused(true);
      setStatus("NES 已暂停 · 点击继续或按 P");
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="nes-emulator-shell">
      <div ref={containerRef} className="nes-emulator" aria-label="NES 游戏画布" />
      <div className="nes-status" role="status">{error || status}</div><button type="button" className="nes-pause" onClick={togglePause} disabled={!browserRef.current}>{paused ? "继续" : "暂停"}</button>
    </div>
  );
}
