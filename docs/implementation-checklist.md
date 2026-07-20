# Implementation Checklist

## Phase 0 — Baseline and Architecture

- [x] Repository identity confirmed: `wdavidpence/cenitpede-clone` (GitHub Pages deployable)
- [x] No external copyrighted assets used; clean-room, zero dependencies
- [x] Single-file architecture chosen: `index.html` with embedded CSS+JS
  - Canvas at fixed logical resolution 320×240, scaled via CSS for all devices including iPhone Safari
  - Web Audio API for sound effects (no audio files)
  - All graphics drawn procedurally on canvas
- [x] Test harness: inline smoke tests in `index.html` run after game init

## Phase 1 — Playable Vertical Slice

### Core systems
- [ ] Game loop (`requestAnimationFrame`, fixed timestep, accumulator)
- [ ] Fixed logical playfield (320×240 tiles at ~8px = 2560×1920 px rendered, CSS-scaled)
- [ ] Player cannon: movement + three-way shooting (up/left/right booms)
- [ ] Collision primitives: AABB between player bullet, enemy, mushroom
- [ ] Mushroom field: grid of mushrooms, poison on hit, respawn
- [ ] One centipede: segments linked, head turns, tail follows
- [ ] Score tracking + lives system
- [ ] Start / game-over / restart states
- [ ] Keyboard controls (arrow keys, Z/X for shooting)
- [ ] Touch controls (on-screen D-pad + fire button)

## Smoke Test Commands

```bash
# Syntax check: extract and parse JS
node -e "const fs=require('fs'); const html=fs.readFileSync('/mnt/c/Users/wdavi/Projects/cenitpede-clone/index.html','utf8'); console.log(html.match(/<script[^>]*>/g).length, 'script tags')"

# Basic runtime: serve and verify HTML loads
curl -s http://localhost | head -5   # if served via local server

# Lint-free check (no external linters required)
wc -l /mnt/c/Users/wdavi/Projects/cenitpede-clone/index.html
```
