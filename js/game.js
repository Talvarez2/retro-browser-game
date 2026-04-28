import { generateMap } from './map.js';
import { Renderer, TILE } from './renderer.js';
import { Player } from './player.js';
import { spawnEnemies } from './entities.js';

const canvas = document.getElementById('game');
const R = new Renderer(canvas);

let dungeonLevel = 1, map, player, entities, floats, state;

function initLevel(keepPlayer) {
  map = generateMap();
  entities = spawnEnemies(map.rooms, dungeonLevel);
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

function attack(atk, def, isPlayer) {
  const dmg = Math.max(1, atk.atk - def.def + Math.floor(Math.random() * 3) - 1);
  def.hp -= dmg;
  addFloat(def.x, def.y, `-${dmg}`, isPlayer ? '#ff5252' : '#ff8a80');
  if (def.hp <= 0) { def.hp = 0; def.alive = false; return true; }
  return false;
}

function enemyTurns() {
  for (const e of entities) {
    if (!e.alive) continue;
    const action = e.takeTurn(player, map, entities);
    if (action?.type === 'attack') {
      if (attack(e, player, false)) state = 'dead';
    }
  }
}

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
    const dir = MOVE[key];
    if (!dir) continue;
    const result = player.tryMove(dir[0], dir[1], map, entities);
    if (!result) continue;
    if (result.type === 'attack') {
      const killed = attack(player, result.target, true);
      if (killed) {
        addFloat(result.target.x, result.target.y, 'KILL', '#ffeb3b');
        if (player.gainXp(result.target.xp)) addFloat(player.x, player.y, 'LEVEL UP!', '#4fc3f7');
      }
    }
    player.computeFov(map);
    enemyTurns();
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

function loop() {
  handleInput();
  R.clear();

  const cx = player.x * TILE - canvas.width / 2 + TILE / 2;
  const cy = player.y * TILE - canvas.height / 2 + TILE / 2;

  R.drawMap(map, cx, cy, player.fov, player.seen);

  for (const e of entities) {
    if (!e.alive || !player.fov.has(e.y * map.width + e.x)) continue;
    R.drawEntity(e.x, e.y, e.color, cx, cy, e.glyph);
    R.drawBar(e.x * TILE - cx + 2, e.y * TILE - cy - 6, TILE - 4, 4, e.hp, e.maxHp, '#ef5350');
  }

  R.drawEntity(player.x, player.y, '#4fc3f7', cx, cy, '@');
  drawFloats(cx, cy);

  // HUD
  R.drawBar(10, 10, 200, 16, player.hp, player.maxHp, '#4caf50');
  R.text(15, 11, `HP: ${player.hp}/${player.maxHp}`, '#fff', 13);
  R.text(10, 32, `Lv ${player.level}  ATK:${player.atk} DEF:${player.def}`, '#aaa', 13);

  if (state === 'dead') {
    R.ctx.fillStyle = 'rgba(0,0,0,0.75)';
    R.ctx.fillRect(0, 0, canvas.width, canvas.height);
    R.centeredText(canvas.height / 2 - 40, 'YOU DIED', '#ff5252', 36);
    R.centeredText(canvas.height / 2 + 10, `Floor ${dungeonLevel}  Level ${player.level}`, '#aaa', 16);
    if (Math.sin(Date.now() / 300) > 0)
      R.centeredText(canvas.height / 2 + 50, 'Press R to restart', '#ffcc00', 18);
  }

  requestAnimationFrame(loop);
}
loop();
