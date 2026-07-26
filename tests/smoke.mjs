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

export function spiderScoreByDistance(playerY, spiderY) {
  const dist = Math.abs(playerY - spiderY);
  return dist >= 64 ? 300 : dist >= 22 ? 600 : 900;
}

export function spiderCollisionActive(invT) {
  return invT <= 0;
}

export function fleaScore(current) {
  const FLEA_SCORE = 200;
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
  const SCORPION_SCORE = 1000;
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

export function centipedeScore(isHead) {
  return isHead ? 100 : 10;
}

export function mushroomScore() {
  return 1;
}

export function extraLifeCheck(score, nextExtraLife, lives) {
  if (score >= nextExtraLife && lives < 6) {
    return { granted: true, nextExtraLife: nextExtraLife + 12000, lives: lives + 1 };
  }
  return { granted: false, nextExtraLife, lives };
}

assert(rectOverlap([0, 0, 10, 10], [5, 5, 15, 15]));
assert(!rectOverlap([0, 0, 5, 5], [10, 10, 20, 20]));
assert(clamp(7, 0, 10) === 7);
assert(clamp(-3, 0, 10) === 0);
assert(addScore(1, 10) === 11);
assert(loseLife(1, 3) === 2);
assert(rectOverlap([0, 0, 10, 10], [0, 0, 10, 10]));
assert(clamp(15, 0, 10) === 10);

// spider distance-based scoring (authentic: 300/600/900)
assert(spiderScoreByDistance(200, 200) === 900);  // close: <22px
assert(spiderScoreByDistance(200, 210) === 900);  // close: 10px
assert(spiderScoreByDistance(200, 225) === 600);  // medium: 25px
assert(spiderScoreByDistance(200, 260) === 600);  // medium: 60px
assert(spiderScoreByDistance(200, 264) === 300);  // far: 64px
assert(spiderScoreByDistance(200, 300) === 300);  // far: 100px
assert(spiderCollisionActive(0) === true);
assert(spiderCollisionActive(1999) === false);
assert(spiderCollisionActive(2000) === false);

// flea score/cleanup assertions (authentic: 200)
assert(fleaScore(500) === 700);
assert(fleaScore(0) === 200);
assert(fleaCleanupOffscreen(260, 240) === true);
assert(fleaCleanupOffscreen(230, 240) === false);
assert(fleaSpawnInterval(900, 900) === true);
assert(fleaSpawnInterval(899, 900) === false);
assert(fleaMaxCap(1, 2) === true);
assert(fleaMaxCap(2, 2) === false);

// scorpion score/cleanup assertions (authentic: 1000)
assert(scorpionScore(0) === 1000);
assert(scorpionScore(1000) === 2000);
assert(scorpionCleanupOffscreen(-40, 320) === true);
assert(scorpionCleanupOffscreen(360, 320) === true);
assert(scorpionCleanupOffscreen(160, 320) === false);
assert(scorpionSpawnInterval(1200, 1200) === true);
assert(scorpionSpawnInterval(1199, 1200) === false);
assert(scorpionMaxCap(0, 1) === true);
assert(scorpionMaxCap(1, 1) === false);

// centipede scoring: head=100, body=10 (authentic)
assert(centipedeScore(true) === 100);
assert(centipedeScore(false) === 10);

// mushroom scoring: 1 point per hit (authentic)
assert(mushroomScore() === 1);

// mushroom HP mechanics: 4-hit destruction cycle (authentic)
function mushroomHpDecrement(hp) { return hp - 1; }
function mushroomDestroyed(hp) { return hp <= 0; }
function mushroomSize(hp, baseW, baseH) { return { w: baseW * (hp / 4), h: baseH * (hp / 4) }; }
assert(mushroomHpDecrement(4) === 3);
assert(mushroomHpDecrement(1) === 0);
assert(!mushroomDestroyed(4));
assert(!mushroomDestroyed(1));
assert(mushroomDestroyed(0));
var sz3 = mushroomSize(3, 18, 14);
assert(sz3.w === 13.5 && sz3.h === 10.5);
var sz1 = mushroomSize(1, 18, 14);
assert(sz1.w === 4.5 && sz1.h === 3.5);
assert(mushroomDestroyed(mushroomHpDecrement(1)));

// centipede nibble: mushroom loses 1 HP when segment crosses
function centipedeNibble(hp) { return Math.max(0, hp - 1); }
assert(centipedeNibble(4) === 3);
assert(centipedeNibble(0) === 0);

// mushroom regen: fills empty rows after player death
function regenMushroomsForRows(rows, existing) {
  var filled = [];
  for (var r = 0; r < rows; r++) {
    var has = existing.some(function(m) { return m.r === r; });
    if (!has) filled.push(r);
  }
  return filled;
}
assert(regenMushroomsForRows(5, [{r:0},{r:1}]).length === 3);
assert(regenMushroomsForRows(5, [{r:0},{r:1},{r:2},{r:3},{r:4}]).length === 0);

// extra life: every 12000 points, max 6 lives
var el1 = extraLifeCheck(12000, 12000, 3);
assert(el1.granted === true && el1.lives === 4 && el1.nextExtraLife === 24000);
var el2 = extraLifeCheck(24000, 24000, 5);
assert(el2.granted === true && el2.lives === 6 && el2.nextExtraLife === 36000);
var el3 = extraLifeCheck(36000, 36000, 6);
assert(el3.granted === false && el3.lives === 6);  // cap at 6
var el4 = extraLifeCheck(11000, 12000, 3);
assert(el4.granted === false);  // threshold not reached

// centipede split mechanic — authentic behavior
function splitHeadHit(segments) {
    return segments.slice(1);
}
function splitBodyHit(segments, hitIndex) {
    var original = segments.slice(0, hitIndex);
    var tail = segments.slice(hitIndex + 1);
    return { original: original, tail: tail };
}

// head hit: removes head, rest stays in same group
var h1 = splitHeadHit([1,2,3,4]);
assert(h1.length === 3 && h1[0] === 2);
var h2 = splitHeadHit([1]);
assert(h2.length === 0);
var h3 = splitHeadHit([1,2]);
assert(h3.length === 1 && h3[0] === 2);

// body hit in middle: splits into head group + tail group
var b1 = splitBodyHit([1,2,3,4,5], 2);
assert(b1.original.length === 2 && b1.tail.length === 2);
assert(b1.tail[0] === 4);

// body hit just after head
var b2 = splitBodyHit([1,2,3,4], 1);
assert(b2.original.length === 1 && b2.tail.length === 2);
assert(b2.original[0] === 1 && b2.tail[0] === 3);

// body hit at tail end: no tail group
var b3 = splitBodyHit([1,2,3,4], 3);
assert(b3.original.length === 3 && b3.tail.length === 0);

// body hit at second-to-last
var b4 = splitBodyHit([1,2,3], 2);
assert(b4.original.length === 2 && b4.tail.length === 0);

// cleanup removes empty and null groups
function cleanupTest(groups) {
    var result = [];
    for (var i = groups.length - 1; i >= 0; i--) {
        var g = groups[i];
        if (!g || !g.segments || g.segments.length === 0) continue;
        result.push(g);
    }
    return result;
}
var ct1 = cleanupTest([{segments:[1,2]}, null, {segments:[]}, {segments:[3]}]);
assert(ct1.length === 2);
var ct2 = cleanupTest([]);
assert(ct2.length === 0);

console.log("PASS");
