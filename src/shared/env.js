// Shared media-query state. DESKTOP_Q decides which face is live; REDUCE gates motion.
export const DESKTOP_Q = window.matchMedia('(min-width: 820px)');
export const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');
