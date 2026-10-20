import {
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OrthographicCamera,
  Plane,
  PlaneGeometry,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { findPath, findPathBeside } from "./pathfind.js";

const VIEW_SIZE = 15;
const CAMERA_RADIUS = 22;
const CAMERA_PITCH = Math.atan(Math.SQRT1_2);
const WALK_SPEED = 3.4;
const BODY_RADIUS = 0.26;
const IDLE_FRAME_MS = 100;
const BLINK_MS = 250;
const MAX_DPR = 2;
const COLORS = {
  background: "#e8ecff",
  tileA: "#dfe5ff",
  tileB: "#cdd6ff",
  slab: "#312e81",
  rack: "#334155",
  hot: "#ef4444",
  indigo: "#4f46e5",
  white: "#f8fafc",
  accent: "#f97316",
  dark: "#1e1b4b",
  padOpen: "#a5b4fc",
  padLocked: "#64748b",
  broken: "#1f2937",
  screen: "#22d3ee",
};
const TIER_HEIGHT = [0, 0.9, 1.15, 1.4, 1.7];
const TIER_COLOR = ["#334155", "#475569", "#4f46e5", "#0891b2", "#7c3aed"];
const COOLER_HEIGHT = [0.12, 0.7, 1, 1.3];
const COOLER_COLOR = ["#c7d2fe", "#22d3ee", "#06b6d4", "#0891b2"];
const LED_COLORS = ["#22c55e", "#22c55e", "#22c55e", "#15803d", "#f59e0b"];
const MOVE_KEYS = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

/**
 * 도형만으로 관리자 로봇을 만든다. 팔과 다리는 걸을 때 흔들 수 있게 관절 그룹에 달려 있다.
 *
 * @returns { group, legs, arms } 로봇 전체와 흔들 관절 두 쌍
 */
function buildRobot() {
  const mats = {
    body: new MeshLambertMaterial({ color: COLORS.indigo }),
    head: new MeshLambertMaterial({ color: COLORS.white }),
    accent: new MeshLambertMaterial({ color: COLORS.accent }),
    dark: new MeshLambertMaterial({ color: COLORS.dark }),
  };
  const group = new Group();
  const add = (geometry, material, x, y, z, parent = group) => {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  add(new BoxGeometry(0.42, 0.46, 0.3), mats.body, 0, 0.55, 0);
  add(new BoxGeometry(0.36, 0.3, 0.32), mats.head, 0, 0.97, 0);
  add(new BoxGeometry(0.07, 0.09, 0.02), mats.dark, -0.09, 0.99, 0.17);
  add(new BoxGeometry(0.07, 0.09, 0.02), mats.dark, 0.09, 0.99, 0.17);
  add(new CylinderGeometry(0.015, 0.015, 0.16), mats.dark, 0, 1.2, 0);
  add(new SphereGeometry(0.045, 8, 6), mats.accent, 0, 1.3, 0);
  add(new BoxGeometry(0.22, 0.12, 0.02), mats.accent, 0, 0.58, 0.16);
  const joint = (x, y, geometry, material, offset) => {
    const pivot = new Group();
    pivot.position.set(x, y, 0);
    add(geometry, material, 0, offset, 0, pivot);
    group.add(pivot);
    return pivot;
  };
  const armGeometry = new BoxGeometry(0.1, 0.36, 0.1);
  const legGeometry = new BoxGeometry(0.12, 0.3, 0.14);
  const arms = [joint(-0.28, 0.72, armGeometry, mats.body, -0.16), joint(0.28, 0.72, armGeometry, mats.body, -0.16)];
  const legs = [joint(-0.1, 0.3, legGeometry, mats.dark, -0.15), joint(0.1, 0.3, legGeometry, mats.dark, -0.15)];
  return { group, legs, arms };
}

/**
 * 3D 데이터센터 장면을 만든다. 아이소메트릭 직교 카메라, 격자 바닥, 랙 자리, 냉각기, 단말기, 관리자 로봇을 올리고
 * 클릭 이동(8방향 길찾기), WASD와 방향키 이동, Q/E 카메라 회전, 휠 확대를 받는다.
 * 랙, 냉각기, 단말기를 누르거나 그 앞에서 Space와 Enter를 누르면 옆 칸까지 걸어가 onInteract를 부른다.
 * 모양은 setWorld로 바꾼다. WebGL을 쓸 수 없으면 null을 돌려준다.
 *
 * @param container 캔버스를 넣을 요소
 * @param options.width 가로 칸 수
 * @param options.height 세로 칸 수
 * @param options.pads [x, y] 랙 자리 목록(통과할 수 없는 칸)
 * @param options.coolerPads [x, y] 냉각기 자리 목록(통과할 수 없는 칸)
 * @param options.terminal [x, y] 단말기 칸(통과할 수 없는 칸)
 * @param options.start [x, y] 로봇이 서는 칸
 * @param options.onInteract 작업할 때 호출, { kind: "rack" | "cooler" | "terminal", index }를 받는다
 * @returns { setWorld, dispose, stats } 또는 WebGL을 못 쓰면 null
 */
export function createScene(container, { width, height, pads, coolerPads, terminal, start, onInteract = () => {} }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  renderer.setPixelRatio(dpr);
  const canvas = renderer.domElement;
  canvas.className = "block h-full w-full touch-none";
  container.append(canvas);

  const scene = new Scene();
  scene.background = new Color(COLORS.background);
  scene.add(new AmbientLight("#ffffff", 1.7));
  const sun = new DirectionalLight("#ffffff", 1.6);
  sun.position.set(-6, 14, 8);
  scene.add(sun);

  const targets = [
    ...pads.map((tile, index) => ({ kind: "rack", index, tile })),
    ...coolerPads.map((tile, index) => ({ kind: "cooler", index, tile })),
    { kind: "terminal", index: 0, tile: terminal },
  ];
  const targetAt = new Map(targets.map((target) => [target.tile[1] * width + target.tile[0], target]));
  const blocked = new Set(targetAt.keys());
  const center = new Vector3(width / 2, 0, height / 2);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const view = { index: 0, angle: Math.PI / 4, zoom: 1 };

  const tiles = new InstancedMesh(new BoxGeometry(0.98, 0.12, 0.98), new MeshLambertMaterial(), width * height);
  const matrix = new Matrix4();
  const tint = new Color();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      tiles.setMatrixAt(i, matrix.makeTranslation(x + 0.5, -0.06, y + 0.5));
      tiles.setColorAt(i, tint.set((x + y) % 2 ? COLORS.tileA : COLORS.tileB));
    }
  }
  scene.add(tiles);
  const slab = new Mesh(new BoxGeometry(width + 0.7, 0.5, height + 0.7), new MeshLambertMaterial({ color: COLORS.slab }));
  slab.position.set(width / 2, -0.37, height / 2);
  scene.add(slab);

  const padMesh = new InstancedMesh(new BoxGeometry(0.94, 0.1, 0.94), new MeshLambertMaterial(), pads.length);
  const rackMesh = new InstancedMesh(new BoxGeometry(0.84, 1, 0.76), new MeshLambertMaterial(), pads.length);
  const ledMesh = new InstancedMesh(new BoxGeometry(0.6, 0.06, 0.02), new MeshBasicMaterial(), pads.length * 4);
  const coolerMesh = new InstancedMesh(new BoxGeometry(0.8, 1, 0.8), new MeshLambertMaterial(), coolerPads.length);
  scene.add(padMesh, rackMesh, ledMesh, coolerMesh);

  const terminalMesh = new Group();
  const terminalBody = new Mesh(new BoxGeometry(0.8, 0.9, 0.55), new MeshLambertMaterial({ color: COLORS.dark }));
  terminalBody.position.y = 0.45;
  const terminalScreen = new Mesh(new BoxGeometry(0.6, 0.36, 0.02), new MeshBasicMaterial({ color: COLORS.screen }));
  terminalScreen.position.set(0, 0.62, 0.29);
  terminalMesh.add(terminalBody, terminalScreen);
  terminalMesh.position.set(terminal[0] + 0.5, 0, terminal[1] + 0.5);
  scene.add(terminalMesh);

  const rackColors = pads.map(() => new Color(COLORS.rack));
  const brokenFlags = pads.map(() => false);
  let world = {
    racks: pads.map(() => ({ tier: 0, broken: false, open: false, heat: 0 })),
    coolers: coolerPads.map(() => 0),
  };
  let worldDirty = true;

  const applyWorld = () => {
    worldDirty = false;
    world.racks.forEach((rack, i) => {
      const [x, y] = pads[i];
      padMesh.setMatrixAt(i, matrix.makeTranslation(x + 0.5, 0.05, y + 0.5));
      padMesh.setColorAt(i, tint.set(rack.open ? COLORS.padOpen : COLORS.padLocked));
      const h = TIER_HEIGHT[rack.tier];
      rackMesh.setMatrixAt(i, h ? matrix.makeScale(1, h, 1).setPosition(x + 0.5, h / 2, y + 0.5) : matrix.makeScale(0, 0, 0));
      rackColors[i].set(rack.broken ? COLORS.broken : TIER_COLOR[rack.tier]).lerp(tint.set(COLORS.hot), rack.broken ? 0 : rack.heat * 0.6);
      rackMesh.setColorAt(i, rackColors[i]);
      brokenFlags[i] = rack.broken;
      const front = y + 0.5 < height / 2 ? 1 : -1;
      for (let row = 0; row < 4; row += 1) {
        const lit = h && !rack.broken && row < rack.tier;
        ledMesh.setMatrixAt(
          i * 4 + row,
          lit ? matrix.makeTranslation(x + 0.5, 0.25 + row * 0.28, y + 0.5 + front * 0.39) : matrix.makeScale(0, 0, 0),
        );
      }
    });
    world.coolers.forEach((level, c) => {
      const [x, y] = coolerPads[c];
      const h = COOLER_HEIGHT[level];
      coolerMesh.setMatrixAt(c, matrix.makeScale(1, h, 1).setPosition(x + 0.5, h / 2, y + 0.5));
      coolerMesh.setColorAt(c, tint.set(COOLER_COLOR[level]));
    });
    for (const mesh of [padMesh, rackMesh, ledMesh, coolerMesh]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  };

  const hover = new Mesh(
    new PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: "#fbbf24", transparent: true, opacity: 0.55, depthWrite: false }),
  );
  const goal = new Mesh(
    new PlaneGeometry(0.7, 0.7).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: COLORS.indigo, transparent: true, opacity: 0.6, depthWrite: false }),
  );
  hover.position.y = 0.02;
  goal.position.y = 0.03;
  hover.visible = false;
  goal.visible = false;
  scene.add(hover, goal);

  const robot = buildRobot();
  scene.add(robot.group);
  const player = { x: start[0] + 0.5, z: start[1] + 0.5, facing: 0, path: [], target: null, walk: 0 };
  robot.group.position.set(player.x, 0, player.z);

  const keys = new Set();
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const floor = new Plane(new Vector3(0, 1, 0), 0);
  const hit = new Vector3();
  const pointer = { x: 0, y: 0, dirty: false };
  const frames = [];
  let lastTick = performance.now();
  let lastRender = 0;
  let lastBlink = -1;
  let raf = 0;
  let disposed = false;

  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.left = (-VIEW_SIZE * aspect) / 2;
    camera.right = (VIEW_SIZE * aspect) / 2;
    camera.top = VIEW_SIZE / 2;
    camera.bottom = -VIEW_SIZE / 2;
    camera.zoom = view.zoom * Math.min(1, aspect / 1.1);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const placeCamera = () => {
    camera.position.set(
      center.x + Math.cos(view.angle) * CAMERA_RADIUS,
      Math.tan(CAMERA_PITCH) * CAMERA_RADIUS,
      center.z + Math.sin(view.angle) * CAMERA_RADIUS,
    );
    camera.lookAt(center);
  };
  placeCamera();

  const solid = (x, z) => {
    const tx = Math.floor(x);
    const tz = Math.floor(z);
    return tx < 0 || tz < 0 || tx >= width || tz >= height || blocked.has(tz * width + tx);
  };
  const collides = (x, z) =>
    solid(x - BODY_RADIUS, z - BODY_RADIUS) ||
    solid(x + BODY_RADIUS, z - BODY_RADIUS) ||
    solid(x - BODY_RADIUS, z + BODY_RADIUS) ||
    solid(x + BODY_RADIUS, z + BODY_RADIUS);
  const slide = (dx, dz) => {
    if (!collides(player.x + dx, player.z)) player.x += dx;
    if (!collides(player.x, player.z + dz)) player.z += dz;
  };

  const inputVector = () => {
    const fx = -Math.cos(view.angle);
    const fz = -Math.sin(view.angle);
    let vx = 0;
    let vz = 0;
    if (keys.has("forward")) { vx += fx; vz += fz; }
    if (keys.has("back")) { vx -= fx; vz -= fz; }
    if (keys.has("right")) { vx -= fz; vz += fx; }
    if (keys.has("left")) { vx += fz; vz -= fx; }
    const length = Math.hypot(vx, vz);
    return length > 0 ? [vx / length, vz / length] : [0, 0];
  };

  const nearestTarget = () => {
    let best = null;
    let bestDistance = 1.6;
    for (const target of targets) {
      const distance = Math.hypot(target.tile[0] + 0.5 - player.x, target.tile[1] + 0.5 - player.z);
      if (distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }
    return best;
  };

  const interact = (target) => {
    if (target) onInteract({ kind: target.kind, index: target.index });
  };

  const stopPath = () => {
    player.path = [];
    player.target = null;
    goal.visible = false;
  };

  const goTo = (path, target) => {
    if (path === null) return;
    player.path = path.length ? [[Math.floor(player.x), Math.floor(player.z)], ...path] : path;
    player.target = target;
    const last = path[path.length - 1];
    goal.visible = Boolean(last);
    if (last) goal.position.set(last[0] + 0.5, 0.03, last[1] + 0.5);
    if (path.length === 0) interact(target);
  };

  const pick = () => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((pointer.x - rect.left) / rect.width) * 2 - 1, -((pointer.y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = [];
    const rack = raycaster.intersectObject(rackMesh)[0];
    if (rack) hits.push([rack.distance, targets[rack.instanceId]]);
    const cooler = raycaster.intersectObject(coolerMesh)[0];
    if (cooler) hits.push([cooler.distance, targets[pads.length + cooler.instanceId]]);
    const screen = raycaster.intersectObject(terminalMesh, true)[0];
    if (screen) hits.push([screen.distance, targets[targets.length - 1]]);
    if (hits.length) {
      const target = hits.sort((a, b) => a[0] - b[0])[0][1];
      return { target, tile: target.tile };
    }
    if (!raycaster.ray.intersectPlane(floor, hit)) return null;
    const x = Math.floor(hit.x);
    const y = Math.floor(hit.z);
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    return { target: targetAt.get(y * width + x) ?? null, tile: [x, y] };
  };

  const onPointerMove = (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.dirty = true;
  };
  const onPointerLeave = () => {
    hover.visible = false;
    pointer.dirty = false;
  };
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const picked = pick();
    if (!picked) return;
    const here = [Math.floor(player.x), Math.floor(player.z)];
    if (picked.target) goTo(findPathBeside(blocked, width, height, here, picked.tile), picked.target);
    else goTo(findPath(blocked, width, height, here, picked.tile), null);
  };
  const onWheel = (event) => {
    event.preventDefault();
    view.zoom = MathUtils.clamp(view.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1), 0.7, 1.8);
    resize();
  };
  const onKeyDown = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest("input, textarea, select, button, a, summary")) return;
    if (MOVE_KEYS[event.code]) {
      event.preventDefault();
      keys.add(MOVE_KEYS[event.code]);
    } else if (event.code === "KeyQ" || event.code === "KeyE") {
      if (!event.repeat) view.index += event.code === "KeyE" ? 1 : -1;
    } else if (event.code === "Space" || event.code === "Enter") {
      const near = nearestTarget();
      if (!near) return;
      event.preventDefault();
      if (!event.repeat) interact(near);
    }
  };
  const onKeyUp = (event) => {
    if (MOVE_KEYS[event.code]) keys.delete(MOVE_KEYS[event.code]);
  };
  const onBlur = () => keys.clear();
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  const blink = (now) => {
    const tick = Math.floor(now / BLINK_MS);
    if (tick === lastBlink) return;
    lastBlink = tick;
    for (let i = 0; i < pads.length * 4; i += 1) {
      const roll = (Math.imul(i + 1, 2654435761) + Math.imul(tick, 40503)) >>> 0;
      ledMesh.setColorAt(i, tint.set(LED_COLORS[roll % LED_COLORS.length]));
    }
    if (ledMesh.instanceColor) ledMesh.instanceColor.needsUpdate = true;
    let flashed = false;
    brokenFlags.forEach((broken, i) => {
      if (!broken) return;
      rackMesh.setColorAt(i, tint.set(tick % 2 ? COLORS.hot : COLORS.broken));
      flashed = true;
    });
    if (flashed) rackMesh.instanceColor.needsUpdate = true;
  };

  const update = (dt, now) => {
    const [vx, vz] = inputVector();
    let moving = false;
    let dirX = 0;
    let dirZ = 0;
    if (vx !== 0 || vz !== 0) {
      if (player.path.length) stopPath();
      slide(vx * WALK_SPEED * dt, vz * WALK_SPEED * dt);
      dirX = vx;
      dirZ = vz;
      moving = true;
    } else if (player.path.length) {
      const [tx, ty] = player.path[0];
      const dx = tx + 0.5 - player.x;
      const dz = ty + 0.5 - player.z;
      const distance = Math.hypot(dx, dz);
      const step = WALK_SPEED * dt;
      if (distance <= step) {
        player.x = tx + 0.5;
        player.z = ty + 0.5;
        player.path.shift();
        if (!player.path.length) {
          const arrived = player.target;
          stopPath();
          interact(arrived);
        }
      } else {
        player.x += (dx / distance) * step;
        player.z += (dz / distance) * step;
        dirX = dx / distance;
        dirZ = dz / distance;
      }
      moving = true;
    }
    if (dirX !== 0 || dirZ !== 0) {
      const turn = MathUtils.euclideanModulo(Math.atan2(dirX, dirZ) - player.facing + Math.PI, Math.PI * 2) - Math.PI;
      player.facing += turn * (1 - Math.exp(-dt * 14));
    }
    player.walk = moving ? player.walk + dt * 11 : MathUtils.lerp(player.walk, Math.round(player.walk / Math.PI) * Math.PI, 1 - Math.exp(-dt * 12));
    const swing = moving ? Math.sin(player.walk) * 0.7 : 0;
    robot.legs[0].rotation.x = swing;
    robot.legs[1].rotation.x = -swing;
    robot.arms[0].rotation.x = -swing * 0.8;
    robot.arms[1].rotation.x = swing * 0.8;
    robot.group.position.set(player.x, moving ? Math.abs(Math.sin(player.walk)) * 0.04 : 0, player.z);
    robot.group.rotation.y = player.facing;

    const target = Math.PI / 4 + view.index * (Math.PI / 2);
    const gap = target - view.angle;
    const rotating = Math.abs(gap) > 0.001;
    view.angle = rotating ? view.angle + gap * (1 - Math.exp(-dt * 10)) : target;
    if (rotating) placeCamera();

    if (pointer.dirty) {
      pointer.dirty = false;
      const picked = pick();
      hover.visible = Boolean(picked);
      if (picked) hover.position.set(picked.tile[0] + 0.5, 0.02, picked.tile[1] + 0.5);
    }
    blink(now);
    return moving || rotating;
  };

  const loop = (now) => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) {
      lastTick = now;
      return;
    }
    const busy = keys.size > 0 || player.path.length > 0 || Math.abs(Math.PI / 4 + view.index * (Math.PI / 2) - view.angle) > 0.001;
    if (!busy && !pointer.dirty && !worldDirty && now - lastRender < IDLE_FRAME_MS) return;
    const dt = Math.min((now - lastTick) / 1000, 0.05);
    lastTick = now;
    if (worldDirty) applyWorld();
    update(dt, now);
    renderer.render(scene, camera);
    if (lastRender) {
      frames.push(now - lastRender);
      if (frames.length > 60) frames.shift();
    }
    lastRender = now;
  };
  raf = requestAnimationFrame(loop);

  return {
    setWorld(next) {
      world = next;
      worldDirty = true;
    },
    stats() {
      const average = frames.length ? frames.reduce((a, b) => a + b, 0) / frames.length : 0;
      return {
        fps: average ? Math.round(1000 / average) : 0,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        dpr,
        position: [Number(player.x.toFixed(2)), Number(player.z.toFixed(2))],
        pathLeft: player.path.length,
      };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      scene.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
        object.geometry?.dispose();
        object.material?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}