// Single source of truth for the project/app registry shared across faces.
// Project glyphs are Lucide line-icons (MIT) — white stroke on the per-project
// gradient swatch. Toolkitly itself ships lucide-react, so the set is authentic.

// --- Lucide-based glyphs (24x24, white stroke) + the existing link/util marks ---
export const SVG = {
  toolkitly: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  fuelflow:  '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg>',
  docbot:    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
  quickdeck: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>',
  qrdecode:  '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>',
  about:     '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6"/></svg>',
  stack:     '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m6.08 9.5-3.49 1.59a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/><path d="m6.08 14.5-3.49 1.59a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/></svg>',
  search:    '<svg viewBox="0 0 24 24" fill="#fff"><path d="M10 2a8 8 0 1 0 4.9 14.3l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/></svg>',
  github:    '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 1.5A10.5 10.5 0 0 0 8.7 22c.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.4-3.5-1.4-.5-1.2-1.1-1.5-1.1-1.5-1-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.3-.3-4.8-1.2-4.8-5.2 0-1.1.4-2.1 1-2.8-.1-.3-.4-1.3.1-2.8 0 0 .9-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.5.2 2.5.1 2.8.7.7 1 1.7 1 2.8 0 4-2.5 4.9-4.8 5.2.4.3.7 1 .7 1.9v2.8c0 .3.2.6.7.5A10.5 10.5 0 0 0 12 1.5z"/></svg>',
  linkedin:  '<svg viewBox="0 0 24 24" fill="#fff"><path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5zM3 9h4v12H3V9zm6 0h3.8v1.7h.05c.53-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2.05 1.4-2.05 2.8V21H9V9z"/></svg>',
  mail:      '<svg viewBox="0 0 24 24" fill="#fff"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7L4 7v1l8 5 8-5V7l-8 5z"/></svg>',
  resume:    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>',
  fy25:      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2"/><rect width="8" height="5" x="14" y="17" rx="1"/><path d="M20 17v-2a2 2 0 0 0-4 0v2"/></svg>'
};

// --- Projects: the catalogue. One entry feeds Finder (all views) + the phone sheet. ---
export const PROJECTS = [
  {
    key: 'toolkitly', name: 'Toolkitly', tag: 'Dev-tooling SaaS', year: '2025', status: 'live',
    icon: 'toolkitly', swatch: 'sw-tk', tile: 'ic-toolkitly',
    tags: ['Full-stack', 'Frontend'],
    stack: ['Next.js', 'TypeScript', 'Bun', 'Express', 'Redis'],
    href: 'https://toolkitly.cloud', linkLabel: 'toolkitly.cloud',
    sub: 'A toolbox of dev utilities — fast, offline-capable, no sign-up tax.',
    body: "A SaaS toolbox for developers — the dozen small utilities you keep googling, in one fast place. Next.js on the front, a Bun/Express API and Redis behind it. The polish lives in the details nobody notices until they're gone."
  },
  {
    key: 'fuelflow', name: 'FuelFlow', tag: 'Petrol-pump ops', year: '2024', status: 'live',
    icon: 'fuelflow', swatch: 'sw-ff', tile: 'ic-fuelflow',
    tags: ['Full-stack', 'Backend'],
    stack: ['React', 'TypeScript', 'Express', 'MongoDB', 'Google Vision'],
    href: 'https://fuelflow.vheda.in', linkLabel: 'fuelflow.vheda.in',
    sub: 'Petrol-pump ops — sales, stock, dip readings, OCR meter capture.',
    body: "Operations software for a petrol pump — daily sales, stock and dip reconciliation, nozzle and rate management, analytics. Meter readings are read straight off a photo with Google Vision OCR. Real money, real fuel, so the numbers can't be wrong."
  },
  {
    key: 'docbot', name: 'Doc bot', tag: 'AI assistant', year: '2026', status: 'live',
    icon: 'docbot', swatch: 'sw-db', tile: 'ic-docbot',
    tags: ['AI', 'Backend'],
    stack: ['NestJS', 'TypeScript', 'pgvector', 'Temporal', 'Gemini', 'Slack'],
    href: 'https://folio.vheda.in', linkLabel: 'folio.vheda.in',
    sub: 'AI assistant that reads the docs so you don’t have to.',
    body: "An AI assistant that actually reads the docs so you don't have to. RAG over Postgres + pgvector, answers grounded by Gemini/Bedrock, durable jobs on Temporal, and it lives where you work — Slack and an MCP server. A stubborn refusal to hallucinate."
  },
  {
    key: 'qrdecode', name: 'QR Decoder', tag: 'Inside Toolkitly', year: '2025', status: 'live',
    icon: 'qrdecode', swatch: 'sw-qr', tile: 'ic-qr',
    tags: ['Frontend', 'Tool'],
    stack: ['Next.js', 'TypeScript', 'ZXing', 'WebRTC'],
    href: 'https://toolkitly.cloud', linkLabel: 'toolkitly.cloud',
    sub: 'Decode QR + barcodes from your camera or an image — all in-browser.',
    body: "A QR and barcode decoder built into Toolkitly. Point your camera or drop in an image and it reads the code on-device with ZXing — no upload, no server round-trip. Just one tool in the kit, called out on its own because people keep asking for it."
  },
  {
    key: 'quickdeck', name: 'QuickDeck', tag: 'macOS menu-bar app', year: '2026', status: 'review',
    icon: 'quickdeck', swatch: 'sw-qd', tile: 'ic-qd',
    tags: ['macOS', 'Tool'],
    stack: ['Swift 6', 'SwiftUI', 'Liquid Glass'],
    // PLACEHOLDER build file — swap in the R2 url once the .dmg is built + uploaded:
    // download: 'https://pub-REPLACE.r2.dev/quickdeck/QuickDeck-1.0.0.dmg',
    linkLabel: 'landing soon',
    sub: 'A menu-bar deck of one-click actions — config-driven, hot-reloaded.',
    body: "A macOS menu-bar utility: click the icon and a glass deck of one-click actions drops down — shell commands, app launches, a dark-mode toggle, a keyboard-wipe lock, a keystroke HUD. JSON config, hot-reloaded. macOS 26.5, Apple Silicon. Unsigned for now — the first open is a right-click → Open. Landing soon."
  },
  {
    key: 'fy25', name: 'FY25', tag: 'Year in review', year: '2025–26', status: 'locked', locked: true,
    icon: 'fy25', swatch: 'sw-fy25', tile: 'ic-fy25',
    tags: [], stack: [],
    linkLabel: 'unlock',
    sub: 'A password-protected year of client work.',
    body: 'One fiscal year of platform work, locked behind a password. If you have it, the review is yours.'
  }
];

const STATUS_META = {
  live: '<span class="pill"><span class="live-d"></span>Live</span>',
  review: '<span class="pill"><span class="wip-d"></span>In review</span>',
  locked: '<span class="pill"><span class="lock-d"></span>Locked</span>'
};

// Build the phone-sheet app map from PROJECTS, then add the non-project entries.
const projectApps = {};
for (const p of PROJECTS) {
  projectApps[p.key] = {
    icon: p.tile, svg: SVG[p.icon], title: p.name,
    meta: [STATUS_META[p.status], '<span class="pill">' + p.year + '</span>', '<span class="pill">' + p.tag + '</span>'],
    body: p.body,
    stack: p.stack,
    open: p.href || p.download
  };
}

export const APPS = Object.assign({}, projectApps, {
  about: {
    icon: 'ic-about', svg: SVG.about, title: 'About',
    meta: ['<span class="pill">Full-stack + AI</span>', '<span class="pill">India · GMT+5:30</span>'],
    body: "Vaibhav Heda. Full-stack and AI engineer based in India. I build backends that hold up under load and interfaces people don't fight with. Dry humour, low ego, chronically shipping.",
    links: [
      { l: 'GitHub', v: '@vaibhavheda', href: 'https://github.com/vaibhavheda', key: 'github' },
      { l: 'LinkedIn', v: 'vaibhav-heda', href: 'https://www.linkedin.com/in/vaibhav-heda/', key: 'linkedin' },
      { l: 'Email', v: 'vaibhav.heda799', href: 'mailto:vaibhav.heda799@gmail.com', key: 'mail' },
      { l: 'Résumé', v: 'PDF · download', href: '/Vaibhav-Heda-Resume.pdf', key: 'resume' }
    ],
    foot: "Most of the work isn't the launch. The catalogue only shows the survivors."
  },
  stack: {
    icon: 'ic-stack', svg: SVG.stack, title: 'Selected Work',
    meta: ['<span class="pill">' + PROJECTS.filter(p => !p.locked).length + ' apps</span>', '<span class="pill">' + PROJECTS.filter(p => p.status === 'live').length + ' live</span>'],
    body: 'The grid, sorted. All live and in use.',
    links: PROJECTS.map(p => ({ l: p.name, v: p.year + ' · ' + (p.status === 'live' ? 'Live' : p.locked ? 'Locked' : 'In review'), app: p.key, key: p.key }))
  },
  search: {
    icon: 'ic-stack', svg: SVG.search, title: 'Search',
    meta: ['<span class="pill">Spotlight</span>'],
    body: 'Looking for the work? Tap a result.',
    links: [
      { l: 'Selected Work', v: PROJECTS.filter(p => !p.locked).length + ' apps', app: 'stack', key: 'stack' },
      { l: 'About Vaibhav', v: 'profile', app: 'about', key: 'about' }
    ].concat(PROJECTS.map(p => ({ l: p.name, v: p.status === 'live' ? 'Live' : p.locked ? 'Locked' : 'In review', app: p.key, key: p.key })))
  }
});

export const ICOCLASS = {
  github: 'ic-github', linkedin: 'ic-linkedin', mail: 'ic-mail',
  toolkitly: 'ic-toolkitly', fuelflow: 'ic-fuelflow', docbot: 'ic-docbot',
  about: 'ic-about', stack: 'ic-stack', resume: 'ic-resume', fy25: 'ic-fy25'
};
