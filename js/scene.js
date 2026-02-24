import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export let renderer, scene, camera, cubeRoot, cameraState, composer, bloomPass;
export let keyL, sideL, fillL, ambL;

export function positionCamera(theta, phi) {
  const r = cameraState.r;
  camera.position.set(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0, 0);
}

export function initScene(canvas, width, height, dpr) {
  renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(dpr, 2));
  renderer.toneMapping         = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace    = THREE.SRGBColorSpace;
  renderer.setSize(width, height, false);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x130d0a, 0.028);

  camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);

  cubeRoot = new THREE.Object3D();
  scene.add(cubeRoot);

  cameraState = { r: 12 };

  // Post-processing
  const pDpr = renderer.getPixelRatio();
  const composerTarget = new THREE.WebGLRenderTarget(
    width * pDpr, height * pDpr,
    { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, colorSpace: THREE.SRGBColorSpace }
  );
  composer = new EffectComposer(renderer, composerTarget);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width * pDpr, height * pDpr),
    0.45, 0.5, 0.82
  );
  composer.addPass(bloomPass);

  // Environment map
  const pmrem = new THREE.PMREMGenerator(renderer);
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

  // Lights
  keyL  = new THREE.DirectionalLight(0xffdcc8, 1.6); keyL.position.set(-4,-9,5);  scene.add(keyL);
  sideL = new THREE.DirectionalLight(0xc8d8ff, 1.4); sideL.position.set(9,1,4);   scene.add(sideL);
  fillL = new THREE.PointLight(0xff5040, 40, 24);    fillL.position.set(0,6,2);   scene.add(fillL);
  ambL  = new THREE.AmbientLight(0xffecd8, 0.4);     scene.add(ambL);
}
