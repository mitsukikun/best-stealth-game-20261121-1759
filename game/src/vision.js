// Line of sight and vision cones. Sight is blocked by walls, crates and hedges; the raycast
// marches in small steps and tests the tile under each step, which is exact enough at 40 px
// tiles and cheap enough to run for every guard every frame.

import { TILE } from './config.js';

/** True when the tile at (tx, ty) blocks a guard's sight. Out of bounds blocks too. */
export function blocksSight(tiles, tx, ty) {
  if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return true;
  const tile = tiles[ty][tx];
  return tile === '#' || tile === 'C' || tile === 'H';
}

/**
 * True when the straight line from (x0, y0) to (x1, y1) crosses no sight-blocking tile.
 * The endpoints' own tiles never block: a guard standing in a hedge still sees out of it.
 */
export function hasLineOfSight(tiles, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 4));
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (blocksSight(tiles, tx, ty)) return false;
  }
  return true;
}

/** Distance along a ray from (x, y) in direction (dx, dy) before sight is blocked. */
function rayDistance(tiles, x, y, dx, dy, maxDistance) {
  const step = 4;
  for (let d = step; d <= maxDistance; d += step) {
    const tx = Math.floor((x + dx * d) / TILE);
    const ty = Math.floor((y + dy * d) / TILE);
    if (blocksSight(tiles, tx, ty)) return d - step / 2;
  }
  return maxDistance;
}

/**
 * The visible cone as a polygon: the guard's position, then one point per ray fanned across
 * the cone. Walls and hedges clip the cone, so the light never leaks through cover.
 */
export function conePolygon(tiles, x, y, angle, halfAngle, range, rays = 26) {
  const points = [{ x, y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const d = rayDistance(tiles, x, y, dx, dy, range);
    points.push({ x: x + dx * d, y: y + dy * d });
  }
  return points;
}

/** Shortest angle between two headings, in (-PI, PI]. */
export function angleDifference(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}
