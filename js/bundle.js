// Bundled game - all modules combined
(function() {
"use strict";

// --- js/map.js ---
const TILE_WALL = 0, TILE_FLOOR = 1, TILE_STAIRS = 2;
const W = 80, H = 50, MIN_SIZE = 5, MAX_SIZE = 12, ATTEMPTS = 40;

function generateMap() {
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


// --- js/audio.js ---
let ctx;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq, dur, type = 'square', vol = 0.1) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.stop(c.currentTime + dur);
}

const SFX = {
  hit:     () => beep(200, 0.1),
  kill:    () => beep(500, 0.15, 'sawtooth'),
  hurt:    () => beep(100, 0.15, 'sawtooth'),
  pickup:  () => beep(800, 0.08),
  heal:    () => beep(600, 0.2, 'sine'),
  stairs:  () => { beep(400, 0.1); setTimeout(() => beep(600, 0.15), 100); },
  levelup: () => { beep(500, 0.1); setTimeout(() => beep(700, 0.1), 100); setTimeout(() => beep(900, 0.15), 200); },
  death:   () => beep(80, 0.5, 'sawtooth', 0.15),
};


// --- js/renderer.js ---

const TILE = 32;

const COLORS = { [TILE_WALL]: '#2a2a3a', [TILE_FLOOR]: '#4a4a5a', [TILE_STAIRS]: '#ffcc00' };

class Renderer {
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


// --- js/player.js ---

class Player {
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


// --- js/entities.js ---

const TYPES = {
  slime:    { hp: 8,  atk: 2, def: 0, xp: 3,  color: '#66bb6a', glyph: 's' },
  bat:      { hp: 5,  atk: 3, def: 0, xp: 2,  color: '#ab47bc', glyph: 'b' },
  skeleton: { hp: 12, atk: 4, def: 1, xp: 5,  color: '#bdbdbd', glyph: 'S' },
  orc:      { hp: 18, atk: 6, def: 2, xp: 8,  color: '#c62828', glyph: 'O' },
  dragon:   { hp: 40, atk: 10, def: 5, xp: 25, color: '#ff6f00', glyph: 'D' },
};

class Entity {
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

function spawnEnemies(rooms, level) {
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


// --- js/items.js ---
const DEFS = {
  health_potion: { name: 'Health Potion', glyph: '!', color: '#ef5350', type: 'consumable',
    use(p) { const h = 8; p.hp = Math.min(p.maxHp, p.hp + h); return `+${h} HP`; } },
  big_potion: { name: 'Big Potion', glyph: '!', color: '#ff7043', type: 'consumable',
    use(p) { const h = 20; p.hp = Math.min(p.maxHp, p.hp + h); return `+${h} HP`; } },
  sword:       { name: 'Iron Sword',    glyph: '/', color: '#90caf9', type: 'weapon', atk: 3 },
  great_sword: { name: 'Great Sword',   glyph: '/', color: '#42a5f5', type: 'weapon', atk: 6 },
  shield:      { name: 'Wooden Shield', glyph: ']', color: '#a1887f', type: 'armor',  def: 2 },
  plate:       { name: 'Plate Armor',   glyph: ']', color: '#78909c', type: 'armor',  def: 4 },
};

class Item {
  constructor(key, x, y) {
    const d = DEFS[key];
    Object.assign(this, { key, x, y, name: d.name, glyph: d.glyph, color: d.color, type: d.type, picked: false });
    if (d.atk) this.atk = d.atk;
    if (d.def) this.def = d.def;
    if (d.use) this.use = d.use;
  }
}

function spawnItems(rooms, level) {
  const pool = level <= 2 ? ['health_potion', 'sword', 'shield']
    : level <= 4 ? ['health_potion', 'big_potion', 'sword', 'shield']
    : ['big_potion', 'great_sword', 'plate'];
  const out = [];
  for (const r of rooms) {
    if (Math.random() > 0.5) continue;
    const ix = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
    const iy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
    out.push(new Item(pool[Math.floor(Math.random() * pool.length)], ix, iy));
  }
  return out;
}


// --- js/game.js ---

const canvas = document.getElementById('game');
const R = new Renderer(canvas);

let dungeonLevel, map, player, entities, items, floats, state;

function initLevel(keepPlayer) {
  map = generateMap();
  entities = spawnEnemies(map.rooms, dungeonLevel);
  items = spawnItems(map.rooms, dungeonLevel);
  floats = [];
  if (keepPlayer) {
    player.x = map.rooms[0].cx; player.y = map.rooms[0].cy;
    player.fov.clear(); player.seen.clear();
  } else {
    player = new Player(map.rooms[0].cx, map.rooms[0].cy);
  }
  player.computeFov(map);
}

function newGame() { dungeonLevel = 1; initLevel(false); state = 'play'; }

function addFloat(x, y, text, color) { floats.push({ x, y, text, color, life: 40 }); }

function doAttack(atk, def, isPlayer) {
  const dmg = Math.max(1, atk.atk - def.def + Math.floor(Math.random() * 3) - 1);
  def.hp -= dmg;
  addFloat(def.x, def.y, `-${dmg}`, isPlayer ? '#ff5252' : '#ff8a80');
  if (isPlayer) SFX.hit(); else SFX.hurt();
  if (def.hp <= 0) { def.hp = 0; def.alive = false; return true; }
  return false;
}

function pickupItems() {
  for (const item of items) {
    if (item.picked || item.x !== player.x || item.y !== player.y) continue;
    item.picked = true;
    SFX.pickup();
    if (item.type === 'weapon') {
      player.atk += item.atk;
      addFloat(player.x, player.y, `+${item.atk} ATK`, '#90caf9');
    } else if (item.type === 'armor') {
      player.def += item.def;
      addFloat(player.x, player.y, `+${item.def} DEF`, '#a1887f');
    } else {
      player.inventory.push(item);
      addFloat(player.x, player.y, item.name, '#ffeb3b');
    }
  }
}

function enemyTurns() {
  for (const e of entities) {
    if (!e.alive) continue;
    const action = e.takeTurn(player, map, entities);
    if (action?.type === 'attack' && doAttack(e, player, false)) {
      state = 'dead';
      SFX.death();
    }
  }
}

function processTurn() { pickupItems(); enemyTurns(); }

// --- Input ---
const MOVE = {
  ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
  w: [0,-1], s: [0,1], a: [-1,0], d: [1,0],
};
const queue = [], held = {};
document.addEventListener('keydown', e => {
  if (held[e.key]) return;
  held[e.key] = true;
  queue.push(e.key);
  e.preventDefault();
});
document.addEventListener('keyup', e => { held[e.key] = false; });

function handleInput() {
  if (state === 'start') {
    if (queue.some(k => k === 'Enter' || k === ' ')) { queue.length = 0; newGame(); }
    queue.length = 0;
    return;
  }
  if (state === 'dead') {
    if (queue.some(k => k === 'r')) { queue.length = 0; newGame(); }
    queue.length = 0;
    return;
  }
  while (queue.length) {
    const key = queue.shift();

    if (key === 'e') {
      const idx = player.inventory.findIndex(i => i.type === 'consumable');
      if (idx >= 0) {
        SFX.heal();
        addFloat(player.x, player.y, player.inventory[idx].use(player), '#4caf50');
        player.inventory.splice(idx, 1);
        processTurn();
      }
      return;
    }

    if (key === '>' || key === '.') {
      if (map.tiles[player.y][player.x] === TILE_STAIRS) {
        dungeonLevel++;
        SFX.stairs();
        initLevel(true);
        addFloat(player.x, player.y, `Floor ${dungeonLevel}`, '#ffcc00');
      }
      return;
    }

    const dir = MOVE[key];
    if (!dir) continue;
    const result = player.tryMove(dir[0], dir[1], map, entities);
    if (!result) continue;
    if (result.type === 'attack') {
      if (doAttack(player, result.target, true)) {
        SFX.kill();
        addFloat(result.target.x, result.target.y, 'KILL', '#ffeb3b');
        if (player.gainXp(result.target.xp)) {
          SFX.levelup();
          addFloat(player.x, player.y, 'LEVEL UP!', '#4fc3f7');
        }
      }
    }
    player.computeFov(map);
    processTurn();
    if (player.hp <= 0) { state = 'dead'; SFX.death(); }
    return;
  }
}

// --- Screens ---
function drawStartScreen() {
  const t = Date.now() / 1000;
  R.ctx.globalAlpha = Math.sin(t * 2) * 0.3 + 0.7;
  R.centeredText(canvas.height / 2 - 80, 'DUNGEON CRAWLER', '#4fc3f7', 36);
  R.ctx.globalAlpha = 1;
  R.centeredText(canvas.height / 2 - 20, 'A roguelike adventure', '#666', 16);
  const y0 = canvas.height / 2 + 20;
  R.centeredText(y0,      'WASD / Arrows — Move',    '#aaa', 14);
  R.centeredText(y0 + 22, 'Bump enemies to attack',  '#aaa', 14);
  R.centeredText(y0 + 44, 'E — Use potion',          '#aaa', 14);
  R.centeredText(y0 + 66, '. — Descend stairs',      '#aaa', 14);
  if (Math.sin(t * 3) > 0)
    R.centeredText(y0 + 110, 'Press ENTER to start', '#ffcc00', 18);
}

function drawDeathScreen() {
  R.ctx.fillStyle = 'rgba(0,0,0,0.75)';
  R.ctx.fillRect(0, 0, canvas.width, canvas.height);
  const mid = canvas.height / 2;
  R.centeredText(mid - 40, 'YOU DIED', '#ff5252', 36);
  R.centeredText(mid + 10, `Floor ${dungeonLevel}  Level ${player.level}`, '#aaa', 16);
  R.centeredText(mid + 35, `${entities.filter(e => !e.alive).length} kills`, '#aaa', 16);
  if (Math.sin(Date.now() / 300) > 0)
    R.centeredText(mid + 70, 'Press R to restart', '#ffcc00', 18);
}

function drawHud() {
  R.drawBar(10, 10, 200, 16, player.hp, player.maxHp, '#4caf50');
  R.text(15, 11, `HP: ${player.hp}/${player.maxHp}`, '#fff', 13);
  R.text(10, 32, `Lv ${player.level}  ATK:${player.atk} DEF:${player.def}  Floor ${dungeonLevel}`, '#aaa', 13);
  R.text(10, 50, `XP: ${player.xp}/${player.xpNext}`, '#aaa', 13);
  const potions = player.inventory.filter(i => i.type === 'consumable').length;
  if (potions) R.text(10, 68, `Potions: ${potions} [E]`, '#ef5350', 13);
  if (map.tiles[player.y][player.x] === TILE_STAIRS)
    R.centeredText(canvas.height - 40, 'Press . to descend', '#ffcc00', 16);
}

function drawFloats(cx, cy) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    if (--f.life <= 0) { floats.splice(i, 1); continue; }
    R.ctx.globalAlpha = f.life / 40;
    R.text(f.x * TILE - cx + 4, f.y * TILE - cy - (40 - f.life) * 0.8, f.text, f.color, 14);
    R.ctx.globalAlpha = 1;
  }
}

// --- Main loop ---
state = 'start';

function loop() {
  handleInput();
  R.clear();

  if (state === 'start') { drawStartScreen(); requestAnimationFrame(loop); return; }

  const cx = player.x * TILE - canvas.width / 2 + TILE / 2;
  const cy = player.y * TILE - canvas.height / 2 + TILE / 2;

  R.drawMap(map, cx, cy, player.fov, player.seen);

  for (const item of items)
    if (!item.picked && player.fov.has(item.y * map.width + item.x))
      R.drawEntity(item.x, item.y, item.color, cx, cy, item.glyph);

  for (const e of entities) {
    if (!e.alive || !player.fov.has(e.y * map.width + e.x)) continue;
    R.drawEntity(e.x, e.y, e.color, cx, cy, e.glyph);
    R.drawBar(e.x * TILE - cx + 2, e.y * TILE - cy - 6, TILE - 4, 4, e.hp, e.maxHp, '#ef5350');
  }

  R.drawEntity(player.x, player.y, '#4fc3f7', cx, cy, '@');
  drawFloats(cx, cy);
  drawHud();
  if (state === 'dead') drawDeathScreen();

  requestAnimationFrame(loop);
}
loop();


})();
