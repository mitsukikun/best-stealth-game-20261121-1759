// The three hand-built levels of Nightshade Garden. Each map is 32 by 18 tiles of 40 px.
// Legend: '#' wall (blocks movement and sight), '.' floor, 'H' hedge (walkable, blocks sight
// and hides the player inside it), 'C' crate (blocks movement and sight), 'P' player start,
// 'E' garden gate (the exit), '*' moonpetal, 'G' guard spawn mark, 'L' lantern (decoration).
// A guard's patrol is a loop of tile waypoints; its first waypoint is where it spawns, so the
// 'G' marks in the map only have to count the same as the patrol list.

export const LEVELS = [
  {
    name: 'Moonpetal Garden',
    hint: 'Collect 3 moonpetals, then slip out of the garden gate.',
    par: 90,
    map: [
      '################################',
      '#P....H.........*......H.......#',
      '#.....H................H....*..#',
      '#..C..H....#####........H......#',
      '#..C.......#####...G..........E#',
      '#..........#####...............#',
      '#..HHHH........C.....HHHH......#',
      '#..HHHH........C.....HHHH......#',
      '#..............................#',
      '#....G......####.....C.........#',
      '#..........####................#',
      '#..*.......####..........C.....#',
      '#..........####................#',
      '#....HHHH.......C......HHHH....#',
      '#....HHHH..............HHHH....#',
      '#..............................#',
      '#..............................#',
      '################################',
    ],
    patrols: [
      // Warden of the east walk: paces the top corridor past the gate.
      [{ x: 19, y: 4 }, { x: 27, y: 4 }, { x: 27, y: 8 }, { x: 19, y: 8 }],
      // Warden of the west beds: circles the lower-left petal patch.
      [{ x: 5, y: 9 }, { x: 5, y: 13 }, { x: 12, y: 13 }, { x: 12, y: 9 }],
    ],
  },
  {
    name: 'The Lantern Court',
    hint: 'Three wardens now. Hedges are your friends — hide inside them.',
    par: 105,
    map: [
      '################################',
      '#P....#####.......H......*.....#',
      '#.....#####.......H............#',
      '#..H........C..........#####...#',
      '#..H........C....G.....#####.E.#',
      '#..H..................#####....#',
      '#.....######.....HHHH..........#',
      '#.....######.....HHHH....C.....#',
      '#..............................#',
      '#..*....C......G.....####......#',
      '#..........######...####.......#',
      '#....G.....######..........*...#',
      '#..........######..............#',
      '#..HHHH.........C.....HHHH.....#',
      '#..HHHH................HHHH....#',
      '#..............................#',
      '#..............................#',
      '################################',
    ],
    patrols: [
      // Court warden: guards the gate approach from the north walk.
      [{ x: 17, y: 4 }, { x: 24, y: 4 }, { x: 24, y: 7 }, { x: 17, y: 7 }],
      // Middle warden: crosses the court between the lantern beds.
      [{ x: 16, y: 9 }, { x: 24, y: 9 }, { x: 24, y: 12 }, { x: 16, y: 12 }],
      // West warden: patrols the petal beds on the left.
      [{ x: 5, y: 11 }, { x: 5, y: 15 }, { x: 12, y: 15 }, { x: 12, y: 11 }],
    ],
  },
  {
    name: 'The Warden’s Maze',
    hint: 'Four wardens, tight lanes. Toss a pebble (click) to pull one away.',
    par: 120,
    map: [
      '################################',
      '#P...H......#####.....*........#',
      '#....H......#####.......H....*.#',
      '#....H..C...#####..G....H......#',
      '#.......C..........#####.......#',
      '#..G........C......#####....E..#',
      '#..........######..............#',
      '#..HHHH....######...C....HHHH..#',
      '#..HHHH....######........HHHH..#',
      '#..............................#',
      '#....C......G.....####....C....#',
      '#...........######.............#',
      '#..*........######.............#',
      '#...........######.............#',
      '#.....HHHH.......C.....HHHH....#',
      '#.....HHHH.............HHHH....#',
      '#..............G...............#',
      '################################',
    ],
    patrols: [
      // North warden: the top corridor by the first petals.
      [{ x: 20, y: 2 }, { x: 27, y: 2 }, { x: 27, y: 5 }, { x: 20, y: 5 }],
      // West warden: the left lane past the lower petal.
      [{ x: 3, y: 4 }, { x: 3, y: 8 }, { x: 10, y: 8 }, { x: 10, y: 4 }],
      // Centre warden: the maze heart, crossing both ways.
      [{ x: 13, y: 10 }, { x: 13, y: 14 }, { x: 20, y: 14 }, { x: 20, y: 10 }],
      // South warden: the bottom lane, guarding the long way round.
      [{ x: 15, y: 16 }, { x: 24, y: 16 }, { x: 24, y: 12 }, { x: 15, y: 12 }],
    ],
  },
];

/** Parse one level's map into tiles and points of interest. */
export function parseLevel(level) {
  const rows = level.map.length;
  const cols = level.map[0].length;
  const tiles = [];
  let playerStart = null;
  let exit = null;
  const petals = [];
  const guardMarks = [];
  for (let y = 0; y < rows; y += 1) {
    const row = [];
    for (let x = 0; x < cols; x += 1) {
      const ch = level.map[y][x];
      if (ch === 'P') playerStart = { x, y };
      else if (ch === 'E') exit = { x, y };
      else if (ch === '*') petals.push({ x, y });
      else if (ch === 'G') guardMarks.push({ x, y });
      row.push(ch === 'P' || ch === 'E' || ch === '*' || ch === 'G' ? '.' : ch);
    }
    tiles.push(row);
  }
  return { tiles, cols, rows, playerStart, exit, petals, guardMarks };
}
