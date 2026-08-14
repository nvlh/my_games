// 设计提醒：像素街机档案馆。深色 CRT 舞台、投币橙关键反馈、即时输入反馈；保持 React 与 Babylon 解耦。
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import "@babylonjs/core/Materials/standardMaterial";

export type ArcadeMode = "runner" | "tank" | "snow";
export type GameSnapshot = { mode: ArcadeMode; x: number; y: number; pulse: number };
export type GameHandle = { scene: Scene; dispose: () => void; saveState: () => GameSnapshot; loadState: (snapshot: unknown) => void };

const BACKGROUNDS: Record<ArcadeMode, string> = {
  runner: "/manus-storage/arcade-runner-scene_be11261c.png",
  tank: "/manus-storage/arcade-tank-snow-scenes_83a2ce04.png",
  snow: "/manus-storage/arcade-tank-snow-scenes_83a2ce04.png",
};

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement, mode: ArcadeMode = "runner", demo = false): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.025, 0.045, 0.09, 1);
  const camera = new FreeCamera("arcade-camera", new Vector3(0, 0, -10), scene);
  camera.setTarget(Vector3.Zero());
  camera.mode = 1;
  camera.orthoLeft = -8;
  camera.orthoRight = 8;
  camera.orthoTop = 4.5;
  camera.orthoBottom = -4.5;

  const board = MeshBuilder.CreatePlane("crt-board", { width: 16, height: 9 }, scene);
  const boardMaterial = new StandardMaterial("board-material", scene);
  boardMaterial.diffuseTexture = new Texture(BACKGROUNDS[mode], scene);
  boardMaterial.emissiveColor = new Color3(0.4, 0.35, 0.25);
  boardMaterial.alpha = 0.86;
  board.material = boardMaterial;

  const player = MeshBuilder.CreateBox("player", { width: 0.55, height: 0.7, depth: 0.15 }, scene);
  player.position = new Vector3(-5.5, -2.4, -0.25);
  const playerMaterial = new StandardMaterial("player-material", scene);
  playerMaterial.diffuseColor = mode === "tank" ? new Color3(0.1, 0.84, 0.75) : new Color3(0.95, 0.36, 0.16);
  playerMaterial.emissiveColor = playerMaterial.diffuseColor;
  player.material = playerMaterial;

  const projectileMaterial = new StandardMaterial("projectile-material", scene);
  projectileMaterial.diffuseColor = new Color3(1, 0.82, 0.3);
  projectileMaterial.emissiveColor = projectileMaterial.diffuseColor;
  const projectiles: { mesh: ReturnType<typeof MeshBuilder.CreateBox>; life: number }[] = [];
  const keys = new Set<string>();
  let disposed = false;
  let last = performance.now();
  let pulse = 0;

  const down = (event: KeyboardEvent) => {
    keys.add(event.key.toLowerCase());
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(event.key.toLowerCase())) event.preventDefault();
    if (event.key.toLowerCase() === "j" || event.key === " ") {
      const shot = MeshBuilder.CreateBox(`shot-${performance.now()}`, { width: 0.3, height: 0.08, depth: 0.08 }, scene);
      shot.position = player.position.add(new Vector3(0.45, 0.08, -0.1));
      shot.material = projectileMaterial;
      projectiles.push({ mesh: shot, life: 1.4 });
    }
  };
  const up = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);

  scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    pulse += dt;
    const left = keys.has("arrowleft") || keys.has("a");
    const right = keys.has("arrowright") || keys.has("d");
    const upKey = keys.has("arrowup") || keys.has("w");
    const downKey = keys.has("arrowdown") || keys.has("s");
    const speed = mode === "tank" ? 2.2 : 3.2;
    if (demo) {
      player.position.x = -5.2 + Math.sin(pulse * 0.9) * 2.6;
      player.position.y = -2.4 + Math.sin(pulse * 1.7) * 0.3;
      if (Math.floor(pulse * 2) % 2 === 0 && projectiles.length < 3) {
        const shot = MeshBuilder.CreateBox(`demo-shot-${pulse}`, { width: 0.3, height: 0.08, depth: 0.08 }, scene);
        shot.position = player.position.add(new Vector3(0.45, 0.08, -0.1));
        shot.material = projectileMaterial;
        projectiles.push({ mesh: shot, life: 1.4 });
      }
    } else {
      if (left) player.position.x -= speed * dt;
      if (right) player.position.x += speed * dt;
      if (upKey) player.position.y += speed * dt;
      if (downKey) player.position.y -= speed * dt;
      player.position.x = Math.max(-6.8, Math.min(6.8, player.position.x));
      player.position.y = Math.max(-3.5, Math.min(3.1, player.position.y));
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const shot = projectiles[i];
      shot.mesh.position.x += 8 * dt;
      shot.life -= dt;
      if (shot.life <= 0 || shot.mesh.position.x > 8) {
        shot.mesh.dispose();
        projectiles.splice(i, 1);
      }
    }
  });

  return { scene, saveState: () => ({ mode, x: player.position.x, y: player.position.y, pulse }), loadState: (snapshot: unknown) => { if (!snapshot || typeof snapshot !== "object" || !("mode" in snapshot) || !("x" in snapshot) || !("y" in snapshot) || !("pulse" in snapshot)) return; const state = snapshot as GameSnapshot; if (state.mode === mode) { player.position.x = state.x; player.position.y = state.y; pulse = state.pulse; } }, dispose: () => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    scene.dispose();
  }};
}
