import * as THREE from 'https://esm.sh/three@0.165.0';
import { RoundedBoxGeometry } from 'https://esm.sh/three@0.165.0/examples/jsm/geometries/RoundedBoxGeometry';
import { scene, cubeRoot, camera, cameraState } from './scene.js';

export const STEP       = 1.35;
export const CSIZE      = 0.82;
export const influenceR = 2.5 * STEP;

const geo = new RoundedBoxGeometry(CSIZE, CSIZE, CSIZE, 3, 0.17);

let cubelets = [], MOVES = [], activeMats = [], baseScales = [], phaseOffsets = [];
let GRID = 0;

export function getActiveMats()  { return activeMats; }
export function getGrid()        { return GRID; }

// ── Face-turn state ───────────────────────────────────────────
export const TURN_GAP  = 1.8;
export const turnState = { anim: null, waitTimer: TURN_GAP };

// ── Proximity helpers ─────────────────────────────────────────
export const raycaster   = new THREE.Raycaster();
export const hitPoint    = new THREE.Vector3();
export const tmpVec      = new THREE.Vector3();
export const sphereBound = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
let proximityMults = new Float32Array(0);

export function resetProximityMults() { proximityMults.fill(1); }

export function getN() {
  const w = innerWidth;
  if (w >= 900) return 5;
  if (w >= 600) return 4;
  if (w >= 380) return 3;
  return 2;
}

export function makeGradientMats(N, bottomHex, topHex) {
  const b = new THREE.Color(bottomHex);
  const t = new THREE.Color(topHex);
  return Array.from({ length: N }, (_, i) => {
    const pct = N === 1 ? 0.5 : i / (N - 1);
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color().lerpColors(b, t, pct),
      metalness: 0.04, roughness: 0.22, envMapIntensity: 1.0,
    });
  });
}

function snapPos(pos) {
  const half = (GRID - 1) / 2;
  const idx  = Math.round(pos / STEP + half);
  return (Math.max(0, Math.min(GRID - 1, idx)) - half) * STEP;
}

export function buildCube(N, bottomHex, topHex) {
  const { anim } = turnState;
  if (anim) {
    anim.pivot.rotation[anim.axis] = anim.target;
    anim.pivot.updateMatrixWorld(true);
    anim.face.forEach(c => cubeRoot.attach(c));
    scene.remove(anim.pivot);
    turnState.anim = null;
  }
  cubeRoot.clear();
  cubelets = [];
  activeMats.forEach(m => m.dispose());
  activeMats = makeGradientMats(N, bottomHex, topHex);
  GRID = N;
  const half = (N - 1) / 2;
  for (let xi = 0; xi < N; xi++)
    for (let yi = 0; yi < N; yi++)
      for (let zi = 0; zi < N; zi++) {
        const mesh = new THREE.Mesh(geo, activeMats[yi]);
        mesh._idx = cubelets.length;
        mesh.position.set((xi - half) * STEP, (yi - half) * STEP, (zi - half) * STEP);
        cubeRoot.add(mesh);
        cubelets.push(mesh);
      }
  baseScales   = cubelets.map(() => 1.0);
  phaseOffsets = cubelets.map(() => (Math.random() - 0.5) * 1.4);
  cubelets.forEach(c => c.scale.setScalar(baseScales[c._idx]));
  const layers = Array.from({ length: N }, (_, i) => (i - half) * STEP);
  MOVES = [];
  ['x', 'y', 'z'].forEach(axis => layers.forEach(layer =>
    [Math.PI / 2, -Math.PI / 2].forEach(angle => MOVES.push({ axis, layer, angle }))
  ));
  cameraState.r      = Math.max(4, N * STEP * 3.4);
  sphereBound.radius = GRID * STEP * 0.85;
  proximityMults     = new Float32Array(cubelets.length).fill(1);
  turnState.waitTimer = TURN_GAP;
}

// ── Face-turn animation ───────────────────────────────────────
const TURN_DUR = 0.72;
function easeInOut(t) { return (1 - Math.cos(Math.PI * t)) / 2; }

export function startTurn() {
  if (GRID < 2) return;
  const m = MOVES[Math.floor(Math.random() * MOVES.length)];
  const pivot = new THREE.Object3D();
  pivot.position.copy(cubeRoot.position);
  scene.add(pivot);
  const face = cubelets.filter(c => Math.abs(c.position[m.axis] - m.layer) < STEP * 0.45);
  if (!face.length) return;
  face.forEach(c => pivot.attach(c));
  turnState.anim = { pivot, face, axis: m.axis, target: m.angle, elapsed: 0, applied: 0 };
}

export function tickTurn(dt) {
  const anim = turnState.anim;
  if (!anim) return;
  anim.pivot.position.copy(cubeRoot.position);
  anim.elapsed += dt;
  const t  = Math.min(anim.elapsed / TURN_DUR, 1);
  const ea = easeInOut(t) * anim.target;
  anim.pivot.rotation[anim.axis] += ea - anim.applied;
  anim.applied = ea;
  if (t >= 1) {
    anim.pivot.rotation[anim.axis] = anim.target;
    anim.pivot.updateMatrixWorld(true);
    anim.face.forEach(c => {
      cubeRoot.attach(c);
      c.position.x = snapPos(c.position.x);
      c.position.y = snapPos(c.position.y);
      c.position.z = snapPos(c.position.z);
      baseScales[c._idx] = 1.0;
    });
    scene.remove(anim.pivot);
    turnState.anim = null;
    turnState.waitTimer = TURN_GAP;
  }
}

// ── Breathe + proximity animation (called each frame) ─────────
export function tickAnimation(breatheT, hasHover, mouseNDC) {
  if (hasHover) {
    sphereBound.center.copy(cubeRoot.position);
    raycaster.setFromCamera(mouseNDC, camera);
    const hit = raycaster.ray.intersectSphere(sphereBound, hitPoint);
    if (hit) {
      cubelets.forEach(c => {
        const d = c.getWorldPosition(tmpVec).distanceTo(hitPoint);
        proximityMults[c._idx] = d < influenceR
          ? 1 + 0.35 * Math.pow(1 - d / influenceR, 2)
          : 1;
      });
    } else {
      proximityMults.fill(1);
    }
  }
  const TWO_PI   = Math.PI * 2;
  const GROW_END = TWO_PI * 0.78;
  const SHRK_LEN = TWO_PI * 0.22;
  cubelets.forEach(c => {
    const s = baseScales[c._idx];
    c.getWorldPosition(tmpVec);
    const phase = breatheT
      - tmpVec.y * 1.16
      - tmpVec.x * 0.08
      - tmpVec.z * 0.05
      + phaseOffsets[c._idx];
    const np = ((phase % TWO_PI) + TWO_PI) % TWO_PI;
    let wave, t;
    if (np < GROW_END) {
      t = np / GROW_END;
      wave = t * t;
    } else {
      t = (np - GROW_END) / SHRK_LEN;
      wave = 1 - t * t * (3 - 2 * t);
    }
    c.scale.setScalar(s * wave * proximityMults[c._idx]);
  });
}
