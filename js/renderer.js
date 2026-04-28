import { TILE_WALL, TILE_FLOOR, TILE_STAIRS } from './map.js';

export const TILE = 32;

const COLORS = { [TILE_WALL]: '#2a2a3a', [TILE_FLOOR]: '#4a4a5a', [TILE_STAIRS]: '#ffcc00' };

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = innerWidth;
    this.canvas.height = innerHeight;
    this.cols = Math.ceil(this.canvas.width / TILE) + 2;
    this.rows = Math.ceil(this.canvas.height / TILE) + 2;
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawMap(map, camX, camY, visible, seen) {
    const sx = Math.floor(camX / TILE), sy = Math.floor(camY / TILE);
    const ox = -(camX % TILE), oy = -(camY % TILE);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const mx = sx + c, my = sy + r;
        if (mx < 0 || mx >= map.width || my < 0 || my >= map.height) continue;
        const k = my * map.width + mx;
        if (!seen.has(k)) continue;
        this.ctx.globalAlpha = visible.has(k) ? 1 : 0.3;
        this.ctx.fillStyle = COLORS[map.tiles[my][mx]] ?? COLORS[TILE_WALL];
        this.ctx.fillRect(ox + c * TILE, oy + r * TILE, TILE, TILE);
      }
    }
    this.ctx.globalAlpha = 1;
  }

  drawEntity(x, y, color, camX, camY, glyph) {
    const sx = x * TILE - camX, sy = y * TILE - camY;
    if (sx < -TILE || sx > this.canvas.width || sy < -TILE || sy > this.canvas.height) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
    if (glyph) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `bold ${TILE - 8}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(glyph, sx + TILE / 2, sy + TILE / 2);
    }
  }

  drawBar(x, y, w, h, cur, max, color) {
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w * Math.max(0, cur / max), h);
  }

  text(x, y, str, color = '#fff', size = 14) {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px monospace`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(str, x, y);
  }

  centeredText(y, str, color = '#fff', size = 14) {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(str, this.canvas.width / 2, y);
  }
}
