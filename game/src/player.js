// Pip, the moth-thief: a circle that slides around the garden. Walls and crates block the
// circle; hedges are walked through slowly and hide the player inside them. Walking is loud
// enough for a nearby warden to hear; sneaking (Shift) is silent but slow. A thrown pebble
// flies to where the mouse clicked and clatters, pulling wardens over to look.

import { PEBBLE, PLAYER, TILE } from './config.js';

function tileAt(tiles, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return '#';
  return tiles[ty][tx];
}

function blocksMovement(tile) {
  return tile === '#' || tile === 'C';
}

/** True when a circle at (x, y) with the player's radius would touch a blocking tile. */
export function collides(tiles, x, y) {
  const r = PLAYER.radius;
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (!blocksMovement(tileAt(tiles, tx * TILE, ty * TILE))) continue;
      const nearestX = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const nearestY = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      if ((x - nearestX) ** 2 + (y - nearestY) ** 2 < r * r) return true;
    }
  }
  return false;
}

export function createPlayer(startTile) {
  return {
    x: startTile.x * TILE + TILE / 2,
    y: startTile.y * TILE + TILE / 2,
    facing: 0,
    sneaking: false,
    /** True while standing inside a hedge tile: wardens cannot see the player there. */
    hidden: false,
    moving: false,
    /** Seconds since the last footstep sound; walking steps tick, sneaking does not. */
    stepTimer: 0,
    pebbles: 0,
  };
}

/**
 * Move the player one step. `move` is {x, y} in -1..1, `sneak` is Shift held. Returns a noise
 * event ({x, y, radius}) when a loud footstep lands, else null. Axes are tried separately so
 * the player slides along walls instead of sticking to them.
 */
export function stepPlayer(player, tiles, move, sneak, dt) {
  player.sneaking = sneak;
  // Hiding is about where the player stands, not whether they move: refresh it every step.
  player.hidden = tileAt(tiles, player.x, player.y) === 'H';
  const length = Math.hypot(move.x, move.y);
  player.moving = length > 0.1;
  if (!player.moving) return null;
  const speed = sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const nx = (move.x / length) * speed * dt;
  const ny = (move.y / length) * speed * dt;
  if (!collides(tiles, player.x + nx, player.y)) player.x += nx;
  if (!collides(tiles, player.x, player.y + ny)) player.y += ny;
  player.facing = Math.atan2(move.y, move.x);
  player.hidden = tileAt(tiles, player.x, player.y) === 'H';

  if (sneak) return null;
  player.stepTimer -= dt;
  if (player.stepTimer <= 0) {
    player.stepTimer = 0.42;
    return { x: player.x, y: player.y, radius: PLAYER.noiseRadius };
  }
  return null;
}

/**
 * Throw a pebble toward (tx, ty). Returns the pebble (its landing point and noise) or null
 * when the player has none left or the target is out of throwing range.
 */
export function throwPebble(player, tx, ty) {
  if (player.pebbles <= 0) return null;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance > PEBBLE.range || distance < 10) return null;
  player.pebbles -= 1;
  // The pebble lands where the player clicked (the throw is already range-checked).
  return { x: tx, y: ty, noise: { x: tx, y: ty, radius: PEBBLE.noiseRadius } };
}
