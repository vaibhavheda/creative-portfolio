// js/state.js
export const orbit    = { theta: 0.72, phi: 1.12, dragging: false, lastDrag: 0 };
export const mouseNDC = { x: 999, y: 999 };
export let   hasHover = false;
export function setHasHover(v) { hasHover = v; }
