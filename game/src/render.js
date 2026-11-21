// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Vision cones are raycast polygons clipped by walls and hedges, so the light never
// leaks through cover; the player hides inside hedges, drawn half-faded among the leaves.

import { FIELD, FONT, GUARD, LIVES, PALETTE, TILE } from './config.js';
import { conePolygon } from './vision.js';
import { GUARD_CHASE, GUARD_INVESTIGATE, GUARD_SEARCH } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The panel's width; its height grows with its lines. */
const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };

export function createRenderer(canvas, random) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  // One speck of floor variation per tile, fixed at boot so the floor never shimmers.
  const floorShade = [];
  for (let y = 0; y < FIELD.height / TILE; y += 1) {
    const row = [];
    for (let x = 0; x < FIELD.width / TILE; x += 1) row.push(random());
    floorShade.push(row);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function tileIs(tiles, tx, ty, kind) {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return false;
    return tiles[ty][tx] === kind;
  }

  function drawFloor(tiles) {
    for (let ty = 0; ty < tiles.length; ty += 1) {
      for (let tx = 0; tx < tiles[ty].length; tx += 1) {
        const tile = tiles[ty][tx];
        if (tile === '#') continue;
        const shade = floorShade[ty][tx];
        context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        context.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        if (shade < 0.12) {
          context.fillStyle = PALETTE.floorEdge;
          context.fillRect(tx * TILE + 8, ty * TILE + 10, 5, 5);
        } else if (shade > 0.92) {
          context.fillStyle = PALETTE.floorEdge;
          context.beginPath();
          context.arc(tx * TILE + 26, ty * TILE + 28, 3, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }

  function drawWalls(tiles) {
    for (let ty = 0; ty < tiles.length; ty += 1) {
      for (let tx = 0; tx < tiles[ty].length; tx += 1) {
        if (tiles[ty][tx] !== '#') continue;
        context.fillStyle = PALETTE.wall;
        context.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        context.fillStyle = PALETTE.wallTop;
        context.fillRect(tx * TILE, ty * TILE, TILE, 6);
        context.fillStyle = 'rgba(0,0,0,0.25)';
        context.fillRect(tx * TILE, ty * TILE + TILE - 4, TILE, 4);
      }
    }
  }

  function drawCover(tiles) {
    for (let ty = 0; ty < tiles.length; ty += 1) {
      for (let tx = 0; tx < tiles[ty].length; tx += 1) {
        const tile = tiles[ty][tx];
        if (tile === 'H') {
          context.fillStyle = PALETTE.hedgeDark;
          context.fillRect(tx * TILE + 2, ty * TILE + 2, TILE - 4, TILE - 4);
          context.fillStyle = PALETTE.hedge;
          context.beginPath();
          context.arc(tx * TILE + 12, ty * TILE + 14, 11, 0, Math.PI * 2);
          context.arc(tx * TILE + 28, ty * TILE + 12, 10, 0, Math.PI * 2);
          context.arc(tx * TILE + 20, ty * TILE + 27, 11, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = PALETTE.hedgeLight;
          context.beginPath();
          context.arc(tx * TILE + 13, ty * TILE + 12, 4, 0, Math.PI * 2);
          context.arc(tx * TILE + 27, ty * TILE + 26, 4, 0, Math.PI * 2);
          context.fill();
        } else if (tile === 'C') {
          context.fillStyle = PALETTE.crate;
          context.fillRect(tx * TILE + 3, ty * TILE + 3, TILE - 6, TILE - 6);
          context.fillStyle = PALETTE.crateTop;
          context.fillRect(tx * TILE + 3, ty * TILE + 3, TILE - 6, 7);
          context.strokeStyle = 'rgba(0,0,0,0.35)';
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(tx * TILE + 3, ty * TILE + 3);
          context.lineTo(tx * TILE + TILE - 3, ty * TILE + TILE - 3);
          context.moveTo(tx * TILE + TILE - 3, ty * TILE + 3);
          context.lineTo(tx * TILE + 3, ty * TILE + TILE - 3);
          context.stroke();
        }
      }
    }
  }

  function drawExit(state, time) {
    const exit = state.exit;
    const pulse = 0.55 + 0.25 * Math.sin(time * 3);
    context.save();
    context.globalAlpha = state.exitOpen ? 0.5 + pulse * 0.5 : 0.18;
    context.fillStyle = PALETTE.exit;
    context.beginPath();
    context.arc(exit.x, exit.y, 26, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.strokeStyle = state.exitOpen ? PALETTE.exitGlow : PALETTE.muted;
    context.lineWidth = 3;
    context.strokeRect(exit.x - 20, exit.y - 20, 40, 40);
    context.fillStyle = state.exitOpen ? PALETTE.exitGlow : PALETTE.muted;
    context.beginPath();
    context.moveTo(exit.x, exit.y - 12);
    context.lineTo(exit.x + 11, exit.y + 9);
    context.lineTo(exit.x - 11, exit.y + 9);
    context.closePath();
    context.fill();
    if (!state.exitOpen) {
      // Above the gate, not below: the border wall would paint over a label beneath it.
      text('LOCKED', exit.x, exit.y - 34, 13, PALETTE.muted, 'center');
    }
  }

  function drawPetals(state, time) {
    for (const petal of state.petals) {
      if (petal.got) continue;
      const bob = Math.sin(time * 2 + petal.x) * 3;
      const glow = 0.5 + 0.3 * Math.sin(time * 3 + petal.y);
      context.save();
      context.globalAlpha = glow;
      context.fillStyle = PALETTE.petal;
      context.beginPath();
      context.arc(petal.x, petal.y + bob, 16, 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.fillStyle = PALETTE.petalGlow;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + time * 0.4;
        context.beginPath();
        context.ellipse(petal.x + Math.cos(a) * 8, petal.y + bob + Math.sin(a) * 8, 5, 3, a, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = PALETTE.petalGlow;
      context.beginPath();
      context.arc(petal.x, petal.y + bob, 3.5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawCone(state, guard) {
    const polygon = conePolygon(state.tiles, guard.x, guard.y, guard.angle, GUARD.halfAngle, GUARD.sightRange);
    context.beginPath();
    context.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i += 1) context.lineTo(polygon[i].x, polygon[i].y);
    context.closePath();
    context.fillStyle =
      guard.state === GUARD_CHASE ? PALETTE.coneAlarm : guard.suspicion > 0.4 ? PALETTE.coneWary : PALETTE.coneCalm;
    context.fill();
  }

  function drawGuard(guard) {
    const chasing = guard.state === GUARD_CHASE;
    context.fillStyle = chasing ? '#ff8a8a' : PALETTE.guardSuit;
    context.beginPath();
    context.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    context.fill();
    // Lantern the warden carries: a warm dot in front, showing where it faces.
    context.fillStyle = '#ffd98a';
    context.beginPath();
    context.arc(guard.x + Math.cos(guard.angle) * 16, guard.y + Math.sin(guard.angle) * 16, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(guard.x, guard.y, 6, 0, Math.PI * 2);
    context.fill();
    // Suspicion mark above the head: ? while unsure, ! once the chase is on.
    if (guard.suspicion > 0.15 || chasing) {
      text(chasing ? '!' : '?', guard.x, guard.y - 24, 24, chasing ? '#ff6b6b' : '#ffd166', 'center');
      context.fillStyle = 'rgba(0,0,0,0.45)';
      context.fillRect(guard.x - 14, guard.y - 20, 28, 4);
      context.fillStyle = chasing ? '#ff6b6b' : '#ffd166';
      context.fillRect(guard.x - 14, guard.y - 20, 28 * Math.min(1, guard.suspicion), 4);
    }
  }

  function drawPlayer(player, time) {
    context.save();
    if (player.hidden) context.globalAlpha = 0.55;
    // Cloak: a triangle pointing where Pip faces, with a moth-wing shimmer.
    context.translate(player.x, player.y);
    context.rotate(player.facing);
    context.fillStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
    context.beginPath();
    context.moveTo(16, 0);
    context.lineTo(-11, -11);
    context.lineTo(-6, 0);
    context.lineTo(-11, 11);
    context.closePath();
    context.fill();
    context.fillStyle = '#7a5c1e';
    context.beginPath();
    context.arc(2, 0, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    // A soft ring while sneaking, so the player can tell at a glance they are silent.
    if (player.sneaking) {
      context.strokeStyle = 'rgba(255, 209, 102, 0.5)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.x, player.y, 20 + Math.sin(time * 4) * 1.5, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawRings(state) {
    for (const ring of state.rings) {
      const progress = ring.age / 0.9;
      context.strokeStyle = PALETTE.noise;
      context.globalAlpha = 1 - progress;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(ring.x, ring.y, ring.radius * progress, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
  }

  function drawPebbles(state) {
    for (const pebble of state.pebbles) {
      const x = pebble.x + (pebble.tx - pebble.x) * pebble.t;
      const y = pebble.y + (pebble.ty - pebble.y) * pebble.t - Math.sin(pebble.t * Math.PI) * 26;
      context.fillStyle = '#cfd6e4';
      context.beginPath();
      context.arc(x, y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawField(state, time) {
    drawFloor(state.tiles);
    drawExit(state, time);
    drawPetals(state, time);
    for (const guard of state.guards) drawCone(state, guard);
    drawWalls(state.tiles);
    drawCover(state.tiles);
    drawRings(state);
    drawPebbles(state);
    for (const guard of state.guards) drawGuard(guard);
    drawPlayer(state.player, time);
  }

  function drawHud(state, best) {
    context.textBaseline = 'top';
    const level = state.level;
    text(`${level.name}`, 24, 18, 24, PALETTE.text, 'left');
    text(`Score ${state.score}   Best ${best}`, 24, 48, 18, PALETTE.muted, 'left');
    text(`Pip ${'♥'.repeat(state.lives)}${'♡'.repeat(Math.max(0, LIVES - state.lives))}`, FIELD.width - 24, 18, 24, PALETTE.text, 'right');
    text(`Moonpetals ${state.petalsGot}/${state.petals.length}   Pebbles ${state.player.pebbles}`, FIELD.width - 24, 48, 18, PALETTE.muted, 'right');
    // The eye: how close the most suspicious warden is to raising the alarm.
    const alarm = state.alarm;
    const eyeX = FIELD.width / 2;
    text(alarm > 0.75 ? '👁 ALARM' : alarm > 0.35 ? '👁 wary' : '👁 unseen', eyeX, 18, 20, alarm > 0.75 ? '#ff6b6b' : alarm > 0.35 ? '#ffb84d' : PALETTE.muted, 'center');
    context.fillStyle = 'rgba(0,0,0,0.45)';
    context.fillRect(eyeX - 60, 46, 120, 8);
    context.fillStyle = alarm > 0.75 ? '#ff6b6b' : alarm > 0.35 ? '#ffb84d' : '#7fe0a8';
    context.fillRect(eyeX - 60, 46, 120 * alarm, 8);
    const seconds = Math.floor(state.time);
    text(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, eyeX, 60, 16, PALETTE.muted, 'center');
    if (!state.exitOpen) {
      text('The gate is locked — pocket every moonpetal first.', FIELD.width / 2, FIELD.height - 34, 18, PALETTE.muted, 'center');
    } else {
      text('The gate is open — reach it unseen!', FIELD.width / 2, FIELD.height - 34, 18, PALETTE.exit, 'center');
    }
    if (state.player.hidden) {
      text('Hidden in the hedge', state.player.x, state.player.y - 30, 15, PALETTE.hedgeLight, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(6, 8, 16, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, time) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state, time);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'Nightshade Garden',
        [
          'You are Pip, a moth-thief. Pocket 3 moonpetals,',
          'then slip out of the garden gate — unseen.',
          'WASD / arrows to move · Shift to sneak silently',
          'Click to toss a pebble and pull a warden away',
          'Hedges hide you · cones are a warden’s sight',
          'P pauses · M mutes',
          `Best score ${best}`,
        ],
        'Press Space or click to start',
      );
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The wardens will wait for you.'], 'Press P to keep sneaking');
    } else if (screen === SCREEN_LEVEL_CLEAR) {
      const cleared = state.cleared;
      drawPanel(
        'Gate reached!',
        [
          `${cleared ? cleared.name : state.level.name} cleared.`,
          `Score ${cleared ? cleared.score : state.score}${cleared && !cleared.spotted ? ' · ghost bonus earned' : ''}`,
          'The next garden is darker, and better watched.',
        ],
        'Press Space for the next level',
      );
    } else if (screen === SCREEN_OVER) {
      drawPanel(
        'Caught!',
        [
          'The wardens found Pip one too many times.',
          `Score ${state.score} · Best ${best}`,
          'The moonpetals stay in the garden… for now.',
        ],
        'Press Space or click to try again',
      );
    } else if (screen === SCREEN_WIN) {
      drawPanel(
        'The garden is yours!',
        [
          'Every moonpetal pocketed, every gate slipped through,',
          'and no warden ever laid a hand on Pip.',
          `Final score ${state.score} · Best ${best}`,
        ],
        'Press Space or click to play again',
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Convert a point in canvas pixels to a point in the 1280x720 playfield. */
    screenToWorld(px, py) {
      return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
    },
  };
}
