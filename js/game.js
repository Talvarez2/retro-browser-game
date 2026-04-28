import { generateMap } from './map.js';
import { Renderer, TILE } from './renderer.js';

const canvas = document.getElementById('game');
const R = new Renderer(canvas);
const map = generateMap();

// Temporary: show entire map with all tiles visible
const allVisible = new Set();
for (let y = 0; y < map.height; y++)
  for (let x = 0; x < map.width; x++)
    allVisible.add(y * map.width + x);

// Center camera on first room
const cam = { x: map.rooms[0].cx * TILE - canvas.width / 2, y: map.rooms[0].cy * TILE - canvas.height / 2 };

function loop() {
  R.clear();
  R.drawMap(map, cam.x, cam.y, allVisible, allVisible);
  R.text(10, 10, 'Dungeon generated — Step 1 complete', '#4fc3f7', 16);
  requestAnimationFrame(loop);
}
loop();
