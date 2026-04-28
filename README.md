# Dungeon Crawler

A browser-based roguelike dungeon crawler built with vanilla JavaScript and HTML5 Canvas.

![Dungeon Crawler](https://img.shields.io/badge/game-roguelike-blue)

## Play

Open `index.html` in any modern browser. No build step or server required.

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow keys | Move (grid-based, turn-based) |
| Bump into enemy | Attack |
| E | Use health potion |
| . | Descend stairs |
| R | Restart (on death screen) |

## Features

- Procedural dungeon generation with rooms and corridors
- Field of vision with fog of war and memory
- 5 enemy types (slime, bat, skeleton, orc, dragon) that scale with depth
- Turn-based bump-to-attack combat with floating damage numbers
- Items: health potions, weapons, armor
- Multiple dungeon floors via stairs
- HUD with health bar, stats, XP, inventory
- Start screen and death screen with kill stats
- Sound effects via Web Audio API
- Camera follows player

## Tech

- Vanilla JavaScript (ES modules)
- HTML5 Canvas (32×32 tile grid)
- CSS dark theme
- Web Audio API for sound
- Zero dependencies
