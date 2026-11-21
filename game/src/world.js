// The game's rules and state, with no drawing and no browser in it: the current level, the
// player, the wardens, the moonpetals, the gate, lives and score. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react (sounds, announcements)
// without the world knowing about screens or speakers.

import { GUARD, LIVES, PEBBLES_PER_LEVEL, PETALS_PER_LEVEL, SCORE, STEP, TILE } from './config.js';
import { LEVELS, parseLevel } from './levels.js';
import { createGuard, guardCatches, stepGuard } from './guards.js';
import { createPlayer, stepPlayer, throwPebble } from './player.js';

export const EVENT_PETAL = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL_CLEAR = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;
export const EVENT_PEBBLE = 64;
export const EVENT_STEP = 128;

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: null,
    tiles: [],
    player: null,
    guards: [],
    petals: [],
    exit: null,
    exitOpen: false,
    lives: LIVES,
    score: 0,
    petalsGot: 0,
    time: 0,
    /** True once any warden has fully spotted the player this level. */
    spotted: false,
    /** The loudest suspicion any warden holds, for the HUD eye. */
    alarm: 0,
    /** Short-lived noise rings the renderer draws. */
    rings: [],
    /** Pebbles mid-flight, drawn as small arcs. */
    pebbles: [],
    /** The level just cleared, for the level-clear panel (set before the next level loads). */
    cleared: null,
    over: false,
    won: false,
  };

  function loadLevel(index) {
    const level = LEVELS[index];
    const parsed = parseLevel(level);
    state.levelIndex = index;
    state.level = level;
    state.tiles = parsed.tiles;
    state.player = createPlayer(parsed.playerStart);
    state.player.pebbles = PEBBLES_PER_LEVEL;
    state.guards = level.patrols.map((waypoints, i) => createGuard(waypoints, i));
    state.petals = parsed.petals.map((tile) => ({ x: tile.x * TILE + TILE / 2, y: tile.y * TILE + TILE / 2, got: false }));
    state.exit = { x: parsed.exit.x * TILE + TILE / 2, y: parsed.exit.y * TILE + TILE / 2 };
    state.exitOpen = false;
    state.petalsGot = 0;
    state.time = 0;
    state.spotted = false;
    state.rings = [];
    state.pebbles = [];
  }

  function reset() {
    state.lives = LIVES;
    state.score = 0;
    state.over = false;
    state.won = false;
    loadLevel(0);
  }

  function respawn() {
    const level = LEVELS[state.levelIndex];
    const parsed = parseLevel(level);
    state.player = createPlayer(parsed.playerStart);
    state.player.pebbles = PEBBLES_PER_LEVEL;
    state.guards = level.patrols.map((waypoints, i) => createGuard(waypoints, i));
    // A catch does not erase the fact that the player was spotted this level: the ghost
    // bonus stays lost, and the alarm meter keeps its memory until the next level.
    state.rings = [];
    state.pebbles = [];
  }

  /**
   * One fixed step. `move` is {x, y} in -1..1, `sneak` is Shift held, `click` is a world
   * point the player clicked this step (or null). With `harmless` set (the title screen's
   * backdrop) the world idles: wardens patrol, but nothing is spotted, caught or scored.
   */
  function step(dt, move, sneak, click, harmless) {
    let events = 0;
    state.time += dt;
    const player = state.player;

    if (click && !harmless) {
      const pebble = throwPebble(player, click.x, click.y);
      if (pebble) {
        state.pebbles.push({ x: player.x, y: player.y, tx: pebble.x, ty: pebble.y, t: 0 });
        events |= EVENT_PEBBLE;
      }
    }

    const noise = stepPlayer(player, state.tiles, move, sneak, dt);
    const noises = [];
    if (noise && !harmless) {
      noises.push(noise);
      state.rings.push({ x: noise.x, y: noise.y, radius: noise.radius, age: 0 });
      events |= EVENT_STEP;
    }

    // Pebbles in flight land after a short arc, then clatter.
    for (let i = state.pebbles.length - 1; i >= 0; i -= 1) {
      const pebble = state.pebbles[i];
      pebble.t += dt * 2.4;
      if (pebble.t >= 1) {
        state.pebbles.splice(i, 1);
        if (!harmless) {
          noises.push({ x: pebble.tx, y: pebble.ty, radius: 170 });
          state.rings.push({ x: pebble.tx, y: pebble.ty, radius: 170, age: 0 });
        }
      }
    }

    for (let i = state.rings.length - 1; i >= 0; i -= 1) {
      state.rings[i].age += dt;
      if (state.rings[i].age > 0.9) state.rings.splice(i, 1);
    }

    const guardEvents = { spotted: false };
    for (const guard of state.guards) {
      stepGuard(guard, state.tiles, player, noises, dt, guardEvents);
    }
    state.alarm = Math.max(0, ...state.guards.map((g) => g.suspicion));
    if (guardEvents.spotted) {
      state.spotted = true;
      events |= EVENT_SPOTTED;
    }

    if (harmless) return events;

    // Moonpetals: walk over one to pocket it; the gate opens on the last one.
    for (const petal of state.petals) {
      if (petal.got) continue;
      if (Math.hypot(petal.x - player.x, petal.y - player.y) < 26) {
        petal.got = true;
        state.petalsGot += 1;
        state.score += SCORE.petal;
        events |= EVENT_PETAL;
        if (state.petalsGot >= PETALS_PER_LEVEL) state.exitOpen = true;
      }
    }

    // Caught: a warden close enough grabs the player.
    for (const guard of state.guards) {
      if (guardCatches(guard, player)) {
        state.lives -= 1;
        events |= EVENT_CAUGHT;
        if (state.lives <= 0) {
          state.over = true;
          events |= EVENT_OVER;
        } else {
          respawn();
        }
        return events;
      }
    }

    // The gate: open only once every moonpetal is pocketed.
    if (state.exitOpen && Math.hypot(state.exit.x - player.x, state.exit.y - player.y) < 30) {
      const timeBonus = Math.max(0, Math.round((state.level.par - state.time) * SCORE.timePerSecond));
      state.score += SCORE.levelClear + timeBonus;
      if (!state.spotted) state.score += SCORE.ghostBonus;
      state.cleared = { name: state.level.name, score: state.score, spotted: state.spotted };
      if (state.levelIndex + 1 >= LEVELS.length) {
        state.won = true;
        events |= EVENT_WIN;
      } else {
        events |= EVENT_LEVEL_CLEAR;
        loadLevel(state.levelIndex + 1);
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, loadLevel };
}

export { STEP };
