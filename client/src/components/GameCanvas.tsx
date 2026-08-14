// 设计提醒：像素街机档案馆。Babylon 只负责 CRT 游戏画布，React 负责外层展柜与状态；输入反馈必须即时。
import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { ArcadeMode, createGameScene, GameHandle } from "@/game/scene";
import type { SaveableHandle } from "@/components/NesEmulator";

type GameCanvasProps = { mode: ArcadeMode; demo?: boolean; onReady?: (handle: (GameHandle & SaveableHandle) | undefined) => void };

export default function GameCanvas({ mode, demo = false, onReady }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialized = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || initialized.current) return;
    initialized.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    let disposed = false;
    let handle: Awaited<ReturnType<typeof createGameScene>> | undefined;
    createGameScene(engine, canvas, mode, demo).then((nextHandle) => {
      if (disposed) nextHandle.dispose();
      else {
        handle = nextHandle;
        onReadyRef.current?.(nextHandle);
        engine.runRenderLoop(() => nextHandle.scene.render());
      }
    });
    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    return () => {
      disposed = true;
      window.removeEventListener("resize", resize);
      handle?.dispose();
      onReadyRef.current?.(undefined);
      engine.stopRenderLoop();
      engine.dispose();
      initialized.current = false;
    };
  }, [mode, demo]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="街机游戏画布" />;
}
