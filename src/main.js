// Entry point: activate only the visible face, and re-activate when the
// viewport crosses the 820px breakpoint.
import { DESKTOP_Q } from './shared/env.js';
import { initDesktop } from './desktop/desktop.js';
import { initPhone } from './phone/phone.js';
import { initSpotlight } from './shared/spotlight.js';
import { initBoot } from './shared/boot.js';
import { initVee } from './shared/vee.js';

// Boot log runs first — it's the splash that crossfades to the live face.
initBoot();

function activate() {
  if (DESKTOP_Q.matches) initDesktop();
  else initPhone();
}
activate();

// Spotlight + V are global overlays — work on either face, so init once after
// the visible face is up. (Idempotent; the breakpoint re-activate won't redo them.)
initSpotlight();
initVee();

if (DESKTOP_Q.addEventListener) DESKTOP_Q.addEventListener('change', activate);
else if (DESKTOP_Q.addListener) DESKTOP_Q.addListener(activate);
