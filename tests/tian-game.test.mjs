import test from "node:test";
import assert from "node:assert/strict";
import { actTianGame, baitBlockReason, baseRunSpeed, createTianGame, entityPace, JUMP_SECONDS, pauseTianGame, resumeTianGame, rowInterval, runScore, runSpeed, startTianBait, startTianGame, stepTianGame, tapTianStruggle, visibleTianReaction } from "../app/members/tian-game.ts";

function isolatedGame(kind, options = {}) {
  const game = createTianGame(42);
  Object.assign(game, { status: "running", nextRow: Infinity }, options);
  if (kind) game.entities.push({ id: 99, kind, lane: 1, z: 0.2, resolved: false });
  return game;
}

test("jump clears a low barrier, but does not clear a full-height cart", () => {
  const barrier = isolatedGame("barrier", { jump: JUMP_SECONDS / 2 });
  stepTianGame(barrier, 0.02);
  assert.equal(barrier.hits, 0);
  assert.equal(barrier.dodged, 1);
  const cart = isolatedGame("cart", { jump: JUMP_SECONDS / 2 });
  stepTianGame(cart, 0.02);
  assert.equal(cart.hits, 1);
});

test("an expired jump or slide cannot avoid a collision", () => {
  const landed = isolatedGame("barrier", { jump: 0.001 });
  stepTianGame(landed, 0.02);
  assert.equal(landed.hits, 1);
  const ducked = isolatedGame("arch", { slide: 0.5 });
  stepTianGame(ducked, 0.02);
  assert.equal(ducked.hits, 0);
  const upright = isolatedGame("arch", { slide: 0.001 });
  stepTianGame(upright, 0.02);
  assert.equal(upright.hits, 1);
});

test("a collision costs pursuit distance once, with brief invulnerability", () => {
  const game = isolatedGame("cart");
  game.entities.push({ id: 100, lane: 1, kind: "cart", z: 0.3, resolved: false });
  stepTianGame(game, 0.02);
  assert.equal(game.hits, 1);
  assert.equal(game.gap, 6);
  for (let i = 0; i < 100; i++) stepTianGame(game, 0.02);
  assert.equal(game.hits, 1, "a resolved obstacle cannot hit again");
  assert.equal(game.gap, 6, "the first stumble remains dangerous; running does not erase it");
  game.entities.push({ id: 101, lane: 1, kind: "barrier", z: 0.1, resolved: false });
  stepTianGame(game, 0.02);
  assert.equal(game.hits, 2);
  assert.equal(game.gap, 0);
  assert.equal(game.status, "struggle");
  assert.equal(game.strugglesUsed, 1);
});

test("pause freezes the countdown, distance, actions and obstacles", () => {
  const countdown = createTianGame();
  startTianGame(countdown); pauseTianGame(countdown);
  stepTianGame(countdown, 1); actTianGame(countdown, "left");
  assert.equal(countdown.countdown, 3);
  assert.equal(countdown.lane, 1);
  resumeTianGame(countdown);
  assert.equal(countdown.status, "countdown");
  const running = isolatedGame("barrier", { jump: 0.5 });
  pauseTianGame(running);
  const before = structuredClone(running);
  stepTianGame(running, 10);
  assert.deepEqual(running, before);
  resumeTianGame(running);
  assert.equal(running.status, "running");
});

test("lane bounds and action exclusions hold under repeated controls", () => {
  const game = isolatedGame();
  for (let i = 0; i < 20; i++) actTianGame(game, "left");
  assert.equal(game.lane, 0);
  for (let i = 0; i < 20; i++) actTianGame(game, "right");
  assert.equal(game.lane, 2);
  actTianGame(game, "jump"); actTianGame(game, "slide");
  assert.equal(game.slide, 0);
  assert.equal(game.jump, JUMP_SECONDS);
});

test("coins are collected only in the occupied lane and only once", () => {
  const collected = isolatedGame("coin");
  stepTianGame(collected, 0.02); stepTianGame(collected, 0.02);
  assert.equal(collected.coins, 1);
  assert.equal(runScore(collected), Math.floor(collected.distance) * 2 + 25);
  const missed = isolatedGame("coin", { lane: 0, visualLane: 0 });
  stepTianGame(missed, 0.02);
  assert.equal(missed.coins, 0);
});

test("catch is terminal; retry starts with clean run statistics", () => {
  const caught = isolatedGame("cart", { gap: 6, hits: 1, strugglesUsed: 2 });
  stepTianGame(caught, 0.02);
  assert.equal(caught.status, "caught");
  const before = structuredClone(caught); stepTianGame(caught, 1); actTianGame(caught, "left");
  assert.deepEqual(caught, before);
  const retry = createTianGame();
  assert.equal(retry.hits + retry.coins + retry.distance, 0);
  assert.equal(retry.status, "ready");
});

test("action coin rows remain optional and always leave an unobstructed lane", () => {
  const observed = new Set();
  const obstacleKinds = new Set();
  for (const seed of [1, 18, 121, 999]) {
    const game = createTianGame(seed); game.status = "running";
    let rows = 0;
    while (game.distance < 5000) {
      game.entities = [];
      stepTianGame(game, 0.05);
      if (!game.entities.length) continue;
      rows++;
      const blocked = new Set(game.entities.filter((item) => item.kind !== "coin").map((item) => item.lane));
      assert.ok(blocked.size >= 1 && blocked.size <= 2);
      const coins = game.entities.filter((item) => item.kind === "coin");
      assert.equal(coins.length, 3);
      const obstacles = game.entities.filter((item) => item.kind !== "coin");
      for (const obstacle of obstacles) obstacleKinds.add(obstacle.kind);
      for (const coin of coins) {
        observed.add(coin.pickup);
        if (coin.pickup === "ground") assert.ok(!blocked.has(coin.lane));
        else {
          const obstacle = obstacles.find((item) => item.lane === coin.lane);
          assert.ok(obstacle);
          assert.ok(coin.pickup === "air" ? ["barrier", "car"].includes(obstacle.kind) : obstacle.kind === "arch");
          assert.equal(entityPace(coin), entityPace(obstacle));
        }
      }
      // Moving traffic and stationary obstacles keep the same encounter distance per row.
      const arrivalDistances = obstacles.map((item) => item.z / entityPace(item));
      assert.ok(arrivalDistances.every((distance) => Math.abs(distance - arrivalDistances[0]) < 0.0001));
    }
    assert.ok(rows >= 15);
  }
  assert.deepEqual(observed, new Set(["air", "ground", "low"]));
  assert.ok(obstacleKinds.has("car") && obstacleKinds.has("truck"));
});

test("high and low coins require the right action, even in the correct lane", () => {
  for (const pickup of ["air", "low"]) {
    const standing = isolatedGame("coin"); standing.entities[0].pickup = pickup;
    stepTianGame(standing, 0.02);
    assert.equal(standing.coins, 0);
    const performing = isolatedGame("coin", pickup === "air" ? { jump: JUMP_SECONDS / 2 } : { slide: 0.5 });
    performing.entities[0].pickup = pickup;
    stepTianGame(performing, 0.02);
    assert.equal(performing.coins, 1);
  }
});

test("each three-coin action cluster fits one maneuver at opening and long-run speeds", () => {
  for (const distance of [0, 10000]) {
    for (const pickup of ["air", "low"]) {
      const game = isolatedGame(null, { distance });
      const center = runSpeed(game) * 0.36;
      game.entities = [-3, 0, 3].map((offset, index) => ({ id: index, lane: 1, z: center + offset, kind: "coin", pickup, resolved: false }));
      actTianGame(game, pickup === "air" ? "jump" : "slide");
      for (let frame = 0; frame < 80; frame++) stepTianGame(game, 0.01);
      assert.equal(game.coins, 3, `${pickup} cluster at ${distance} meters`);
    }
  }
});

test("oncoming cars can be jumped, while trucks require a different lane", () => {
  const standing = isolatedGame("car"); stepTianGame(standing, 0.02);
  assert.equal(standing.hits, 1);
  const jumping = isolatedGame("car", { jump: JUMP_SECONDS / 2 }); stepTianGame(jumping, 0.02);
  assert.equal(jumping.hits, 0);
  for (const action of [{ jump: JUMP_SECONDS / 2 }, { slide: 0.5 }]) {
    const truck = isolatedGame("truck", action); stepTianGame(truck, 0.02);
    assert.equal(truck.hits, 1);
  }
  const switched = isolatedGame("truck", { lane: 0, visualLane: 0 }); stepTianGame(switched, 0.02);
  assert.equal(switched.hits, 0);
});

test("traffic closes faster than road props; speed increases throughout the route", () => {
  const car = isolatedGame("car"); const truck = isolatedGame("truck"); const barrier = isolatedGame("barrier");
  for (const game of [car, truck, barrier]) game.entities[0].z = 100;
  for (const game of [car, truck, barrier]) stepTianGame(game, 0.05);
  assert.ok(car.entities[0].z < truck.entities[0].z);
  assert.ok(truck.entities[0].z < barrier.entities[0].z);
  const speeds = [0, 250, 500, 1000, 3000, 10000].map((distance) => runSpeed(isolatedGame(null, { distance })));
  assert.ok(speeds.every((speed, index) => index === 0 || speed > speeds[index - 1]));
  assert.ok(speeds.at(-1) > speeds[0] * 2);
  assert.ok(speeds[0] >= 32, "opening pace is substantially faster than the old 19-unit start");
});

test("endless runs cross 1,000m and 10,000m without ending or leaking entities", () => {
  const game = isolatedGame(null, { distance: 999.9 });
  stepTianGame(game, 0.02);
  assert.ok(game.distance > 1000);
  assert.equal(game.status, "running");
  game.distance = 9999.9;
  stepTianGame(game, 0.02);
  assert.ok(game.distance > 10000);
  assert.equal(game.status, "running");
  // Running in the empty lane allows a long deterministic soak through the entity lifecycle.
  game.nextRow = game.distance;
  for (let frame = 0; frame < 10000; frame++) {
    stepTianGame(game, 0.01);
    // Resolve contacts off-lane without bypassing normal movement or cleanup.
    for (const item of game.entities) item.lane = 0;
    assert.ok(game.entities.length < 300);
  }
  assert.equal(game.status, "running");
  assert.ok(game.distance > 15000);
});

test("difficulty keeps growing with a playable action interval", () => {
  const distances = [0, 500, 1000, 3000, 10000];
  const intervals = distances.map(rowInterval);
  assert.ok(intervals.every((value, index) => index === 0 || value < intervals[index - 1]));
  assert.ok(intervals.every((value) => value >= 1.2));
  assert.ok(baseRunSpeed(1000) > 59);
  assert.ok(baseRunSpeed(100000) <= 86);
});

test("a very late frame cannot teleport the player through the route", () => {
  const game = isolatedGame();
  stepTianGame(game, 100);
  assert.ok(game.distance < 2);
  assert.ok(game.elapsed <= 0.05);
  const before = structuredClone(game);
  stepTianGame(game, NaN); stepTianGame(game, -1);
  assert.deepEqual(game, before);
});

test("fear overrides celebrations after a stumble and resets only on a new run", () => {
  const game = isolatedGame("cart", { reaction: "grin", reactionUntil: 999 });
  stepTianGame(game, 0.02);
  assert.equal(visibleTianReaction(game), "fear");
  game.distance = 999.9;
  game.recordTarget = 1;
  stepTianGame(game, 0.02);
  assert.equal(visibleTianReaction(game), "fear", "a milestone or record cannot hide the warning face");
  game.elapsed += 100;
  assert.equal(visibleTianReaction(game), "fear");
  assert.equal(visibleTianReaction(createTianGame()), "smirk");
});

test("each 18 collected coins triggers a grin; missed coins do not reset the total", () => {
  const game = isolatedGame();
  for (let coin = 0; coin < 17; coin++) {
    game.entities = [{ id: coin, lane: 1, z: 0.2, kind: "coin", resolved: false }];
    stepTianGame(game, 0.02);
  }
  assert.equal(game.coins, 17);
  assert.equal(visibleTianReaction(game), "smirk");
  game.entities = [{ id: 18, lane: 0, z: 0.2, kind: "coin", resolved: false }];
  stepTianGame(game, 0.02);
  assert.equal(game.coins, 17);
  game.entities = [{ id: 19, lane: 1, z: 0.2, kind: "coin", resolved: false }];
  stepTianGame(game, 0.02);
  assert.equal(game.coins, 18);
  assert.equal(visibleTianReaction(game), "grin");
  game.elapsed = game.reactionUntil + 0.01;
  assert.equal(visibleTianReaction(game), "smirk", "a temporary taunt expires in game time");
  for (let coin = 0; coin < 18; coin++) {
    game.entities = [{ id: 20 + coin, lane: 1, z: 0.2, kind: "coin", resolved: false }];
    stepTianGame(game, 0.02);
    assert.equal(visibleTianReaction(game), coin < 17 ? "smirk" : "grin");
  }
  assert.equal(game.coins, 36);
});

test("three consecutive car jumps trigger the tongue taunt; lane dodges do not count", () => {
  const game = isolatedGame();
  for (let car = 0; car < 3; car++) {
    game.jump = JUMP_SECONDS / 2;
    game.entities = [{ id: car, lane: 1, z: 0.2, kind: "car", resolved: false }];
    stepTianGame(game, 0.02);
  }
  assert.equal(visibleTianReaction(game), "tongue");
  game.entities = [{ id: 4, lane: 0, z: 0.2, kind: "car", resolved: false }];
  stepTianGame(game, 0.02);
  assert.equal(game.carJumpStreak, 0);
});

test("safe distance milestones trigger shush and pausing freezes reaction duration", () => {
  const game = isolatedGame(null, { distance: 999.9 });
  stepTianGame(game, 0.02);
  assert.equal(visibleTianReaction(game), "shush");
  pauseTianGame(game);
  stepTianGame(game, 99);
  assert.equal(visibleTianReaction(game), "shush");
});

test("shush triggers once per 1,000m, not at intermediate 500m marks", () => {
  for (const distance of [499.9, 1499.9, 2499.9]) {
    const game = isolatedGame(null, { distance });
    stepTianGame(game, 0.02);
    assert.equal(visibleTianReaction(game), "smirk");
  }
  for (const distance of [999.9, 1999.9, 2999.9]) {
    const game = isolatedGame(null, { distance });
    stepTianGame(game, 0.02);
    assert.equal(visibleTianReaction(game), "shush");
    const expiry = game.reactionUntil;
    stepTianGame(game, 0.02);
    assert.equal(game.reactionUntil, expiry, "the same milestone must not restart the popup every frame");
  }
});

function capturedGame(options = {}) {
  const game = isolatedGame("cart", { hits: 1, gap: 6, ...options });
  stepTianGame(game, 0.02);
  return game;
}

test("a capture consumes one opportunity and freezes the road during the struggle", () => {
  const game = capturedGame({ distance: 320, coins: 12, dodged: 5 });
  assert.equal(game.status, "struggle");
  assert.equal(game.strugglesUsed, 1);
  assert.equal(game.struggleTarget, 20);
  assert.equal(game.struggleLeft, 5);
  const { distance, elapsed } = game; const score = runScore(game);
  const entityPositions = game.entities.map((item) => item.z);
  for (let frame = 0; frame < 20; frame++) stepTianGame(game, 0.05);
  assert.equal(game.distance, distance);
  assert.equal(game.elapsed, elapsed);
  assert.equal(runScore(game), score);
  assert.deepEqual(game.entities.map((item) => item.z), entityPositions);
  assert.equal(game.strugglesUsed, 1);
});

test("20 taps rescue the first capture, preserve the run, and give a protected restart", () => {
  const game = capturedGame({ distance: 320, coins: 12, dodged: 5 });
  const distance = game.distance; const speed = baseRunSpeed(distance); const score = runScore(game);
  game.entities.push({ id: 100, lane: 1, kind: "car", z: speed, resolved: false, pace: 1.6 });
  game.entities.push({ id: 101, lane: 0, kind: "barrier", z: 500, resolved: false });
  game.nextRow = distance + 1;
  for (let tap = 0; tap < 19; tap++) tapTianStruggle(game);
  assert.equal(game.status, "struggle");
  tapTianStruggle(game);
  assert.equal(game.status, "rescued");
  assert.equal(game.rescues, 1);
  assert.equal(game.hits, 0);
  assert.equal(game.gap, 32);
  assert.equal(game.invincible, 2);
  assert.equal(game.distance, distance);
  assert.equal(game.coins, 12);
  assert.equal(runScore(game), score);
  assert.equal(baseRunSpeed(game.distance), speed);
  assert.ok(!game.entities.some((item) => item.id === 100));
  assert.ok(game.entities.some((item) => item.id === 101));
  assert.ok(game.nextRow >= distance + speed);
  for (let frame = 0; frame < 60; frame++) stepTianGame(game, 0.05);
  assert.equal(game.status, "running");
  assert.equal(game.invincible, 2, "protection begins when running resumes, not during the success display");
  game.entities = [{ id: 102, lane: 1, kind: "cart", z: 0.2, resolved: false }];
  stepTianGame(game, 0.02);
  assert.equal(game.hits, 0);
});

test("the second struggle needs 28 taps, and the third capture ends the run", () => {
  const game = capturedGame();
  for (let tap = 0; tap < 20; tap++) tapTianStruggle(game);
  for (let frame = 0; frame < 60; frame++) stepTianGame(game, 0.05);
  for (let attempt = 2; attempt <= 3; attempt++) {
    game.hits = 1; game.invincible = 0;
    game.entities = [{ id: 100 + attempt, lane: 1, kind: "cart", z: 0.2, resolved: false }];
    stepTianGame(game, 0.02);
    if (attempt === 3) break;
    assert.equal(game.status, "struggle");
    assert.equal(game.strugglesUsed, 2);
    assert.equal(game.struggleTarget, 28);
    for (let tap = 0; tap < 27; tap++) tapTianStruggle(game);
    assert.equal(game.status, "struggle");
    tapTianStruggle(game);
    assert.equal(game.rescues, 2);
    for (let frame = 0; frame < 60; frame++) stepTianGame(game, 0.05);
  }
  assert.equal(game.status, "caught");
  assert.equal(game.strugglesUsed, 2);
  const before = structuredClone(game);
  for (let tap = 0; tap < 100; tap++) tapTianStruggle(game);
  assert.deepEqual(game, before);
  assert.equal(createTianGame().strugglesUsed, 0);
});

test("timing out with insufficient taps enters the normal failure result", () => {
  const game = capturedGame();
  for (let tap = 0; tap < 19; tap++) tapTianStruggle(game);
  for (let frame = 0; frame < 100; frame++) stepTianGame(game, 0.05);
  assert.equal(game.status, "caught");
  assert.equal(game.struggleLeft, 0);
  assert.equal(game.rescues, 0);
  tapTianStruggle(game);
  assert.equal(game.status, "caught", "a late tap cannot revive an expired struggle");
});

test("pause freezes both struggle and success timers and rejects taps", () => {
  const game = capturedGame();
  pauseTianGame(game);
  assert.equal(game.resumeStatus, "struggle");
  const before = structuredClone(game);
  stepTianGame(game, 100); tapTianStruggle(game);
  assert.deepEqual(game, before);
  resumeTianGame(game);
  for (let tap = 0; tap < 20; tap++) tapTianStruggle(game);
  pauseTianGame(game);
  assert.equal(game.resumeStatus, "rescued");
  stepTianGame(game, 100);
  assert.equal(game.countdown, 3);
  resumeTianGame(game);
  assert.equal(game.status, "rescued");
});

test("bait is available only while running safely without protection or cooldown", () => {
  for (const options of [{ status: "ready" }, { status: "countdown" }, { status: "paused" }, { status: "struggle" }, { status: "rescued" }, { hits: 1 }, { invincible: 1 }, { baitCooldown: 1 }]) {
    const game = isolatedGame(null, options);
    assert.equal(startTianBait(game), false);
    assert.equal(game.baitLeft, 0);
  }
  const game = isolatedGame();
  assert.equal(startTianBait(game), true);
  assert.equal(game.baitLeft, 10);
  assert.equal(baitBlockReason(game), "active");
  assert.equal(startTianBait(game), false, "repeat activation cannot extend the effect");
});

test("bait triples only newly collected coin scores, preserving coin counts and reactions", () => {
  const game = isolatedGame(null, { coins: 17 });
  const scoreBefore = runScore(game);
  startTianBait(game);
  assert.equal(runScore(game), scoreBefore, "existing coins must not receive retroactive multipliers");
  game.entities = [{ id: 200, lane: 1, kind: "coin", z: 0.1, resolved: false }];
  stepTianGame(game, 0.01);
  assert.equal(game.coins, 18);
  assert.equal(game.baitBonus, 50);
  assert.equal(visibleTianReaction(game), "grin");
  assert.equal(runScore(game), Math.floor(game.distance) * 2 + 18 * 25 + 50);
});

test("surviving ten seconds awards 200 once, then starts a full twenty-second cooldown", () => {
  const game = isolatedGame(); startTianBait(game);
  for (let frame = 0; frame < 199; frame++) stepTianGame(game, 0.05);
  assert.equal(game.baitOutcome, "active");
  assert.equal(game.baitBonus, 0);
  stepTianGame(game, 0.05);
  assert.equal(game.baitOutcome, "success");
  assert.equal(game.baitLeft, 0);
  assert.equal(game.baitCooldown, 20);
  assert.equal(game.baitBonus, 200);
  for (let frame = 0; frame < 399; frame++) stepTianGame(game, 0.05);
  assert.equal(startTianBait(game), false);
  assert.equal(game.baitBonus, 200);
  stepTianGame(game, 0.05);
  assert.equal(game.baitCooldown, 0);
  assert.equal(startTianBait(game), true);
});

test("a single bait collision captures immediately and keeps earned bonuses through rescue", () => {
  const game = isolatedGame(null, { coins: 5, baitBonus: 100 }); startTianBait(game);
  game.entities = [{ id: 201, lane: 1, kind: "cart", z: 0.1, resolved: false }];
  stepTianGame(game, 0.01);
  assert.equal(game.status, "struggle");
  assert.equal(game.caughtByBait, true);
  assert.equal(game.strugglesUsed, 1);
  assert.equal(game.baitOutcome, "caught");
  assert.equal(game.baitCooldown, 20);
  assert.equal(game.baitBonus, 100, "failure does not award survival points or revoke prior earnings");
  stepTianGame(game, 0.05);
  assert.equal(game.baitCooldown, 20, "struggle time cannot shorten cooldown");
  for (let tap = 0; tap < 20; tap++) tapTianStruggle(game);
  assert.equal(game.status, "rescued");
  assert.equal(game.baitCooldown, 20);
  assert.equal(game.baitBonus, 100);
  assert.equal(game.caughtByBait, false);
  assert.equal(game.baitLeft, 0);
  for (let frame = 0; frame < 60; frame++) stepTianGame(game, 0.05);
  assert.equal(baitBlockReason(game), "protected");
  assert.equal(startTianBait(game), false);
});

test("bait capture with no rescue opportunity ends the run", () => {
  const game = isolatedGame(null, { strugglesUsed: 2 }); startTianBait(game);
  game.entities = [{ id: 202, lane: 1, kind: "cart", z: 0.1, resolved: false }];
  stepTianGame(game, 0.01);
  assert.equal(game.status, "caught");
  assert.equal(game.caughtByBait, true);
  assert.equal(game.strugglesUsed, 2);
});

test("bait speed changes smoothly, stays bounded, and timers freeze while paused", () => {
  const game = isolatedGame(); const normalSpeed = runSpeed(game);
  startTianBait(game);
  assert.equal(runSpeed(game), normalSpeed);
  stepTianGame(game, 0.01);
  assert.ok(game.baitBoost > 0 && game.baitBoost < 0.03);
  for (let frame = 0; frame < 40; frame++) stepTianGame(game, 0.05);
  assert.ok(game.baitBoost > 0.119 && game.baitBoost <= 0.12);
  pauseTianGame(game);
  const before = structuredClone(game); stepTianGame(game, 99);
  assert.deepEqual(game, before);
  resumeTianGame(game);
  for (let frame = 0; frame < 160; frame++) stepTianGame(game, 0.05);
  assert.equal(game.baitOutcome, "success");
  const boostAtEnd = game.baitBoost;
  stepTianGame(game, 0.05);
  assert.ok(game.baitBoost < boostAtEnd);
  pauseTianGame(game);
  const cooldown = game.baitCooldown; stepTianGame(game, 99);
  assert.equal(game.baitCooldown, cooldown);
});
