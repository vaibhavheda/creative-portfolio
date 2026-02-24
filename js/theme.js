import * as THREE from 'three';
import { scene, keyL, sideL, fillL, ambL, bloomPass } from './scene.js';
import { getActiveMats, getGrid } from './cube.js';

export const THEMES = {
  dusk: {
    bgColor: '#130d0a',
    cubeBottom: 0xbe7858, cubeTop: 0xf2e2d8,
    keyColor: 0xffdcc8, keyI: 1.6,
    sideColor: 0xc8d8ff, sideI: 1.4,
    fillColor: 0xff5040, fillI: 40,
    ambColor: 0xffecd8,  ambI: 0.4,
  },
  tide: {
    bgColor: '#090e15',
    cubeBottom: 0x3a6888, cubeTop: 0xc8dce8,
    keyColor: 0xc8e0ff, keyI: 1.8,
    sideColor: 0xffd8c0, sideI: 1.2,
    fillColor: 0x2060c0, fillI: 48,
    ambColor: 0xd0e8f8,  ambI: 0.4,
  },
  moss: {
    bgColor: '#090d0a',
    cubeBottom: 0x4a7858, cubeTop: 0xc8e0d0,
    keyColor: 0xd0ffe0, keyI: 1.5,
    sideColor: 0xffd8c0, sideI: 1.2,
    fillColor: 0x30b060, fillI: 38,
    ambColor: 0xd0f8e0,  ambI: 0.4,
  },
  void: {
    bgColor: '#0d0d0d',
    cubeBottom: 0x383838, cubeTop: 0xd8d8d8,
    keyColor: 0xffffff, keyI: 1.5,
    sideColor: 0xdde0ff, sideI: 1.1,
    fillColor: 0x888888, fillI: 35,
    ambColor: 0xffffff,  ambI: 0.35,
  },
};

export const BLOOM_STRENGTH = { dusk: 0.45, tide: 0.55, moss: 0.40, void: 0.30 };

const isWorker = typeof document === 'undefined';

// On worker: initialized by initTheme(name). On main thread: read from localStorage.
let currentTheme = isWorker ? 'dusk' : (localStorage.getItem('vheda-theme') || 'dusk');
export function getCurrentTheme() { return currentTheme; }

const THEME_TRANS_DUR = 1.4;
let themeTransition = null;

function snapshotThreeState() {
  return {
    keyColor:  keyL.color.clone(),  keyI:  keyL.intensity,
    sideColor: sideL.color.clone(), sideI: sideL.intensity,
    fillColor: fillL.color.clone(), fillI: fillL.intensity,
    ambColor:  ambL.color.clone(),  ambI:  ambL.intensity,
    matColors: getActiveMats().map(m => m.color.clone()),
    bloom:     bloomPass.strength,
    fogColor:  scene.fog.color.clone(),
  };
}

export function buildThemeTarget(name) {
  const th   = THEMES[name];
  const b    = new THREE.Color(th.cubeBottom);
  const top  = new THREE.Color(th.cubeTop);
  const grid = getGrid();
  return {
    keyColor:  new THREE.Color(th.keyColor),  keyI:  th.keyI,
    sideColor: new THREE.Color(th.sideColor), sideI: th.sideI,
    fillColor: new THREE.Color(th.fillColor), fillI: th.fillI,
    ambColor:  new THREE.Color(th.ambColor),  ambI:  th.ambI,
    matColors: getActiveMats().map((_, i) => {
      const pct = grid <= 1 ? 0.5 : i / (grid - 1);
      return new THREE.Color().lerpColors(b, top, pct);
    }),
    bloom:    BLOOM_STRENGTH[name] ?? 0.45,
    fogColor: new THREE.Color(th.bgColor),
  };
}

function applyThreeState(s) {
  keyL.color.copy(s.keyColor);   keyL.intensity  = s.keyI;
  sideL.color.copy(s.sideColor); sideL.intensity = s.sideI;
  fillL.color.copy(s.fillColor); fillL.intensity = s.fillI;
  ambL.color.copy(s.ambColor);   ambL.intensity  = s.ambI;
  getActiveMats().forEach((mat, i) => mat.color.copy(s.matColors[i]));
  bloomPass.strength = s.bloom;
  if (s.fogColor) scene.fog.color.copy(s.fogColor);
}

export function tickThemeTransition(dt) {
  if (!themeTransition) return;
  themeTransition.t = Math.min(themeTransition.t + dt / THEME_TRANS_DUR, 1);
  const et = (t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2)(themeTransition.t);
  const { from: f, to } = themeTransition;
  keyL.color.lerpColors(f.keyColor, to.keyColor, et);
  keyL.intensity  = f.keyI  + (to.keyI  - f.keyI)  * et;
  sideL.color.lerpColors(f.sideColor, to.sideColor, et);
  sideL.intensity = f.sideI + (to.sideI - f.sideI) * et;
  fillL.color.lerpColors(f.fillColor, to.fillColor, et);
  fillL.intensity = f.fillI + (to.fillI - f.fillI) * et;
  ambL.color.lerpColors(f.ambColor, to.ambColor, et);
  ambL.intensity  = f.ambI  + (to.ambI  - f.ambI)  * et;
  getActiveMats().forEach((mat, i) => mat.color.lerpColors(f.matColors[i], to.matColors[i], et));
  bloomPass.strength = f.bloom + (to.bloom - f.bloom) * et;
  scene.fog.color.lerpColors(f.fogColor, to.fogColor, et);
  if (themeTransition.t >= 1) themeTransition = null;
}

// themeName: provided by worker (from init message); ignored on main thread (uses localStorage)
export function initTheme(themeName) {
  if (themeName) currentTheme = themeName;
  const th = THEMES[currentTheme];
  keyL.color.set(th.keyColor);   keyL.intensity  = th.keyI;
  sideL.color.set(th.sideColor); sideL.intensity = th.sideI;
  fillL.color.set(th.fillColor); fillL.intensity = th.fillI;
  ambL.color.set(th.ambColor);   ambL.intensity  = th.ambI;
  bloomPass.strength = BLOOM_STRENGTH[currentTheme] ?? 0.45;
  scene.fog.color.set(th.bgColor);
  if (!isWorker) {
    document.body.classList.remove('theme-dusk', 'theme-tide', 'theme-moss', 'theme-void');
    document.body.classList.add('theme-' + currentTheme);
    document.getElementById('theme-color-meta').setAttribute('content', th.bgColor);
    document.querySelectorAll('.theme-dot').forEach(d =>
      d.classList.toggle('active', d.dataset.theme === currentTheme)
    );
  }
}

export function setTheme(name) {
  if (name === currentTheme && !themeTransition) return;
  const from = snapshotThreeState();
  const to   = buildThemeTarget(name);
  themeTransition = { from, to, t: 0 };
  currentTheme = name;
  if (!isWorker) {
    document.body.classList.remove('theme-dusk', 'theme-tide', 'theme-moss', 'theme-void');
    document.body.classList.add('theme-' + name);
    document.getElementById('theme-color-meta').setAttribute('content', THEMES[name].bgColor);
    localStorage.setItem('vheda-theme', name);
    document.querySelectorAll('.theme-dot').forEach(d =>
      d.classList.toggle('active', d.dataset.theme === name)
    );
  }
}
