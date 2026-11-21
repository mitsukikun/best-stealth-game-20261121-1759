# Nightshade Garden — Make the best stealth game (best-stealth-game-20261121-1759)

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/mitsukikun/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/mitsukikun/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game in pure vanilla JS. No libraries, no build step, no
network request: `game/index.html` opens in desktop Chrome and just plays.

## The game

You are Pip, a moth-thief. Pocket 3 moonpetals per level, then reach the
garden gate unseen.

- **3 hand-built levels** (Moonpetal Garden, The Lantern Court, The Warden's
  Maze) with 2/3/4 patrolling lantern wardens.
- **Raycast vision cones** clipped by walls, hedges, and crates. Suspicion
  rises in a cone (faster up close) and cools when hidden; full suspicion
  means a chase; getting caught costs a life (3 lives).
- **Hedges hide you** (and block sight). **Shift** sneaks silently; walking
  is loud. **Click** tosses a pebble that pulls wardens over to investigate.
- **Score:** petals, level clear, time bonus, and a ghost bonus for never
  being spotted in a level. Procedural WebAudio sounds only (no audio
  files). Best score kept in localStorage.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

## Screenshots

Deterministic staged scenes, produced by the game's own code stepping itself
with an autopilot (`game/src/shots.js`):

- `screenshots/1-start.jpg` — title screen over the live level
- `screenshots/2-play.jpg` — mid-play: 3/3 petals, gate open, warden cone
- `screenshots/3-end.jpg` — "Gate reached!" level-clear panel

---

<sub>Entered on [make.fun](https://make.fun/?ref=tvfbjxfd&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
