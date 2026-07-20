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

assert(rectOverlap([0, 0, 10, 10], [5, 5, 15, 15]));
assert(!rectOverlap([0, 0, 5, 5], [10, 10, 20, 20]));
assert(clamp(7, 0, 10) === 7);
assert(clamp(-3, 0, 10) === 0);
assert(addScore(5, 10) === 15);
assert(loseLife(1, 3) === 2);
assert(rectOverlap([0, 0, 10, 10], [0, 0, 10, 10]));
assert(clamp(15, 0, 10) === 10);
console.log("PASS");
