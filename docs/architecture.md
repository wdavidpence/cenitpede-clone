# Architecture — Single-file HTML5 Centipede

## Layout Strategy
- Canvas at fixed 320×240 logical resolution, rendered pixel-for-pixel. CSS scales it to fill the viewport with `aspect-ratio` preservation and touch-action: none to prevent scroll/zoom on iPhone Safari.
- Logical tile size = ~8px; playfield is 320 tiles wide × 240 tall → 2560×1920 px internal resolution, scaled down by CSS for display.
- Safe-area insets (iPhone notch/home indicator) handled via padding.

## Rendering Pipeline
1. Clear canvas to black
2. Draw playfield grid lines (subtle)
3. Spawn/move all entities (mushrooms, centipede segments, player bullets, player cannon)
4. Draw collision effects (hits, explosions — minimal particle burst)
5. Draw HUD: score, lives, wave
6. Swap buffers via `requestAnimationFrame`

## Entities
- **Player**: x, y fixed on bottom edge; shoots three booms at once from the base
- **Mushroom**: grid spawn positions; when hit by bullet → poison (turn red), player takes damage if touching poisoned mushroom; respawns after delay
- **Centipede**: N segments linked by position. Head moves forward, turns randomly after wall hit or time elapsed. Each segment follows its predecessor with a lag offset.
- **Bullet**: straight-line projectile from cannon tip

## Collision System (AABB)
All entities have an 8×8 hitbox (1 tile). Bullet vs mushroom = kill both. Bullet vs centipede head = kill all segments + score. Centipede vs player = lose life. Poisoned mushroom vs player = lose life.

## Audio (Web Audio API, synthesized only)
- Boom sound: short noise burst with decay envelope
- Mushroom hit: sine sweep up then down
- Player damage: low-frequency sawtooth blip
- Game over: descending tone sequence

## State Machine
- `START` → click/tap → `PLAYING`
- `PLAYING` + lives=0 → `GAMEOVER`
- `GAMEOVER` → tap → `START` (restart)
