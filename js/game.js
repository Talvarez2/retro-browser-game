import { generateMap, TILE_STAIRS } from './map.js';
import { Renderer, TILE } from './renderer.js';
import { Player } from './player.js';
import { spawnEnemies } from './entities.js';
import { spawnItems } from './items.js';

const canvas = document.getElementById('game');
const R = new Renderer(canvas);

let dungeonLevel = 1, map, player, entities, items, floats, state;

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
  state = 'play';
}
initLevel(false);

function addFloat(x, y, text, color) { floats.push({ x, y, text, color, life: 40 }); }

function doAttack(atk, def, isPlayer) {
  const dmg = Math.max(1, atk.atk - def.def + Math.floor(Math.random() * 3) - 1);
  def.hp -= dmg;
  addFloat(def.x, def.y, `-${dmg}`, isPlayer ? '#ff5252' : '#ff8a80');
  if (def.hp <= 0) { def.hp = 0; def.alive = false; return true; }
  return false;
}

function pickupItems() {
  for (const item of items) {
    if (item.picked || item.x !== player.x || item.y !== player.y) continue;
    item.picked = true;
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
    if (action?.type === 'attack' && doAttack(e, player, false)) state = 'dead';
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
  if (state === 'dead') {
    if (queue.some(k => k === 'r')) { queue.length = 0; dungeonLevel = 1; initLevel(false); }
    queue.length = 0;
    return;
  }
  while (queue.length) {
    const key = queue.shift();

    // Use potion
    if (key === 'e') {
      const idx = player.inventory.findIndex(i => i.type === 'consumable');
      if (idx >= 0) {
        addFloat(player.x, player.y, player.inventory[idx].use(player), '#4caf50');
        player.inventory.splice(idx, 1);
        processTurn();
      }
      return;
    }

    // Descend stairs
    if (key === '>' || key === '.') {
      if (map.tiles[player.y][player.x] === TILE_STAIRS) {
        dungeonLevel++;
        initLevel(true);
        addFloat(player.x, player.y, `Floor ${dungeonLevel}`, '#ffcc00');
      }
      return;
    }

    // Movement / bump attack
    const dir = MOVE[key];
    if (!dir) continue;
    const result = player.tryMove(dir[0], dir[1], map, entities);
    if (!result) continue;
    if (result.type === 'attack') {
      if (doAttack(player, result.target, true)) {
        addFloat(result.target.x, result.target.y, 'KILL', '#ffeb3b');
        if (player.gainXp(result.target.xp)) addFloat(player.x, player.y, 'LEVEL UP!', '#4fc3f7');
      }
    }
    player.computeFov(map);
    processTurn();
    if (player.hp <= 0) state = 'dead';
    return;
  }
}

// --- Render ---
function drawFloats(cx, cy) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    if (--f.life <= 0) { floats.splice(i, 1); continue; }
    R.ctx.globalAlpha = f.life / 40;
    R.text(f.x * TILE - cx + 4, f.y * TILE - cy - (40 - f.life) * 0.8, f.text, f.color, 14);
    R.ctx.globalAlpha = 1;
  }
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

function loop() {
  handleInput();
  R.clear();

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

  if (state === 'dead') {
    R.ctx.fillStyle = 'rgba(0,0,0,0.75)';
    R.ctx.fillRect(0, 0, canvas.width, canvas.height);
    const mid = canvas.height / 2;
    R.centeredText(mid - 40, 'YOU DIED', '#ff5252', 36);
    R.centeredText(mid + 10, `Floor ${dungeonLevel}  Level ${player.level}`, '#aaa', 16);
    R.centeredText(mid + 35, `${entities.filter(e => !e.alive).length} kills`, '#aaa', 16);
    if (Math.sin(Date.now() / 300) > 0)
      R.centeredText(mid + 70, 'Press R to restart', '#ffcc00', 18);
  }

  requestAnimationFrame(loop);
}
loop();
