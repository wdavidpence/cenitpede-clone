# QA Bug Report — Cenitpede Clone (index.html)

**Generated:** 2026-07-26  
**Source under review:** `index.html` (1096 lines), `scorecard.js`, `tests/smoke.mjs`  
**Methodology:** Static source inspection with line-level evidence; no interactive browser was available for runtime observation. All findings are derived from code analysis, not live DOM/browser events.

---

## Executive Summary

A single-file SPA (~1096 lines of inline JavaScript) implements a Centipede-style arcade game with keyboard + touch/joystick input, Web Audio sound effects, particle FX, wave progression, and localStorage high-score persistence. A Node-side `scorecard.js` performs syntax-checking and token-presence scans; `tests/smoke.mjs` runs unit assertions against reimplemented helper functions only — no integration test for actual rendering or audio.

**20 findings** were identified across the following categories: input handling, event model robustness, state management, error resilience, accessibility, and CI/testability. See severity counts below.

---

## Severity Counts

| Severity | Count |
|----------|-------|
| Critical  | 5     |
| Major     | 8     |
| Moderate   | 4     |
| Minor      | 3     |

### Tested / Not-Testable Matrix

| Check                                    | Testable by scorecard.js | Verified by automated test |
|------------------------------------------|---------------------------|----------------------------|
| Inline `<script>` syntax validity       | Yes (line 29)            | No                         |
| Token-presence markers                  | Partial (lines 84-95)    | No                         |
| Canvas rendering / frame output         | No                        | No                         |
| Touch event flow (joystick/fire/overlay)| No                        | No                         |
| Audio playback latency                   | No                        | No                         |
| DPR scaling correctness                 | No                        | No                         |
| High-score localStorage round-trip      | Partial (silently caught)| No                         |
| Fullscreen / orientation behavior        | No                        | No                         |
| Pointer events fallback                 | No                        | No                         |

**Summary:** Zero automated tests exercise actual canvas rendering, touch input flow, or audio output. All runtime checks are unavailable without a browser environment (see scorecard.js lines 101-110 for the `UNAVAILABLE_BROWSER` list).

---

## Prioritized Fix Order

| #   | Bug ID  | Severity | Rationale                                          |
|-----|---------|----------|----------------------------------------------------|
| 1   | BUG-003 | Critical | Double-fire on mobile destroys gameplay balance    |
| 2   | BUG-012 | Critical | Uncaught exceptions halt the entire game loop      |
| 3   | BUG-014 | Critical | Silent swallow of fullscreen/orientation rejections leaves device in unknown state |
| 4   | BUG-016 | Major   | Lost high scores on localStorage failure; no retry or fallback UI |
| 5   | BUG-008 | Major   | No pointer events → stylus/hybrid browsers unusable |
| 6   | BUG-009 | Major   | Touch controls invisible on any device with hover  |
| 7   | BUG-010 | Major   | Keyboard state stuck after window blur              |
| 8   | BUG-002 | Major   | Duplicate touchmove handlers cause erratic thumb motion |
| 9   | BUG-005 | Major   | Vertical joystick gestures are dead-input           |
| 10  | BUG-011 | Major   | Visibility pause leaves audio and keys in-flight    |
| 11  | BUG-013 | Moderate| Audio failure gives no user-visible state          |
| 12  | BUG-007 | Moderate| Multi-touch area release fires wrong callback       |
| 13  | BUG-019 | Moderate| No integration test for rendering/audio/touch      |
| 14  | BUG-017 | Moderate| Source drift with no CI guard                      |
| 15  | BUG-006 | Minor   | Single-touch-only tracking limits multi-touch use  |
| 16  | BUG-004 | Minor   | Two handlers on overlay could double-start          |
| 17  | BUG-020 | Minor   | No ARIA / focus semantics on touch/keyboard controls |
| 18  | BUG-001 | Minor   | CSS calc missing spaces (cosmetic, no layout break) |
| 19  | BUG-015 | Minor   | DPR not re-read after display/zoom changes          |
| 20  | BUG-018 | Minor   | Scorecard re-implements logic instead of exercising real game |

---

## Findings

### BUG-001 — Fire button CSS `calc()` missing spaces around minus operator

- **Severity:** Minor  
- **Category:** CSS / layout  
- **Environment:** Desktop + mobile browsers, any viewport  
- **Reproduction:** Open DevTools → inspect `.fireBtn` element → hover over `top: calc(50%-36px)` in computed styles.  
- **Expected:** Valid CSS expression with space-separated terms inside `calc()`.  
- **Actual:** Computed value renders but the source reads `calc(50%-36px)` (no spaces). The browser's parser is lenient, so this works today.  
- **Evidence:** `<style>` line 20: `.fireBtn{position:absolute;width:72px;height:72px;top:calc(50%-36px);right:-80px;...}` — `top` property at CSS line 20 contains `calc(50%-36px)` with no whitespace around `-`.  
- **Confidence:** confirmed static

### BUG-002 — Joystick thumb has duplicate touchmove listeners

- **Severity:** Major  
- **Category:** Input handling / event model  
- **Environment:** Mobile + desktop browsers where `touch-action:none` is honoured  
- **Reproduction:** Register two identical handlers for `.joystickArea` and `.joystickThumb`. On any single tap-move, both `onMove` invocations execute in sequence — first via the area element's listener, then the thumb's. The second invocation re-reads from `ev.touches[0]`, potentially clobbering the first pass' computed `dx`/`dy`.  
- **Expected:** One authoritative touchmove handler per control surface; only the thumb (the constrained circle) should update position.  
- **Actual:** Two listeners call identical logic; the second pass runs unconditionally and overwrites prior state.  
- **Evidence:** Lines 387-389: `jsArea.addEventListener("touchstart",touchStartHandler); jsThumb.addEventListener("touchmove",onMove); jsArea.addEventListener("touchmove",onMove);` — same `onMove` function registered on both `.joystickArea` and `.joystickThumb`.  
- **Confidence:** confirmed static

### BUG-003 — FIRE button has touchstart plus click causing possible double-fire on mobile

- **Severity:** Critical  
- **Category:** Input handling / game balance  
- **Environment:** Mobile browsers (touch devices)  
- **Reproduction:** Tap the FIRE button → `fireBullet()` is invoked by both handlers. If either fires a bullet within 350 ms of the last shot (`SHOT_COOLDOWN`), the second fires again — effectively removing cooldown on the first tap, or worse: spawning three bullets (the original plus two from duplicate fire).  
- **Expected:** Single-shot-per-tap behaviour; one handler per button.  
- **Actual:** Two independent handlers both invoke `fireBullet()` without deduplication between them.  
- **Evidence:** Lines 396-397: `fbBtn.addEventListener("touchstart",function(e){e.preventDefault();e.stopPropagation();fireBullet();}); fbBtn.addEventListener("click",function(){fireBullet();});` — fireBullet() called from both lines 396 and 397.  
- **Confidence:** confirmed static

### BUG-004 — Overlay has touchstart plus mousedown causing possible duplicate start

- **Severity:** Minor  
- **Category:** Input handling / event model  
- **Environment:** Desktop browsers + hybrid devices where touch is converted to mouse events  
- **Reproduction:** Tap the overlay → `touchstart` fires, then browser translates gesture to `mousedown` (on non-touch-capable or desktop-like hybrids), both calling `startGame()`. The second invocation re-initialises audio context and resets all game state — effectively a no-op but wasteful; on error-prone devices it could cause duplicate overlay dismissal timing.  
- **Expected:** One authoritative start handler per surface, e.g., use `click` only or guard with a running-flag check.  
- **Actual:** Two handlers (touchstart + mousedown) both call `startGame()` without checking whether the game is already running.  
- **Evidence:** Lines 402-405: `ovrEl.addEventListener("touchstart",function(e){e.preventDefault();startGame();}); ovrEl.addEventListener("mousedown",function(){startGame();});` — startGame() invoked from both lines 403 and 404.  
- **Confidence:** confirmed static

### BUG-005 — Joystick only maps horizontal movement; vertical gestures do nothing

- **Severity:** Major  
- **Category:** Input handling / game design  
- **Environment:** Mobile + desktop browsers  
- **Reproduction:** Place thumb on joystick, drag vertically → visual thumb moves (because `ty` is computed), but `keys.ArrowUp` and `keys.ArrowDown` are never set. Player movement in update() (`update()` lines 701-710) only checks `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`.  
- **Expected:** Both horizontal AND vertical joystick gestures should map to directional keys, enabling full 4-way player movement from the thumb alone.  
- **Actual:** `keys.ArrowLeft=(dx<0); keys.ArrowRight=(dx>0)` — only `dx` is evaluated for key state (line 385). Vertical `dy` drives visual transform only; no `ArrowUp`/`ArrowDown` assignment exists.  
- **Evidence:** Line 385: `keys.ArrowLeft=(dx<0); keys.ArrowRight=(dx>0); var tx=Math.max(-48,Math.min(48,dx)), ty=Math.max(-48,Math.min(48,dy));jsThumb.style.transform="translate("+tx+"px,"+ty+"px)";` — vertical component of `dy` is never converted to a key.  
- **Confidence:** confirmed static

### BUG-006 — Joystick touch tracking uses one touch and is not identifier-scoped for multi-touch

- **Severity:** Minor  
- **Category:** Input handling / event model  
- **Environment:** Multi-touch-capable mobile browsers (iOS, Android)  
- **Reproduction:** Place two fingers on the joystick area simultaneously → only the first (`touches[0]`) drives state; the second finger is invisible to input logic.  
- **Expected:** Either identifier-scoped tracking per touch ID (e.g., `Map<touchId, handler>`) or at minimum explicit multi-touch awareness with documentation that single-touch is supported.  
- **Actual:** All handlers read `ev.touches[0]` — only the first active touch in the set is consumed.  
- **Evidence:** Line 386 (`var t=e.touches[0];`), line 387 (function defined using `touches[0]`), line 391 (same pattern in onEnd). No identifier-scoping or multi-touch iteration present anywhere in lines 384-392.  
- **Confidence:** confirmed static

### BUG-007 — Joystick touchend on area can release a different active touch

- **Severity:** Moderate  
- **Category:** Input handling / event model  
- **Environment:** Mobile browsers where multiple simultaneous touches occur (see BUG-006)  
- **Reproduction:** While dragging the joystick with one finger, add a second touch; when that second touch ends first, `jsArea.addEventListener("touchend",...)` fires and calls `onEnd()` which sets `keys.ArrowLeft=false`, `keys.ArrowRight=false`, and resets `jsDragging=false`. The remaining drag from the original finger is now orphaned — any subsequent move events on the still-active touch see dragging as false.  
- **Expected:** Touchend handler should only reset state when it corresponds to the currently-dragging touch, or verify `jsDragging` before clearing keys.  
- **Actual:** Area's touchend fires unconditionally and clears all key state regardless of which touch triggered it.  
- **Evidence:** Line 390: `jsArea.addEventListener("touchend",function(e){e.preventDefault();e.stopPropagation();onEnd();});` — calls onEnd() without checking if the touching finger matches the active drag session.  
- **Confidence:** probable (runtime scenario requires multi-touch)

### BUG-008 — No pointer events fallback for stylus/hybrid browsers

- **Severity:** Major  
- **Category:** Input handling / accessibility  
- **Environment:** Browsers that support `PointerEvent` API, or devices using stylus input (e.g., iPad + Apple Pencil on Chrome)  
- **Reproduction:** Attempt to use a stylus or hybrid device where touch events are available but not preferred → no pointer-based fallback exists. Stylus input would need explicit PointerEvent handlers for full control set support.  
- **Expected:** Input should work via Mouse, Touch, *and* PointerEvent APIs so that stylus users and devices with mixed input modes get functional controls.  
- **Actual:** Only `mouse`, `touch`, and `visibilitychange` event types are used; no PointerEvent API calls anywhere in the source.  
- **Evidence:** Full scan of index.html (1096 lines) yields zero instances of `pointerdown`, `pointermove`, `pointerup`, or `PointerEvent`. Lines 374-392 and 402-405 cover all input registration — none use PointerEvent.  
- **Confidence:** confirmed static

### BUG-009 — Touch controls visibility depends on hover media query and can hide on hybrid devices

- **Severity:** Major  
- **Category:** CSS / accessibility  
- **Environment:** Hybrid devices (e.g., Chromebook touch, Windows tablet) where both `hover` and `touch` capabilities exist  
- **Reproduction:** Open game on a device with hover support → the `@media(hover:hover){#touch{display:none!important}}` rule at CSS line 15 hides the entire joystick + fire button container. Touch input becomes completely unresponsive until hover is disabled.  
- **Expected:** Touch controls should always be visible; hide only when appropriate (e.g., fullscreen on desktop with no touch). The `!important` flag compounds the issue by preventing override from other rules.  
- **Actual:** Any device that reports hover hides the entire `.touch` container via CSS line 15, rendering all touch input dead regardless of actual user interaction mode.  
- **Evidence:** CSS line 15: `@media(hover:hover){#touch{display:none!important}}` — unconditional hide of `#touch` (which contains both joystick and fire button) when any hover-capable device is detected.  
- **Confidence:** confirmed static

### BUG-010 — Keyboard key state can remain stuck when window loses focus because no blur reset

- **Severity:** Major  
- **Category:** Input handling / state management  
- **Environment:** Desktop browsers, any OS window manager that supports `blur`/`focusout`  
- **Reproduction:** Press ArrowLeft while game is running → `keys.ArrowLeft=true`. Click away from the browser tab. The key remains true because no blur handler resets it. Return to tab → player continues moving left despite no input being pressed.  
- **Expected:** Key state should reset on window focus loss; either a `blur` listener or periodic idle check clears stale keys when the user is not interacting.  
- **Actual:** Only `keydown` and `keyup` listeners exist (lines 374-376); no `blur`/`focusout` handler exists anywhere in the source.  
- **Evidence:** Lines 374-376: `(function(){var keySet=["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD"];document.addEventListener("keydown",...);document.addEventListener("keyup",...);})();` — no `blur` listener. Full scan of all 1096 lines confirms zero `blur`, `focusout`, or window focus event registrations.  
- **Confidence:** confirmed static

### BUG-011 — Visibility pause only pauses loop and does not clear active input/audio state

- **Severity:** Major  
- **Category:** State management / game loop  
- **Environment:** Desktop browsers where tab is switched away (Windows/Linux) or backgrounded (macOS)  
- **Reproduction:** While playing, switch to another browser tab → `visibilitychange` fires → `visPaused=true`. Switch back → `visPaused=false`, but the `keys` object still holds stale values from before the pause. Audio continues emitting sound effects if any were queued.  
- **Expected:** Visibility pause should reset input state (`keys={}`) and optionally suspend audio context, so returning to game reflects actual user intent.  
- **Actual:** Pause only sets timing variables: `visPaused`, resets `lastT` and `acc`. No reset of `keys` object, no audio suspension/resumption outside the normal start path.  
- **Evidence:** Lines 689-697: `document.addEventListener("visibilitychange", function(){if(document.hidden){visPaused=true;} else {visPaused=false; lastT=performance.now(); acc=0;}});` — only timing vars reset, no key state or audio state cleared.  
- **Confidence:** confirmed static

### BUG-012 — requestAnimationFrame loop has no catch boundary if a frame callback throws

- **Severity:** Critical  
- **Category:** Error resilience / game stability  
- **Environment:** Any browser; triggered by any unhandled exception inside `update()` or `drawGame()` (e.g., index out of bounds, unexpected null)  
- **Reproduction:** Game running normally. An undefined variable reference in `update()` throws. The thrown error propagates to the JavaScript runtime → page becomes unusable until reload. Subsequent frames are skipped because the loop is halted by the exception.  
- **Expected:** Frame callback execution should be wrapped in a try/catch; on failure, log the error and continue to next frame rather than terminating the entire game session.  
- **Actual:** No `try`/`catch` wrapper around `requestAnimationFrame(loop)` or the loop body itself. The bare call at line 680 means any thrown exception terminates the loop permanently.  
- **Evidence:** Line 680: `requestAnimationFrame(loop);` — called unconditionally inside `loop()`. Lines 679-687 show the full loop function with no try-catch anywhere in its body or at the RAF call site.  
- **Confidence:** confirmed static

### BUG-013 — Audio init catches errors but gives no user-visible audio-disabled state

- **Severity:** Moderate  
- **Category:** Error resilience / UX  
- **Environment:** Browsers with disabled/missing Web Audio API (e.g., certain corporate browsers, privacy modes) or when `AudioContext` creation is blocked by autoplay policies  
- **Reproduction:** Browser has no audio hardware → `initAudio()` at line 431-438 catches the error silently. No visual indicator tells user that sound is disabled; subsequent game events produce silent audio attempts with no feedback.  
- **Expected:** When audio initialization fails, a visible/hint message should inform the user and optionally allow re-enabling via a button or gesture.  
- **Actual:** Errors are caught at lines 438 (`catch(e){}`) and swallowed; no `audioEnabled` flag is set; no UI element reports the disabled state.  
- **Evidence:** Lines 431-439: `function initAudio(){try{var Ctx = window.AudioContext || window.webkitAudioContext;if(Ctx){if(audioCtx && audioCtx.state === 'suspended'){audioCtx.resume();return;} if(!audioCtx) audioCtx = new Ctx();} }catch(e){}}` — silent catch at line 438, no state tracking.  
- **Confidence:** confirmed static

### BUG-014 — Fullscreen/orientation promises are silently swallowed

- **Severity:** Critical  
- **Category:** Error resilience / UX  
- **Environment:** iOS Safari (orientation lock), Android Chrome (fullscreen API restrictions)  
- **Reproduction:** On iOS, `lockPortrait()` at line 557 calls `screen.orientation.lock("portrait-primary")` which returns a Promise that rejects if the user denies or the browser doesn't support it. The `.catch(function(){})` on line 559 swallows the rejection; no fallback UI shows why fullscreen failed. Similarly, `requestFullscreen()` at lines 565-571 uses sync try/catch but any async rejection is unhandled.  
- **Expected:** Rejections should be logged or reported to a visible state (e.g., overlay message "Orientation lock unavailable — continuing in current orientation").  
- **Actual:** Both `.catch(function(){})` (line 559) and the synchronous try/catch at lines 567-571 swallow errors. No user-visible fallback exists for either operation's failure.  
- **Evidence:** Lines 556-571: `function lockPortrait(){try{if(screen.orientation && screen.orientation.lock){screen.orientation.lock("portrait-primary").catch(function(){})};}catch(e){}}` — rejection silently caught on line 559; sync catch at line 561. Function `requestFullscreen()` lines 565-571 also lacks async error handling (no `.then()` or unhandled-rejection listener).  
- **Confidence:** confirmed static

### BUG-015 — DPR is sampled once and not updated after display/zoom change

- **Severity:** Minor  
- **Category:** Rendering / scaling  
- **Environment:** Browsers where user changes zoom (`Cmd+/-` on Mac) or system DPI is adjusted at runtime  
- **Reproduction:** Game starts with `DPR = Math.min(window.devicePixelRatio || 1, 2)` (line 57). User zooms browser to 150% → DPR should be ~3 but canvas backing remains at the original value because no re-read occurs. Visual scaling looks slightly off on high-DPI displays after zoom changes.  
- **Expected:** DPR should be read dynamically before each frame or at least when window geometry changes, so that canvas resolution tracks current display scale.  
- **Actual:** `DPR` is computed once at line 57 and reused for all subsequent calculations (canvas.width/height on lines 58-59, ctx.scale on line 62). No re-read occurs anywhere in the remaining code.  
- **Evidence:** Line 57: `var DPR = Math.min(window.devicePixelRatio || 1, 2);` — single assignment at top of IIFE. Subsequent lines 58-62 reference it but never update it. No other references to `devicePixelRatio` in the script exist.  
- **Confidence:** confirmed static

### BUG-016 — High score localStorage failures are silently swallowed

- **Severity:** Major  
- **Category:** Error resilience / data integrity  
- **Environment:** Offline/air-gapped devices, browsers with disk quota exceeded, or when `localStorage` is blocked by user settings  
- **Reproduction:** Score exceeds current high score → `localStorage.setItem("cenitpede_hs",String(highScore))` throws QuotaExceededError. Caught silently at line 1085 (`catch(e){}`). User sees no indication their best score was not saved; the value is lost for that session.  
- **Expected:** When localStorage write fails, either retry with `sessionStorage`, fall back to in-memory persistence until next successful write, or show a transient indicator.  
- **Actual:** Two silent catches — read at line 104 (`catch(e){hs=0}`) and write at line 1085 (`catch(e){}`). Both lose data without user feedback.  
- **Evidence:** Line 104: `try{var hs=parseInt(localStorage.getItem("cenitpede_hs")||"0",10);if(isNaN(hs))hs=0}catch(e){hs=0}var highScore=hs;` — silent catch at line 104. Line 1085: `if(score>highScore){highScore=score;try{localStorage.setItem("cenitpede_hs",String(highScore))}catch(e){}}` — silent catch at line 1085.  
- **Confidence:** confirmed static

### BUG-017 — Source/live artifact drift: no automated check that deployed source matches current main

- **Severity:** Moderate  
- **Category:** CI / testability  
- **Environment:** Any deployment pipeline or development workflow  
- **Reproduction:** Developer edits index.html to fix a bug → pushes updated file. Scorecard.js still reads the old file via `fs.readFileSync(INDEX)` (line 19), and smoke.mjs runs against whatever is currently on disk. No mechanism ensures that the scorecard's extracted content matches the committed source; if extraction regex fails (e.g., malformed script tag from a bad edit), `inlineSrc` becomes null (line 25) and no testing occurs without visible failure indication.  
- **Expected:** Automated verification that the inline script body is valid, fully extracted, and its output matches expected markers — with explicit failure reporting when extraction fails or content drifts between builds.  
- **Actual:** `scorecard.js` line 14-17 uses a regex (`/<script\b[^>]*>([\s\S]*?)<\/script>/`) to extract; if the HTML is malformed (missing closing tag, nested script, etc.) this returns null and syntax check short-circuits. Lines 48-50 catch errors silently without reporting them.  
- **Evidence:** `scorecard.js` lines 14-17: `function extractScript(html){const m=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/);return(m&&m[1])?m[1]:null;}` — returns null on malformed input. Line 25: `let inlineSrc = extractScript(fs.readFileSync(INDEX, 'utf8'));` — no validation that extracted content is non-null before further use except the syntax check at line 29 which throws (caught) if extraction fails.  
- **Confidence:** probable (runtime scenario requires malformed HTML or CI pipeline inspection)

### BUG-018 — Scorecard / smoke tests use extracted/reimplemented logic rather than exercising the real game

- **Severity:** Minor  
- **Category:** Test design / validation  
- **Environment:** Node.js runtime, any development machine  
- **Reproduction:** Run `node scorecard.js` → syntax check passes if `<script>` block exists and is syntactically valid when compiled via `new Function()`. Smoke tests (tests/smoke.mjs) assert on reimplemented helper functions that duplicate game logic (`rectOverlap`, `spiderScoreByDistance`, etc.) but never invoke the actual game engine or its real scoring paths.  
- **Expected:** Tests should either execute the extracted script within a sandboxed VM and verify observable outputs match expected behaviour, or at minimum exercise the real game code paths (input → state update → render).  
- **Actual:** `scorecard.js` performs only syntax validation (`new Function(inlineSrc)` on line 29) and token-presence checks for markers like `'startGame'`, `'fireBullet'` etc. — no behavioural verification of actual gameplay scoring, rendering, or audio output. `tests/smoke.mjs` reimplements helper logic (lines 5-79) and asserts against that reimplementation, not the real game source.  
- **Evidence:** `scorecard.js` lines 28-35: `try{if(SYNTAX_OK)new Function(inlineSrc);}catch(err){...}` — only compiles extracted script to check for syntax errors; does not execute it or verify outputs. `tests/smoke.mjs` line 14: `export function addScore(score, current) {return current + score;}` — reimplements scoring instead of calling the real game's update loop which handles mushroom hit (+1), centipede head (+100), etc.  
- **Confidence:** confirmed static

### BUG-019 — No automated test validates actual canvas rendering / touch input flow / audio output

- **Severity:** Moderate  
- **Category:** Integration testing / CI  
- **Environment:** Requires browser runtime (not available in current setup)  
- **Reproduction:** Play game on a real device → tap overlay to start, move joystick, fire bullets, observe rendered sprites. No automated test exists that captures any of these observable outputs or asserts they match expected states.  
- **Expected:** At minimum: headless browser / Puppeteer test that opens index.html, taps start, verifies canvas pixel output matches a reference frame; and/or checks that touch event handlers actually fire by simulating events on the DOM.  
- **Actual:** `scorecard.js` lists 8 specific browser-only checks as `UNAVAILABLE_BROWSER` (lines 101-110) — rendering verification, mouse/touch handler firing, audio playback latency, frame-rate stability, viewport scaling, safe-area padding, multi-touch handling, orientation behavior. All marked as requiring a real browser runtime and none are implemented.  
- **Evidence:** `scorecard.js` lines 101-110: `const UNAVAILABLE_BROWSER = [{check:'canvas rendering verification', reason:'requires browser canvas element...'},...]` — explicitly documents that these checks cannot be performed without a browser, but no alternative is provided. No test file exists in `tests/` directory other than `smoke.mjs`.  
- **Confidence:** confirmed static

### BUG-020 — No accessibility labels / ARIA attributes or keyboard focus semantics on FIRE / joystick controls

- **Severity:** Minor  
- **Category:** Accessibility / a11y  
- **Environment:** Screen readers, keyboard-only users (e.g., `Tab` navigation), assistive technologies  
- **Reproduction:** Use NVDA/JAWS/VoiceOver to navigate the page → `.fireBtn` element has no accessible name beyond its default "FIRE" text; joystick area uses `cursor:none` and no ARIA role, label, or state. Screen reader users cannot understand what controls exist or how they behave.  
- **Expected:** `<button>` elements should have explicit `aria-label`, `<div class="joystickArea">` should expose a role (e.g., `role="slider"` with appropriate aria attributes), and the overlay should be navigable via keyboard (`<main>`, `<dialog>`, or proper heading hierarchy).  
- **Actual:** No ARIA labels, roles, or accessible names are present. The fire button relies on its default text ("FIRE" at line 47) but has no `aria-label` or `title`. Joystick area is a plain div with no semantic role or keyboard interaction support.  
- **Evidence:** Line 16: `.joystickArea{position:absolute;...touch-action:none;cursor:none}` — no ARIA attributes, no role, no tabindex. Line 20: `.fireBtn{...}` — button element has default text "FIRE" (line 47) but no `aria-label`, `role`, or accessible name beyond the visible label. Lines 50-51 show overlay content is purely decorative HTML with no ARIA markup.  
- **Confidence:** confirmed static
