# Cenitpede Clone — Project Management and Verification Plan

## Goal
Build and publish a clean-room, touch-first browser recreation of the original 1981 Centipede stand-up arcade experience, targeting at least 95% gameplay and presentation fidelity while using newly authored graphics, code, and synthesized audio. The game must be playable on iPhone Safari through GitHub Pages.

## Constraints
- Repository: `wdavidpence/cenitpede-clone`
- Public GitHub repository and GitHub Pages deployment.
- Hermes is project manager and judge only; all implementation, code changes, debugging, and test-writing are delegated to local OpenCode with `ornith/ornith-1.0-9b-mtp`.
- No Atari ROM code, copied assets, recorded audio, or proprietary source material.
- Prefer a dependency-free HTML5 Canvas/Web Audio implementation so GitHub Pages and iPhone Safari work without a build service.
- No “works” claims without concrete test output or live-page verification.

## Acceptance target
A reviewer comparing the result with the original Centipede cabinet should find the following substantially equivalent: player movement and three-way shooting, mushroom field and poisoning, centipede segmentation and head behavior, spider/flea/scorpion interactions, score values and progression, lives/game-over/restart flow, escalating waves, cabinet-like audiovisual feedback, and responsive touch controls. Visuals and audio may be newly authored rather than copied.

## Work phases and gates

### Phase 0 — Baseline and architecture
OpenCode inspects the repository, records the current baseline, selects the minimal architecture, and creates the implementation checklist and test harness. No feature work proceeds until the plan, file layout, browser/runtime strategy, and test commands are documented.

Gate: repository identity is correct; the game can be served locally; JavaScript syntax/runtime smoke tests are defined; no external copyrighted assets are introduced.

### Phase 1 — Playable vertical slice
Implement the game loop, fixed logical playfield, player cannon movement, firing, collision primitives, mushroom field, one centipede, score, lives, start/game-over/restart states, keyboard fallback, and touch controls.

Gate: a fresh session can start, move, shoot, score, lose a life, restart, and reach game over. Automated smoke tests pass and a manual/browser run produces evidence.

### Phase 2 — Original enemy ecology
Add faithful interactions and tuning for centipede segments, head turns and descent, mushroom poisoning, spider, flea, and scorpion. Implement wave progression and the original-style threat relationships rather than generic enemies.

Gate: each enemy can spawn under controlled conditions, interact correctly, award the intended score, and transition safely across waves. Regression tests cover all collision and state transitions.

### Phase 3 — Rules, scoring, and cabinet feel
Tune movement, firing, spawn cadence, mushroom layout, scoring, lives, difficulty escalation, bonus behavior, sound effects, particles, screen flash, and cabinet-like HUD/attract presentation. Use only synthesized audio and authored procedural art.

Gate: a rules audit against a written Centipede fidelity checklist scores the build at least 8/10 before mobile polish; critical and gameplay defects are zero.

### Phase 4 — iPhone Safari pass
Harden viewport sizing, safe-area handling, touch-action behavior, orientation/layout behavior, on-screen controls, first-touch behavior, audio unlock, pause/resume, and performance. Validate on a real browser path where available and with runtime smoke tests against the exact published HTML.

Gate: no accidental page scrolling/zooming during play, controls are usable in portrait and landscape, canvas fits without clipping, audio starts after a gesture, and a 60fps-oriented frame loop remains stable under representative entity counts.

### Phase 5 — Judge audit and correction loop
Hermes reviews the actual files, test output, local behavior, repository history, and live Pages build. Hermes writes prioritized findings to `docs/judge-report.md` and sends only concrete correction tasks back to OpenCode. OpenCode fixes one focused slice at a time and reports changed files plus verification output. Hermes rechecks every correction.

Gate: no unresolved critical defects; no known regressions; live page contains the current build marker; local and live runtime checks agree; repository is clean and pushed.

### Phase 6 — Publish and final verification
OpenCode prepares final documentation and deployment workflow. Hermes verifies repository identity, main branch contents, Pages configuration, HTTP status, live marker, and downloaded live HTML runtime smoke tests. Hermes records the final honest fidelity score and any limitations instead of rounding up to satisfy the target.

Gate: published URL is reachable and playable; final report includes real commands and results, commit/repository URLs, and an evidence-based score.

## Hermes judging rubric

- Core controls and game loop: 20%
- Centipede/enemy rules and collisions: 25%
- Scoring, lives, waves, and progression: 15%
- Cabinet visual/audio feel: 15%
- iPhone Safari usability/performance: 15%
- Reliability, tests, documentation, and clean-room compliance: 10%

A 95% score is earned only if the evidence supports it. If the completed build is below 95%, report the actual score and continue delegating targeted fixes while material improvements remain possible.

## OpenCode operating protocol

1. Every implementation or debugging request must explicitly name the target repository and use model `ornith/ornith-1.0-9b-mtp`.
2. Prompts must be narrow, phase-specific, and include required verification commands.
3. OpenCode must not claim success without showing command output or concrete file/commit evidence.
4. Hermes must inspect the result after every pass and may reject it with a prioritized correction list.
5. Avoid giant rewrites; use small, reviewable slices with frequent commits.
6. Preserve `docs/project-plan.md`, `docs/judge-report.md`, and any test harness unless a justified change is documented.

## Required final deliverables

- Public repository: `https://github.com/wdavidpence/cenitpede-clone`
- GitHub Pages URL, verified live.
- Touch-first playable game with keyboard fallback.
- Clean-room authored graphics/audio.
- Automated syntax/runtime smoke tests and documented verification commands.
- `docs/judge-report.md` with final evidence-based fidelity score and known limitations.
- `README.md` with controls, deployment URL, clean-room statement, and verification status.
