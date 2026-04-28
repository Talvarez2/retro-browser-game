import { generateMap } from './map.js';
import { Renderer, TILE } from './renderer.js';
import { Player } from './player.js';

const canvas = document.getElementById('game');
const R = new Renderer(canvas);

let map = generateMap();
let player = new Player(map.rooms[0].cx, map.rooms[0].cy);
player.computeFov(map);

// --- Input ---
const MOVE = {
  ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
  w: [0,-1], s: [0,1], a: [-1,0], d: [1,0],
};
const queue = [];
const held = {};
document.addEventListener('keydown', e => {
  if (held[e.key]) return;
  held[e.key] = true;
  queue.push(e.key);
  e.preventDefault();
});
document.addEventListener('keyup', e => { held[e.key] = false; });

function handleInput() {
  while (queue.length) {
    const key = queue.shift();
    const dir = MOVE[key];
    if (!dir) continue;
    const result = player.tryMove(dir[0], dir[1], map, []);
    if (result) { player.computeFov(map); return; }
  }
}

// --- Render ---
function loop() {
  handleInput();
  R.clear();
  const camX = player.x * TILE - canvas.width / 2 + TILE / 2;
  const camY = player.y * TILE - canvas.height / 2 + TILE / 2;
  R.drawMap(map, camX, camY, player.fov, player.seen);
  R.drawEntity(player.x, player.y, '#4fc3f7', camX, camY, '@');
  R.text(10, 10, `HP: ${player.hp}/${player.maxHp}`, '#4caf50', 14);
  requestAnimationFrame(loop);
}
loop();
