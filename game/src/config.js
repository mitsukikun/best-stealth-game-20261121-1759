// Every tuning number and colour for Nightshade Garden in one place. The playfield is a fixed
// 1280x720 logical area of 40 px tiles (32 by 18); the renderer scales it to the window, so no
// rule below depends on the screen size.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const FIELD = { width: COLS * TILE, height: ROWS * TILE };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** How many moonpetals a level holds, and how many pebbles the player carries per level. */
export const PETALS_PER_LEVEL = 3;
export const PEBBLES_PER_LEVEL = 3;
export const LIVES = 3;

export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 88,
  /** Noise radius while walking; sneaking is silent. */
  noiseRadius: 64,
  /** A guard this close spots a hidden player even inside a hedge. */
  hedgeSpotRange: 46,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 148,
  investigateSpeed: 105,
  /** How far a guard can see, in pixels, and half the cone's angle. */
  sightRange: 205,
  halfAngle: 0.56,
  /** Seconds of full sight to raise suspicion from 0 to 1 at point blank; farther is slower. */
  spotTime: 0.85,
  /** Suspicion lost per second while the player is unseen. */
  calmRate: 0.45,
  /** Seconds a guard waits at each patrol waypoint, looking around. */
  pauseTime: 1.4,
  /** Seconds a guard stares at a spot it investigated before giving up. */
  searchTime: 2.2,
  /** Touching the player at this range catches them. */
  catchRange: 24,
  /** A noise source is heard out to this radius. */
  hearRange: 190,
};

/** A pebble's landing noise reaches this far; a thrown pebble flies at most this far. */
export const PEBBLE = { range: 300, noiseRadius: 170, speed: 620 };

export const SCORE = {
  petal: 100,
  levelClear: 250,
  ghostBonus: 150,
  /** Time bonus per second left under the par time. */
  timePerSecond: 5,
};

/** Par time per level, in seconds, for the time bonus. */
export const PAR_TIME = 90;

export const PALETTE = {
  backdrop: '#0a0e1a',
  floorA: '#232a3d',
  floorB: '#202636',
  floorEdge: '#2c3550',
  wall: '#3a4360',
  wallTop: '#4a5578',
  hedge: '#1e4d2e',
  hedgeLight: '#2a6b3f',
  hedgeDark: '#143521',
  crate: '#6b5433',
  crateTop: '#8a6f45',
  petal: '#c9a7ff',
  petalGlow: '#e8d5ff',
  exit: '#7fe0a8',
  exitGlow: '#b8f5cf',
  player: '#ffd166',
  playerSneak: '#e8b64c',
  guard: '#ff6b6b',
  guardSuit: '#5b2a3a',
  coneCalm: 'rgba(255, 214, 90, 0.16)',
  coneWary: 'rgba(255, 160, 60, 0.28)',
  coneAlarm: 'rgba(255, 70, 70, 0.34)',
  noise: 'rgba(255, 255, 255, 0.35)',
  panel: '#141a2c',
  panelEdge: '#2c3550',
  text: '#eef1f5',
  muted: '#9aa3b8',
  gold: '#f2c94c',
  moon: '#f4f1de',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'nightshade-garden.best';
