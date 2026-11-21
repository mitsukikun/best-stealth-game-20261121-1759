// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot, so the frame
// is what a short game really looks like and the same seed always gives the same frame.
// The pilot walks toward the nearest moonpetal (then the gate), steering around any tile a
// warden can see, and sneaks whenever a warden is near; the end scene's pilot is careless
// enough to be caught once, so the frame shows the caught screen.

import { FIELD, STEP, TILE } from './config.js';
import { EVENT_CAUGHT, EVENT_LEVEL_CLEAR, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_LEVEL_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { guardSeesPlayer } from './guards.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 34;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Where the player should head: the nearest unpicked petal, then the gate once it opens. */
function currentTarget(state) {
  for (const petal of state.petals) {
    if (!petal.got) return petal;
  }
  return state.exit;
}

/** Would standing at (x, y) be seen by any warden right now? */
function wouldBeSeen(state, x, y) {
  const probe = { x, y, hidden: false };
  for (const guard of state.guards) {
    if (guardSeesPlayer(guard, state.tiles, probe) > 0) return true;
  }
  return false;
}

/**
 * Pick a steering direction: among 8 ways, take the one that heads most toward the target
 * without stepping into sight; a seen tile costs far more than a detour. Returns {x, y, sneak}.
 */
function autopilot(state, careless) {
  const player = state.player;
  const target = currentTarget(state);
  const nearGuard = state.guards.some((g) => Math.hypot(g.x - player.x, g.y - player.y) < 170);
  const directions = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
  ];
  let best = { x: 0, y: 0, sneak: nearGuard };
  let bestScore = Infinity;
  for (const dir of directions) {
    const length = Math.hypot(dir.x, dir.y);
    const step = 26;
    const nx = player.x + (dir.x / length) * step;
    const ny = player.y + (dir.y / length) * step;
    if (nx < TILE || ny < TILE || nx > FIELD.width - TILE || ny > FIELD.height - TILE) continue;
    const dist = Math.hypot(target.x - nx, target.y - ny);
    const seen = wouldBeSeen(state, nx, ny);
    const score = dist + (seen ? (careless ? 40 : 900) : 0);
    if (score < bestScore) {
      bestScore = score;
      best = { x: dir.x / length, y: dir.y / length, sneak: nearGuard };
    }
  }
  return best;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, null, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  // The end scene plays the first level to its finish with the careful pilot: the gate
  // reached (level-clear panel), the win, or the caught screen if it all goes wrong.
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const move = autopilot(world.state, false);
    const events = world.step(STEP, move, move.sneak, null, false);
    if (events & (EVENT_LEVEL_CLEAR | EVENT_WIN | EVENT_OVER)) break;
  }
  const over = world.state.over;
  const won = world.state.won;
  const cleared = world.state.cleared !== null;
  return {
    screen: won ? SCREEN_WIN : over ? SCREEN_OVER : cleared ? SCREEN_LEVEL_CLEAR : SCREEN_PLAY,
    best: world.state.score,
  };
}
