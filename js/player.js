import { TILE_WALL } from './map.js';

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.hp = 20; this.maxHp = 20;
    this.atk = 5; this.def = 2;
    this.level = 1; this.xp = 0; this.xpNext = 10;
    this.inventory = [];
    this.fov = new Set();
    this.seen = new Set();
  }

  tryMove(dx, dy, map, entities) {
    const nx = this.x + dx, ny = this.y + dy;
    if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) return null;
    if (map.tiles[ny][nx] === TILE_WALL) return null;
    const enemy = entities?.find(e => e.alive && e.x === nx && e.y === ny);
    if (enemy) return { type: 'attack', target: enemy };
    this.x = nx; this.y = ny;
    return { type: 'move' };
  }

  computeFov(map, radius = 8) {
    this.fov.clear();
    const add = (x, y) => {
      const k = y * map.width + x;
      this.fov.add(k);
      this.seen.add(k);
    };
    add(this.x, this.y);
    const steps = 360;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const dx = Math.cos(a), dy = Math.sin(a);
      let rx = this.x + 0.5, ry = this.y + 0.5;
      for (let d = 0; d < radius; d++) {
        const tx = Math.floor(rx), ty = Math.floor(ry);
        if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) break;
        add(tx, ty);
        if (map.tiles[ty][tx] === TILE_WALL) break;
        rx += dx; ry += dy;
      }
    }
  }

  gainXp(amount) {
    this.xp += amount;
    if (this.xp < this.xpNext) return false;
    this.level++;
    this.xp -= this.xpNext;
    this.xpNext = Math.floor(this.xpNext * 1.5);
    this.maxHp += 5; this.hp = this.maxHp;
    this.atk += 2; this.def += 1;
    return true;
  }
}
