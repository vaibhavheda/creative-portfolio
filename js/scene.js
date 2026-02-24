import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('c');

export const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, alpha: true,
  powerPreference: 'high-performance',
});
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping         = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace    = THREE.SRGBColorSpace;
renderer.setSize(innerWidth, innerHeight);

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x130d0a, 0.028);

export const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 100);

export const cubeRoot = new THREE.Object3D();
scene.add(cubeRoot);

// Mutable camera radius — written by cube.js (buildCube) and interactions.js (pinch)
export const cameraState = { r: 12 };

export function positionCamera(theta, phi) {
  const r = cameraState.r;
  camera.position.set(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0, 0);
}

// ── Post-processing ───────────────────────────────────────────
const dpr = renderer.getPixelRatio();
const composerTarget = new THREE.WebGLRenderTarget(
  innerWidth * dpr, innerHeight * dpr,
  { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat, colorSpace: THREE.SRGBColorSpace }
);
export const composer = new EffectComposer(renderer, composerTarget);
composer.addPass(new RenderPass(scene, camera));
export const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth * dpr, innerHeight * dpr),
  0.45, 0.5, 0.82
);
composer.addPass(bloomPass);

// ── Environment map (internal) ────────────────────────────────
(function buildEnv() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene  = new THREE.Scene();
  const envSphere = new THREE.Mesh(
    new THREE.SphereGeometry(10, 16, 16),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })
  );
  const posAttr = envSphere.geometry.attributes.position;
  const colArr  = new Float32Array(posAttr.count * 3);
  const SX = 0.58, SY = 0.72, SZ = 0.38;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i) / 10, py = posAttr.getY(i) / 10, pz = posAttr.getZ(i) / 10;
    const t  = (py + 1) / 2;
    let r = 0.14 + t * 0.36, g = 0.10 + t * 0.20, b = 0.10 + t * 0.16;
    const sun = Math.pow(Math.max(0, px * SX + py * SY + pz * SZ), 3);
    r += sun * 0.9; g += sun * 0.55; b += sun * 0.2;
    colArr[i*3] = Math.min(1,r); colArr[i*3+1] = Math.min(1,g); colArr[i*3+2] = Math.min(1,b);
  }
  envSphere.geometry.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  envScene.add(envSphere);
  const envMap = pmrem.fromScene(envScene).texture;
  envSphere.geometry.dispose();
  envSphere.material.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 1.0;
  pmrem.dispose();
})();

// ── Lights ────────────────────────────────────────────────────
export const keyL  = new THREE.DirectionalLight(0xffdcc8, 1.6); keyL.position.set(-4,-9,5); scene.add(keyL);
export const sideL = new THREE.DirectionalLight(0xc8d8ff, 1.4); sideL.position.set(9,1,4);  scene.add(sideL);
export const fillL = new THREE.PointLight(0xff5040, 40, 24);    fillL.position.set(0,6,2);  scene.add(fillL);
export const ambL  = new THREE.AmbientLight(0xffecd8, 0.4);     scene.add(ambL);
