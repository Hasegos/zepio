import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
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

const CAMERA_RADIUS = 40;
const CAMERA_PITCH = Math.atan(Math.SQRT1_2);
const VIEW_PER_TILE = 0.72;
const MIN_VIEW = 9.5;
const WALK_SPEED = 3.4;
const BODY_RADIUS = 0.26;
const IDLE_FRAME_MS = 100;
const BLINK_MS = 250;
const MAX_DPR = 2;
const MAX_LINKS = 700;
const COLORS = {
  background: "#e8ecff",
  tileA: "#dfe5ff",
  tileB: "#cdd6ff",
  outside: "#b4bde8",
  outsideNext: "#c3cbf0",
  slab: "#312e81",
  hot: "#ef4444",
  warm: "#fcd34d",
  indigo: "#4f46e5",
  white: "#f8fafc",
  accent: "#f97316",
  dark: "#1e1b4b",
  broken: "#1f2937",
  screen: "#22d3ee",
  good: "#22c55e",
  bad: "#ef4444",
};
const SERVER_HEIGHT = [0, 0.9, 1.15, 1.4, 1.7];
const SERVER_COLOR = ["#334155", "#475569", "#4f46e5", "#0891b2", "#7c3aed"];
const COOLER_HEIGHT = [0, 0.7, 1, 1.3];
const COOLER_COLOR = ["#c7d2fe", "#22d3ee", "#06b6d4", "#0891b2"];
const HUB_HEIGHT = [0, 0.6, 0.8, 1, 1.25];
const HUB_COLOR = ["#34d399", "#34d399", "#10b981", "#059669", "#047857"];
const GEN_HEIGHT = [0, 0.35, 0.6, 0.9, 1.2];
const GEN_COLOR = ["#fde047", "#fde047", "#f59e0b", "#ea580c", "#dc2626"];
const GHOST_HEIGHT = { server: 1, cooler: 0.8, hub: 0.7, gen: 0.5 };
const GHOST_COLOR = { server: "#6366f1", cooler: "#22d3ee", hub: "#10b981", gen: "#f59e0b" };
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
 * 3D 데이터센터 장면을 만든다. 아이소메트릭 직교 카메라, 격자 바닥(넓힌 부지만 밝게), 시설, 단말기, 관리자 로봇을 올리고
 * 클릭 이동(8방향 길찾기), WASD와 방향키 이동, Q/E 카메라 회전, 휠 확대, 끌어서 여러 칸 누르기를 받는다.
 * 칸을 누르면 onTile로 알리기만 하고, 무엇을 할지는 부르는 쪽이 정한다. 모양은 setWorld로 바꾼다.
 * WebGL을 쓸 수 없으면 null을 돌려준다.
 *
 * @param container 캔버스를 넣을 요소
 * @param options.width 가로 칸 수
 * @param options.height 세로 칸 수
 * @param options.terminal [x, y] 단말기 칸(통과할 수 없는 칸)
 * @param options.start [x, y] 로봇이 서는 칸
 * @param options.onTile 칸을 누르거나 끌 때 호출, { tile, drag }를 받는다
 * @param options.onHover 가리키는 칸이 바뀔 때 호출, 칸 번호나 null을 받는다
 * @param options.onInteract 로봇 앞에서 Space나 Enter를 눌렀을 때 호출, 칸 번호를 받는다
 * @param options.onCancel 오른쪽 클릭했을 때 호출
 * @returns { setWorld, walkTo, walkBeside, robotTile, dispose } 또는 WebGL을 못 쓰면 null
 */
export function createScene(
  container,
  { width, height, terminal, start, onTile = () => {}, onHover = () => {}, onInteract = () => {}, onCancel = () => {} },
) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const area = width * height;
  const terminalTile = terminal[1] * width + terminal[0];
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

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 150);
  const view = {
    index: 0,
    angle: Math.PI / 4,
    zoom: 1,
    size: 14,
    targetSize: 14,
    x: width / 2,
    z: height / 2,
    targetX: width / 2,
    targetZ: height / 2,
  };
  const matrix = new Matrix4();
  const tint = new Color();
  const tintB = new Color();

  const tiles = new InstancedMesh(new BoxGeometry(0.98, 0.12, 0.98), new MeshLambertMaterial(), area);
  scene.add(tiles);
  const slab = new Mesh(new BoxGeometry(1, 0.5, 1), new MeshLambertMaterial({ color: COLORS.slab }));
  scene.add(slab);

  const serverMesh = new InstancedMesh(new BoxGeometry(0.84, 1, 0.76), new MeshLambertMaterial(), area);
  const coolerMesh = new InstancedMesh(new BoxGeometry(0.8, 1, 0.8), new MeshLambertMaterial(), area);
  const hubMesh = new InstancedMesh(new CylinderGeometry(0.3, 0.36, 1, 18), new MeshLambertMaterial(), area);
  const genMesh = new InstancedMesh(new BoxGeometry(0.9, 1, 0.9), new MeshLambertMaterial(), area);
  const ledMesh = new InstancedMesh(new BoxGeometry(0.6, 0.06, 0.02), new MeshBasicMaterial(), area * 4);
  const itemMeshes = [serverMesh, coolerMesh, hubMesh, genMesh];
  scene.add(...itemMeshes, ledMesh);
  for (const mesh of [...itemMeshes, ledMesh]) {
    mesh.frustumCulled = false;
    for (let i = 0; i < mesh.count; i += 1) mesh.setMatrixAt(i, matrix.makeScale(0, 0, 0));
  }

  const terminalMesh = new Group();
  const terminalBody = new Mesh(new BoxGeometry(0.8, 0.9, 0.55), new MeshLambertMaterial({ color: COLORS.dark }));
  terminalBody.position.y = 0.45;
  const terminalScreen = new Mesh(new BoxGeometry(0.6, 0.36, 0.02), new MeshBasicMaterial({ color: COLORS.screen }));
  terminalScreen.position.set(0, 0.62, 0.29);
  terminalMesh.add(terminalBody, terminalScreen);
  terminalMesh.position.set(terminal[0] + 0.5, 0, terminal[1] + 0.5);
  scene.add(terminalMesh);

  const rangeMesh = new InstancedMesh(
    new PlaneGeometry(0.94, 0.94).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false }),
    area,
  );
  rangeMesh.frustumCulled = false;
  rangeMesh.count = 0;
  scene.add(rangeMesh);

  const linkGeometry = new BufferGeometry();
  const linkPositions = new Float32Array(MAX_LINKS * 6);
  const linkColors = new Float32Array(MAX_LINKS * 6);
  linkGeometry.setAttribute("position", new BufferAttribute(linkPositions, 3));
  linkGeometry.setAttribute("color", new BufferAttribute(linkColors, 3));
  linkGeometry.setDrawRange(0, 0);
  const linkLines = new LineSegments(linkGeometry, new LineBasicMaterial({ vertexColors: true }));
  linkLines.frustumCulled = false;
  scene.add(linkLines);

  const ghost = new Mesh(
    new BoxGeometry(0.84, 1, 0.84),
    new MeshBasicMaterial({ color: COLORS.good, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  ghost.visible = false;
  scene.add(ghost);
  const selectRing = new Mesh(
    new PlaneGeometry(1.12, 1.12).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: "#fbbf24", transparent: true, opacity: 0.75, depthWrite: false }),
  );
  selectRing.position.y = 0.01;
  selectRing.visible = false;
  scene.add(selectRing);
  const hover = new Mesh(
    new PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: "#fbbf24", transparent: true, opacity: 0.5, depthWrite: false }),
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
  const player = { x: start[0] + 0.5, z: start[1] + 0.5, facing: 0, path: [], arrive: null, walk: 0 };
  robot.group.position.set(player.x, 0, player.z);

  let world = {
    land: { x: 0, y: 0, w: width, h: height },
    nextLand: null,
    items: Array(area).fill(null),
    overlay: "none",
    tileHeat: null,
    links: [],
    ghost: null,
    selected: null,
  };
  let blocked = new Set();
  let worldDirty = true;
  const rackColors = Array.from({ length: area }, () => new Color());
  const brokenTiles = new Set();

  const inRect = (rect, x, y) => Boolean(rect) && x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;

  const rebuildBlocked = () => {
    blocked = new Set([terminalTile]);
    for (let i = 0; i < area; i += 1) {
      const x = i % width;
      const y = (i - x) / width;
      if (world.items[i] || !inRect(world.land, x, y)) blocked.add(i);
    }
  };

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

  const unstick = () => {
    const px = Math.floor(player.x);
    const pz = Math.floor(player.z);
    if (!blocked.has(pz * width + px)) return;
    for (let radius = 1; radius < Math.max(width, height); radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const x = px + dx;
          const y = pz + dy;
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius || x < 0 || y < 0 || x >= width || y >= height || blocked.has(y * width + x)) continue;
          player.x = x + 0.5;
          player.z = y + 0.5;
          player.path = [];
          player.arrive = null;
          goal.visible = false;
          return;
        }
      }
    }
  };

  const applyFloor = () => {
    for (let i = 0; i < area; i += 1) {
      const x = i % width;
      const y = (i - x) / width;
      const inside = inRect(world.land, x, y);
      tiles.setMatrixAt(
        i,
        inside ? matrix.makeTranslation(x + 0.5, -0.06, y + 0.5) : matrix.makeScale(1, 0.4, 1).setPosition(x + 0.5, -0.28, y + 0.5),
      );
      if (!inside) {
        tiles.setColorAt(i, tint.set(inRect(world.nextLand, x, y) ? COLORS.outsideNext : COLORS.outside));
      } else {
        tint.set((x + y) % 2 ? COLORS.tileA : COLORS.tileB);
        const t = world.overlay === "heat" && world.tileHeat ? Math.min(1, Math.max(0, world.tileHeat[i])) : 0;
        if (t > 0) tint.lerp(tintB.set(t < 0.5 ? COLORS.warm : COLORS.hot), t < 0.5 ? t * 1.6 : 0.8 + (t - 0.5) * 0.4);
        tiles.setColorAt(i, tint);
      }
    }
    tiles.instanceMatrix.needsUpdate = true;
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  };

  const applyItems = () => {
    const { land, items } = world;
    brokenTiles.clear();
    for (let i = 0; i < area; i += 1) {
      const item = items[i];
      const x = i % width;
      const y = (i - x) / width;
      const cx = x + 0.5;
      const cz = y + 0.5;
      const place = (mesh, kind, heightTable) => {
        const h = item && item.kind === kind ? heightTable[item.level] : 0;
        mesh.setMatrixAt(i, h ? matrix.makeScale(1, h, 1).setPosition(cx, h / 2, cz) : matrix.makeScale(0, 0, 0));
      };
      place(serverMesh, "server", SERVER_HEIGHT);
      place(coolerMesh, "cooler", COOLER_HEIGHT);
      place(hubMesh, "hub", HUB_HEIGHT);
      place(genMesh, "gen", GEN_HEIGHT);
      if (item && item.kind === "server") {
        rackColors[i].set(item.broken ? COLORS.broken : SERVER_COLOR[item.level]).lerp(tint.set(COLORS.hot), item.broken ? 0 : item.heat * 0.6);
        serverMesh.setColorAt(i, rackColors[i]);
        if (item.broken) brokenTiles.add(i);
      } else if (item && item.kind === "cooler") {
        coolerMesh.setColorAt(i, tint.set(COOLER_COLOR[item.level]));
      } else if (item && item.kind === "hub") {
        hubMesh.setColorAt(i, tint.set(HUB_COLOR[item.level]));
      } else if (item && item.kind === "gen") {
        genMesh.setColorAt(i, tint.set(GEN_COLOR[item.level]));
      }
      const front = y + 0.5 < land.y + land.h / 2 ? 1 : -1;
      for (let row = 0; row < 4; row += 1) {
        const lit = item && item.kind === "server" && !item.broken && row < item.level;
        ledMesh.setMatrixAt(i * 4 + row, lit ? matrix.makeTranslation(cx, 0.25 + row * 0.28, cz + front * 0.39) : matrix.makeScale(0, 0, 0));
      }
    }
    for (const mesh of [...itemMeshes, ledMesh]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  };

  const applyLinks = () => {
    let segments = 0;
    if (world.overlay === "net") {
      for (const link of world.links) {
        if (segments >= MAX_LINKS) break;
        const hx = link.hub % width;
        const sx = link.server % width;
        tint.set(COLORS.bad).lerp(tintB.set(COLORS.good), Math.min(1, Math.max(0, link.eff)));
        const o = segments * 6;
        linkPositions.set([hx + 0.5, 0.3, (link.hub - hx) / width + 0.5, sx + 0.5, 0.3, (link.server - sx) / width + 0.5], o);
        linkColors.set([tint.r, tint.g, tint.b, tint.r, tint.g, tint.b], o);
        segments += 1;
      }
      linkGeometry.attributes.position.needsUpdate = true;
      linkGeometry.attributes.color.needsUpdate = true;
    }
    linkGeometry.setDrawRange(0, segments * 2);
    linkLines.visible = segments > 0;
  };

  const applyGhost = () => {
    const g = world.ghost;
    ghost.visible = Boolean(g);
    rangeMesh.count = 0;
    if (g) {
      const gx = g.tile % width;
      const gy = (g.tile - gx) / width;
      const h = GHOST_HEIGHT[g.kind] ?? 0.8;
      ghost.scale.set(1, h, 1);
      ghost.position.set(gx + 0.5, h / 2, gy + 0.5);
      ghost.material.color.set(g.valid ? GHOST_COLOR[g.kind] : COLORS.bad);
      const reach = g.falloff ? g.falloff.length : 0;
      let n = 0;
      for (let dy = -reach; dy <= reach; dy += 1) {
        for (let dx = -reach; dx <= reach; dx += 1) {
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          if (d === 0 || !inRect(world.land, gx + dx, gy + dy)) continue;
          rangeMesh.setMatrixAt(n, matrix.makeTranslation(gx + dx + 0.5, 0.015, gy + dy + 0.5));
          rangeMesh.setColorAt(n, tint.set("#e0e7ff").lerp(tintB.set(GHOST_COLOR[g.kind]), Math.min(1, Math.max(0.15, g.falloff[d - 1]))));
          n += 1;
        }
      }
      rangeMesh.count = n;
      rangeMesh.instanceMatrix.needsUpdate = true;
      if (rangeMesh.instanceColor) rangeMesh.instanceColor.needsUpdate = true;
    }
    selectRing.visible = world.selected !== null;
    if (world.selected !== null) {
      const sx = world.selected % width;
      selectRing.position.set(sx + 0.5, 0.01, (world.selected - sx) / width + 0.5);
    }
  };

  const applyWorld = () => {
    worldDirty = false;
    const { land } = world;
    rebuildBlocked();
    unstick();
    applyFloor();
    slab.scale.set(land.w + 0.7, 1, land.h + 0.7);
    slab.position.set(land.x + land.w / 2, -0.37, land.y + land.h / 2);
    view.targetX = land.x + land.w / 2;
    view.targetZ = land.y + land.h / 2;
    view.targetSize = Math.max(MIN_VIEW, (land.w + land.h) * VIEW_PER_TILE);
    applyItems();
    applyLinks();
    applyGhost();
  };

  const keys = new Set();
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const floor = new Plane(new Vector3(0, 1, 0), 0);
  const hit = new Vector3();
  const pointer = { x: 0, y: 0, dirty: false, dragging: false, lastTile: -1, hoverTile: -1 };
  let lastTick = 0;
  let lastRender = 0;
  let lastBlink = -1;
  let raf = 0;
  let disposed = false;

  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.left = (-view.size * aspect) / 2;
    camera.right = (view.size * aspect) / 2;
    camera.top = view.size / 2;
    camera.bottom = -view.size / 2;
    camera.zoom = view.zoom * Math.min(1, aspect / 1.1);
    camera.updateProjectionMatrix();
  };
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  view.size = view.targetSize;
  resize();

  const placeCamera = () => {
    camera.position.set(
      view.x + Math.cos(view.angle) * CAMERA_RADIUS,
      Math.tan(CAMERA_PITCH) * CAMERA_RADIUS,
      view.z + Math.sin(view.angle) * CAMERA_RADIUS,
    );
    camera.lookAt(view.x, 0, view.z);
  };
  placeCamera();

  const slide = (dx, dz) => {
    if (!collides(player.x + dx, player.z)) player.x += dx;
    if (!collides(player.x, player.z + dz)) player.z += dz;
  };

  const inputVector = () => {
    const fx = -Math.cos(view.angle);
    const fz = -Math.sin(view.angle);
    let vx = 0;
    let vz = 0;
    if (keys.has("forward")) {
      vx += fx;
      vz += fz;
    }
    if (keys.has("back")) {
      vx -= fx;
      vz -= fz;
    }
    if (keys.has("right")) {
      vx -= fz;
      vz += fx;
    }
    if (keys.has("left")) {
      vx += fz;
      vz -= fx;
    }
    const length = Math.hypot(vx, vz);
    return length > 0 ? [vx / length, vz / length] : [0, 0];
  };

  const nearestTarget = () => {
    let best = null;
    let bestDistance = 1.6;
    for (let tile = 0; tile < area; tile += 1) {
      if (tile !== terminalTile && !world.items[tile]) continue;
      const x = tile % width;
      const distance = Math.hypot(x + 0.5 - player.x, (tile - x) / width + 0.5 - player.z);
      if (distance < bestDistance) {
        best = tile;
        bestDistance = distance;
      }
    }
    return best;
  };

  const stopPath = () => {
    player.path = [];
    player.arrive = null;
    goal.visible = false;
  };

  const here = () => [Math.floor(player.x), Math.floor(player.z)];

  const startPath = (path, arrive) => {
    if (path === null) return false;
    stopPath();
    player.arrive = arrive;
    player.path = path.length ? [here(), ...path] : path;
    const last = path[path.length - 1];
    goal.visible = Boolean(last);
    if (last) goal.position.set(last[0] + 0.5, 0.03, last[1] + 0.5);
    if (path.length === 0) arrive?.();
    return true;
  };

  const pick = () => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((pointer.x - rect.left) / rect.width) * 2 - 1, -((pointer.y - rect.top) / rect.height) * 2 + 1);
    if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return null;
    raycaster.setFromCamera(ndc, camera);
    const hits = [];
    for (const mesh of itemMeshes) {
      const found = raycaster.intersectObject(mesh)[0];
      if (found) hits.push([found.distance, found.instanceId]);
    }
    const screen = raycaster.intersectObject(terminalMesh, true)[0];
    if (screen) hits.push([screen.distance, terminalTile]);
    if (hits.length) return hits.sort((a, b) => a[0] - b[0])[0][1];
    if (!raycaster.ray.intersectPlane(floor, hit)) return null;
    const x = Math.floor(hit.x);
    const y = Math.floor(hit.z);
    return x < 0 || y < 0 || x >= width || y >= height ? null : y * width + x;
  };

  const onPointerMove = (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.dirty = true;
  };
  const onPointerLeave = () => {
    hover.visible = false;
    pointer.dirty = false;
    if (pointer.hoverTile !== -1) onHover(null);
    pointer.hoverTile = -1;
  };
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const tile = pick();
    if (tile === null) return;
    pointer.dragging = true;
    pointer.lastTile = tile;
    canvas.setPointerCapture?.(event.pointerId);
    onTile({ tile, drag: false });
  };
  const onPointerUp = () => {
    pointer.dragging = false;
  };
  const onContextMenu = (event) => {
    event.preventDefault();
    onCancel();
  };
  const onWheel = (event) => {
    event.preventDefault();
    view.zoom = MathUtils.clamp(view.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1), 0.6, 2);
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
      if (near === null) return;
      event.preventDefault();
      if (!event.repeat) onInteract(near);
    }
  };
  const onKeyUp = (event) => {
    if (MOVE_KEYS[event.code]) keys.delete(MOVE_KEYS[event.code]);
  };
  const onBlur = () => keys.clear();
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  const blink = (now) => {
    const tick = Math.floor(now / BLINK_MS);
    if (tick === lastBlink) return;
    lastBlink = tick;
    for (let i = 0; i < area * 4; i += 1) {
      const item = world.items[Math.floor(i / 4)];
      if (!item || item.kind !== "server") continue;
      const roll = (Math.imul(i + 1, 2654435761) + Math.imul(tick, 40503)) >>> 0;
      ledMesh.setColorAt(i, tint.set(LED_COLORS[roll % LED_COLORS.length]));
    }
    if (ledMesh.instanceColor) ledMesh.instanceColor.needsUpdate = true;
    if (brokenTiles.size && serverMesh.instanceColor) {
      for (const tile of brokenTiles) serverMesh.setColorAt(tile, tint.set(tick % 2 ? COLORS.hot : COLORS.broken));
      serverMesh.instanceColor.needsUpdate = true;
    }
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
          const arrived = player.arrive;
          stopPath();
          arrived?.();
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
    player.walk = moving
      ? player.walk + dt * 11
      : MathUtils.lerp(player.walk, Math.round(player.walk / Math.PI) * Math.PI, 1 - Math.exp(-dt * 12));
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
    const zooming = Math.abs(view.targetSize - view.size) > 0.01 || Math.abs(view.targetX - view.x) > 0.01 || Math.abs(view.targetZ - view.z) > 0.01;
    if (zooming) {
      const k = 1 - Math.exp(-dt * 5);
      view.size += (view.targetSize - view.size) * k;
      view.x += (view.targetX - view.x) * k;
      view.z += (view.targetZ - view.z) * k;
      resize();
    }
    if (rotating || zooming) placeCamera();

    if (pointer.dirty) {
      pointer.dirty = false;
      const tile = pick();
      hover.visible = tile !== null;
      if (tile !== null) hover.position.set((tile % width) + 0.5, 0.02, Math.floor(tile / width) + 0.5);
      if ((tile ?? -1) !== pointer.hoverTile) {
        pointer.hoverTile = tile ?? -1;
        onHover(tile);
      }
      if (pointer.dragging && tile !== null && tile !== pointer.lastTile) {
        pointer.lastTile = tile;
        onTile({ tile, drag: true });
      }
    }
    blink(now);
  };

  const loop = (now) => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    if (!lastTick) lastTick = now;
    if (document.hidden) {
      lastTick = now;
      return;
    }
    const busy =
      keys.size > 0 ||
      player.path.length > 0 ||
      Math.abs(Math.PI / 4 + view.index * (Math.PI / 2) - view.angle) > 0.001 ||
      Math.abs(view.targetSize - view.size) > 0.01 ||
      Math.abs(view.targetX - view.x) > 0.01 ||
      Math.abs(view.targetZ - view.z) > 0.01;
    if (!busy && !pointer.dirty && !worldDirty && now - lastRender < IDLE_FRAME_MS) return;
    const dt = Math.min(Math.max((now - lastTick) / 1000, 0), 0.05);
    lastTick = now;
    if (worldDirty) applyWorld();
    update(dt, now);
    renderer.render(scene, camera);
    lastRender = now;
  };
  raf = requestAnimationFrame(loop);

  return {
    setWorld(next) {
      world = next;
      worldDirty = true;
    },
    walkTo(tile) {
      const x = tile % width;
      return startPath(findPath(blocked, width, height, here(), [x, (tile - x) / width]), null);
    },
    walkBeside(tile, onArrive) {
      const x = tile % width;
      return startPath(findPathBeside(blocked, width, height, here(), [x, (tile - x) / width]), () => onArrive(tile));
    },
    robotTile() {
      return here();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
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