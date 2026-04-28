export const TILE_WALL = 0, TILE_FLOOR = 1, TILE_STAIRS = 2;
const W = 80, H = 50, MIN_SIZE = 5, MAX_SIZE = 12, ATTEMPTS = 40;

export function generateMap() {
  const tiles = Array.from({ length: H }, () => new Uint8Array(W));
  const rooms = [];

  for (let i = 0; i < ATTEMPTS; i++) {
    const rw = MIN_SIZE + Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE));
    const rh = MIN_SIZE + Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE));
    const rx = 1 + Math.floor(Math.random() * (W - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (H - rh - 2));

    if (rooms.some(r => rx < r.x + r.w + 2 && rx + rw + 2 > r.x && ry < r.y + r.h + 2 && ry + rh + 2 > r.y)) continue;

    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++)
        tiles[y][x] = TILE_FLOOR;

    rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: (rx * 2 + rw) >> 1, cy: (ry * 2 + rh) >> 1 });
  }

  for (let i = 1; i < rooms.length; i++) {
    let { cx: x, cy: y } = rooms[i - 1];
    const { cx: tx, cy: ty } = rooms[i];
    while (x !== tx) { tiles[y][x] = TILE_FLOOR; x += Math.sign(tx - x); }
    while (y !== ty) { tiles[y][x] = TILE_FLOOR; y += Math.sign(ty - y); }
    tiles[y][x] = TILE_FLOOR;
  }

  if (rooms.length > 1) {
    const last = rooms[rooms.length - 1];
    tiles[last.cy][last.cx] = TILE_STAIRS;
  }

  return { tiles, rooms, width: W, height: H };
}
