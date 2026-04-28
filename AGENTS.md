# AGENTS.md

## Project Overview

Browser-based roguelike dungeon crawler. Vanilla JS + HTML5 Canvas, zero dependencies.

## Architecture

```
index.html          Entry point, loads canvas + game module
css/style.css       Dark theme, fullscreen canvas
js/game.js          Main loop, state machine (start/play/dead), input, rendering orchestration
js/renderer.js      Canvas drawing: tiles, entities, bars, text
js/map.js           Procedural dungeon generation (random rooms + L-shaped corridors)
js/player.js        Player entity: movement, FOV (raycasting), XP/leveling
js/entities.js      Enemy types, spawning, chase AI (axis-aligned only)
js/items.js         Item definitions, spawning, pickup/use
js/audio.js         Web Audio API sound effects (lazy AudioContext init)
```

## Key Conventions

- ES modules throughout, no bundler
- Tile-based: 32×32 pixel grid, map is 80×50 tiles
- Turn-based: each player action triggers one enemy turn
- FOV stored as `Set<number>` using key `y * mapWidth + x`
- Game state machine: `start` → `play` → `dead` → `play`
- AudioContext created lazily on first sound to comply with autoplay policy

## How to Run

Open `index.html` in a browser. No server needed (uses ES module imports via file://).
