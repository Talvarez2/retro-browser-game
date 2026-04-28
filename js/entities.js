import { TILE_WALL } from './map.js';

const TYPES = {
  slime:    { hp: 8,  atk: 2, def: 0, xp: 3,  color: '#66bb6a', glyph: 's' },
  bat:      { hp: 5,  atk: 3, def: 0, xp: 2,  color: '#ab47bc', glyph: 'b' },
  skeleton: { hp: 12, atk: 4, def: 1, xp: 5,  color: '#bdbdbd', glyph: 'S' },
  orc:      { hp: 18, atk: 6, def: 2, xp: 8,  color: '#c62828', glyph: 'O' },
  dragon:   { hp: 40, atk: 10, def: 5, xp: 25, color: '#ff6f00', glyph: 'D' },
};

export class Entity {
  constructor(type, x, y, scale = 1) {
    const t = TYPES[type];
    this.type = type; this.x = x; this.y = y; this.alive = true;
    this.hp = Math.ceil(t.hp * scale); this.maxHp = this.hp;
    this.atk = Math.ceil(t.atk * scale); this.def = Math.ceil(t.def * scale);
    this.xp = Math.ceil(t.xp * scale);
    this.color = t.color; this.glyph = t.glyph;
  }

  takeTurn(player, map, entities) {
    if (!this.alive) return null;
    const dist = Math.abs(this.x - player.x) + Math.abs(player.y - this.y);
    if (dist > 10) return null;

    const dx = Math.sign(player.x - this.x);
    const dy = Math.sign(player.y - this.y);

    // Try axis-aligned moves only (no diagonal corner-cutting)
    const moves = Math.abs(dx) >= Math.abs(dy) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
    for (const [mx, my] of moves) {
      if (mx === 0 && my === 0) continue;
      const nx = this.x + mx, ny = this.y + my;
      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
      if (nx === player.x && ny === player.y) return { type: 'attack' };
      if (map.tiles[ny][nx] === TILE_WALL) continue;
      if (entities.some(e => e !== this && e.alive && e.x === nx && e.y === ny)) continue;
      this.x = nx; this.y = ny;
      return { type: 'move' };
    }
    return null;
  }
}

export function spawnEnemies(rooms, level) {
  const pool = level <= 2 ? ['slime', 'bat']
    : level <= 4 ? ['slime', 'bat', 'skeleton']
    : level <= 6 ? ['skeleton', 'orc']
    : ['orc', 'dragon'];
  const scale = 1 + (level - 1) * 0.15;
  const out = [];
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    const count = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < count; j++) {
      const ex = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
      const ey = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
      out.push(new Entity(pool[Math.floor(Math.random() * pool.length)], ex, ey, scale));
    }
  }
  return out;
}
