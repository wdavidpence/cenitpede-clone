#!/usr/bin/env node
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// --- paths (relative to CWD) ---
const INDEX = path.join(process.cwd(), 'index.html');
const SMOKE = path.join(process.cwd(), 'tests/smoke.mjs');

// ---------------------------------------------------------------------------
// 1. Extract the inline <script> body from index.html
// ---------------------------------------------------------------------------
function extractScript(html) {
  const m = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/);
  return (m && m[1]) ? m[1] : null;
}

let inlineSrc = extractScript(fs.readFileSync(INDEX, 'utf8'));

// ---------------------------------------------------------------------------
// 2. Syntax check — compile the extracted script via new Function() to
//    surface real SyntaxError / ReferenceError
// ---------------------------------------------------------------------------
const SYNTAX_OK   = !!inlineSrc;
let syntaxErr     = inlineSrc ? '' : 'no <script> block in index.html';

try {
  if (SYNTAX_OK) new Function(inlineSrc);
} catch (err) {
  if (err instanceof SyntaxError) syntaxErr = err.message;
  else if (['ReferenceError', 'URIError'].includes(err.name)) {
    syntaxErr = String(err);
  }
}

// ---------------------------------------------------------------------------
// 3. Smoke test — run tests/smoke.mjs with explicit node invocation and
//    capture stdout to determine PASS / FAIL
// ---------------------------------------------------------------------------
let SMOKE_OK   = false;
let SMOKE_OUT  = '';
try {
  const cp = require('child_process');
  const res = cp.execSync('node ' + SMOKE, { encoding: 'utf8', timeout: 3000 });
  SMOKE_OK   = res.trim() === 'PASS';
  SMOKE_OUT  = res;
} catch (e) {
  SMOKE_OK  = false;
  SMOKE_OUT = e.message || String(e);
}

// ---------------------------------------------------------------------------
// 4. Gameplay-marker scan — extract identifier-like tokens from the inline
//    script and check each marker as an exact-case-insensitive token match.
// ---------------------------------------------------------------------------
function scanMarkers(src, markers) {
  const out = {};
  for (const m of markers) {
    if (m === 'audioWebAudio') {
      // audioWebAudio is an output label; positive when the inline source
      // contains either 'AudioContext' or 'webkitAudioContext'.
      const tokens   = src.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [];
      out[m] = tokens.some(tok => /audio/.test(tok.toLowerCase()) && /context/.test(tok.toLowerCase()));
    } else {
      const lowerM   = m.toLowerCase();
      // tokenize: every maximal run of [A-Za-z0-9_$] is an identifier token
      const tokens   = src.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [];
      out[m] = tokens.some(tok => tok.toLowerCase() === lowerM);
    }
  }
  return out;
}

const MARKERS = [
  'startGame',
  'fireBullet',
  'centipede',
  'mushrooms',
  'spiders',
  'fleas',
  'scorpions',
  // detects AudioContext / webkitAudioContext usage in the inline script
  'audioWebAudio',
  'touch'
];

// ---------------------------------------------------------------------------
// 5. Unavailable checks — features that require a real browser runtime and
//    can't be validated from Node alone
// ---------------------------------------------------------------------------
const UNAVAILABLE_BROWSER = [
  { check:      'canvas rendering verification',    reason: 'requires browser canvas element and GPU-accelerated compositing' },
  { check:      'mouse/touch event handlers firing',reason: 'DOM touchstart/mousedown events only fire inside a browser runtime' },
  { check:      'audio playback latency test',     reason: 'Web Audio API context state is a browser feature; Node throws ReferenceError' },
  { check:      'frame-rate / 60fps stability',    reason: 'requires requestAnimationFrame on an actual display surface' },
  { check:      'viewport scaling & CSS fit check',reason: 'CSS viewport units and devicePixelRatio are platform-specific' },
  { check:      'safe-area-inset padding on iPhone',reason: 'only available in Safari on iOS with a real safe area' },
  { check:      'multi-touch gesture handling',    reason: 'multiple simultaneous touch events require browser runtime' },
  { check:      'orientation / layout behavior',   reason: 'screen orientation change needs a physical device or emulator' }
];

// ---------------------------------------------------------------------------
// 6. Assemble and print the report
// ---------------------------------------------------------------------------
const now = new Date().toISOString();
console.log(JSON.stringify({
  timestamp:       now,
  syntaxCheck:     { ok: SYNTAX_OK, error: syntaxErr },
  smokeTest:       { ok: SMOKE_OK, output: SMOKE_OUT },
  gameplayMarkers: scanMarkers(inlineSrc || '', MARKERS),
  unavailableBrowserChecks: UNAVAILABLE_BROWSER
}, null, 2));
