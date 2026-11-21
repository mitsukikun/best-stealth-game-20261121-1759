// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The
// game moves between six screens: title, play, paused, level clear, game over and win.
//
// ?seed=N fixes the level dressing. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_CAUGHT,
  EVENT_LEVEL_CLEAR,
  EVENT_OVER,
  EVENT_PEBBLE,
  EVENT_PETAL,
  EVENT_SPOTTED,
  EVENT_WIN,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_LEVEL_CLEAR,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const audio = createAudio();
const renderer = createRenderer(canvas, createRandom(seed ^ 0x9e3779b9));

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.state.time);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (px, py) => renderer.screenToWorld(px, py));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and events.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Pocket 3 moonpetals, then reach the gate unseen.');
  }

  function finishScore() {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_LEVEL_CLEAR) {
      screen = SCREEN_PLAY;
      announce('Next level. Playing.');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function react(events) {
    if (events & EVENT_PETAL) {
      audio.petal();
      announce(`Moonpetal pocketed. ${world.state.petalsGot} of 3.`);
    }
    if (events & EVENT_PEBBLE) audio.pebble();
    if (events & EVENT_SPOTTED) {
      audio.spotted();
      announce('Spotted! A warden is chasing you.');
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      announce(world.state.lives === 1 ? 'Caught! 1 life left.' : `Caught! ${world.state.lives} lives left.`);
    }
    if (events & EVENT_LEVEL_CLEAR) {
      audio.gate();
      screen = SCREEN_LEVEL_CLEAR;
      announce('Gate reached. Next level.');
    }
    if (events & EVENT_WIN) {
      audio.win();
      finishScore();
      screen = SCREEN_WIN;
      announce(`You won! Final score ${world.state.score}.`);
    }
    if (events & EVENT_OVER) {
      finishScore();
      screen = SCREEN_OVER;
      announce(`Caught too many times. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, null, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const click = input.takeClick();
    const events = world.step(STEP, input.move(), input.sneaking(), click, false);
    react(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, world.state.time);
  }

  // Leaving the tab pauses a running game rather than letting wardens patrol unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A debug handle for play-testing in a browser console; it reads live state only.
  window.__nightshade = { world, screen: () => screen, best: () => best };

  announce('Nightshade Garden. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
