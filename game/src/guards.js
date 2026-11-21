// The lantern wardens. Each one patrols a loop of waypoints, pauses to look around, and
// watches a vision cone. Suspicion rises while the player is seen (faster up close) and cools
// while hidden; at full suspicion the guard chases the player's last seen spot, and a guard
// that hears a noise walks over to check it. A caught player is the world's job, not this
// module's: here a guard only reports how sure it is.

import { GUARD, PLAYER, TILE } from './config.js';
import { angleDifference, hasLineOfSight } from './vision.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_CHASE = 'chase';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_SEARCH = 'search';

function tileCentre(tile) {
  return { x: tile.x * TILE + TILE / 2, y: tile.y * TILE + TILE / 2 };
}

export function createGuard(waypoints, index) {
  const start = tileCentre(waypoints[0]);
  const next = tileCentre(waypoints[1 % waypoints.length]);
  return {
    index,
    waypoints,
    x: start.x,
    y: start.y,
    angle: Math.atan2(next.y - start.y, next.x - start.x),
    waypoint: 1 % waypoints.length,
    pause: 0,
    state: GUARD_PATROL,
    /** 0 (calm) to 1 (certain). */
    suspicion: 0,
    lastSeen: null,
    investigate: null,
    search: 0,
    scanAngle: 0,
    scanTime: 0,
  };
}

/** How much this guard can see the player right now, 0 when hidden, up to 1 up close. */
export function guardSeesPlayer(guard, tiles, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > GUARD.sightRange) return 0;
  const toPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(toPlayer, guard.angle)) > GUARD.halfAngle) return 0;
  if (player.hidden && distance > PLAYER.hedgeSpotRange) return 0;
  if (!hasLineOfSight(tiles, guard.x, guard.y, player.x, player.y)) return 0;
  // Nearer is surer: a guard across the garden takes a while to be sure.
  return 1 - (distance / GUARD.sightRange) * 0.6;
}

function moveToward(guard, target, speed, dt) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return true;
  const wanted = Math.atan2(dy, dx);
  guard.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, angleDifference(wanted, guard.angle)));
  const step = Math.min(distance, speed * dt);
  guard.x += (dx / distance) * step;
  guard.y += (dy / distance) * step;
  return distance - step < 2;
}

function stepPatrol(guard, dt) {
  if (guard.pause > 0) {
    guard.pause -= dt;
    // Look around while waiting: slow scan left and right.
    guard.scanTime += dt;
    guard.angle += Math.sin(guard.scanTime * 1.6) * 0.9 * dt;
    if (guard.pause <= 0) guard.scanTime = 0;
    return;
  }
  const target = tileCentre(guard.waypoints[guard.waypoint]);
  if (moveToward(guard, target, GUARD.patrolSpeed, dt)) {
    guard.waypoint = (guard.waypoint + 1) % guard.waypoints.length;
    guard.pause = GUARD.pauseTime;
  }
}

/**
 * One step of one guard. `events` collects what the world should react to: the player was
 * spotted (suspicion hit 1), or the guard heard a noise. Returns nothing; the guard's state
 * is the record.
 */
export function stepGuard(guard, tiles, player, noises, dt, events) {
  const seen = guardSeesPlayer(guard, tiles, player);
  if (seen > 0) {
    guard.suspicion = Math.min(1, guard.suspicion + (seen / GUARD.spotTime) * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.suspicion >= 1 && guard.state !== GUARD_CHASE) {
      guard.state = GUARD_CHASE;
      events.spotted = true;
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.calmRate * dt);
  }

  // A fresh noise pulls a calm guard off its patrol to look. Noises live for one step (the
  // world clears them after every guard has stepped), so no per-guard memory is needed.
  if (guard.state === GUARD_PATROL || guard.state === GUARD_SUSPICIOUS) {
    for (let i = 0; i < noises.length; i += 1) {
      const noise = noises[i];
      const d = Math.hypot(noise.x - guard.x, noise.y - guard.y);
      if (d < GUARD.hearRange) {
        guard.investigate = { x: noise.x, y: noise.y };
        guard.state = GUARD_INVESTIGATE;
        guard.suspicion = Math.max(guard.suspicion, 0.35);
        break;
      }
    }
  }

  if (guard.state === GUARD_CHASE) {
    if (seen > 0) guard.lastSeen = { x: player.x, y: player.y };
    if (guard.lastSeen && moveToward(guard, guard.lastSeen, GUARD.chaseSpeed, dt)) {
      guard.state = GUARD_SEARCH;
      guard.search = GUARD.searchTime;
    }
    if (guard.suspicion < 0.25) {
      guard.state = GUARD_PATROL;
      guard.lastSeen = null;
    }
  } else if (guard.state === GUARD_INVESTIGATE) {
    if (guard.investigate && moveToward(guard, guard.investigate, GUARD.investigateSpeed, dt)) {
      guard.state = GUARD_SEARCH;
      guard.search = GUARD.searchTime;
      guard.investigate = null;
    }
  } else if (guard.state === GUARD_SEARCH) {
    guard.search -= dt;
    guard.scanTime += dt;
    guard.angle += Math.sin(guard.scanTime * 2.2) * 1.4 * dt;
    if (guard.search <= 0 || guard.suspicion >= 1) {
      guard.state = guard.suspicion >= 1 ? GUARD_CHASE : GUARD_PATROL;
      guard.scanTime = 0;
    }
  } else {
    stepPatrol(guard, dt);
    if (guard.suspicion > 0.5) guard.state = GUARD_SUSPICIOUS;
  }

  if (guard.state === GUARD_SUSPICIOUS && guard.suspicion < 0.4) guard.state = GUARD_PATROL;
  return events;
}

/** True when any guard is close enough to grab the player. */
export function guardCatches(guard, player) {
  return Math.hypot(guard.x - player.x, guard.y - player.y) < GUARD.catchRange;
}
