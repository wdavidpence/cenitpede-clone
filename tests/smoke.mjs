export function assert(condition) {
  if (!condition) throw new Error("Assertion failed");
}

export function rectOverlap(a, b) {
  return !(a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1]);
}

export function clamp(val, min, max) {
  return val < min ? min : val > max ? max : val;
}

export function addScore(score, current) {
  return current + score;
}

export function loseLife(livesLeft, current) {
  return current - livesLeft;
}

export function spiderScore(current) {
  const SPIDER_SCORE = 75;
  return current + SPIDER_SCORE;
}

export function spiderCollisionActive(invT) {
  return invT <= 0;
}

export function fleaScore(current) {
  const FLEA_SCORE = 100;
  return current + FLEA_SCORE;
}

export function fleaCleanupOffscreen(y, H) {
  return y > H + 16;
}

export function fleaSpawnInterval(timer, interval) {
  return timer >= interval;
}

export function fleaMaxCap(length, max) {
  return length < max;
}

export function scorpionScore(current) {
  const SCORPION_SCORE = 500;
  return current + SCORPION_SCORE;
}

export function scorpionCleanupOffscreen(x, W) {
  return x < -30 || x > W + 30;
}

export function scorpionSpawnInterval(timer, interval) {
  return timer >= interval;
}

export function scorpionMaxCap(length, max) {
  return length < max;
}

assert(rectOverlap([0, 0, 10, 10], [5, 5, 15, 15]));
assert(!rectOverlap([0, 0, 5, 5], [10, 10, 20, 20]));
assert(clamp(7, 0, 10) === 7);
assert(clamp(-3, 0, 10) === 0);
assert(addScore(5, 10) === 15);
assert(loseLife(1, 3) === 2);
assert(rectOverlap([0, 0, 10, 10], [0, 0, 10, 10]));
assert(clamp(15, 0, 10) === 10);

// spider collision/score helper assertions
assert(spiderScore(200) === 275);
assert(spiderScore(0) === 75);
assert(spiderCollisionActive(0) === true);
assert(spiderCollisionActive(1999) === false);
assert(spiderCollisionActive(2000) === false);

// flea score/cleanup assertions
assert(fleaScore(500) === 600);
assert(fleaScore(0) === 100);
assert(fleaCleanupOffscreen(260, 240) === true);
assert(fleaCleanupOffscreen(230, 240) === false);
assert(fleaSpawnInterval(900, 900) === true);
assert(fleaSpawnInterval(899, 900) === false);
assert(fleaMaxCap(1, 2) === true);
assert(fleaMaxCap(2, 2) === false);

// scorpion score/cleanup assertions
assert(scorpionScore(0) === 500);
assert(scorpionScore(1000) === 1500);
assert(scorpionCleanupOffscreen(-40, 320) === true);
assert(scorpionCleanupOffscreen(360, 320) === true);
assert(scorpionCleanupOffscreen(160, 320) === false);
assert(scorpionSpawnInterval(1200, 1200) === true);
assert(scorpionSpawnInterval(1199, 1200) === false);
assert(scorpionMaxCap(0, 1) === true);
assert(scorpionMaxCap(1, 1) === false);

console.log("PASS");
