export type RunStatus = "ready" | "countdown" | "running" | "paused" | "struggle" | "rescued" | "caught";
export type RunAction = "left" | "right" | "jump" | "slide";
export type ObstacleKind = "barrier" | "arch" | "cart" | "car" | "truck" | "coin";
export type CoinPickup = "ground" | "air" | "low";
export type TianReaction = "tongue" | "grin" | "shush" | "smirk" | "fear";
export type RunEntity = {
  id: number; lane: number; z: number; kind: ObstacleKind; resolved: boolean;
  pickup?: CoinPickup;
  pace?: number;
};
export const LOOK_AHEAD = 120;
export const START_SPEED = 32;
export const JUMP_SECONDS = 0.86;
export const SLIDE_SECONDS = 0.9;
export const MAX_STRUGGLES = 2;
export const STRUGGLE_SECONDS = 5;
export const STRUGGLE_TARGETS = [20, 28] as const;
export const BAIT_SECONDS = 10;
export const BAIT_COOLDOWN = 20;

export type TianGame = {
  status: RunStatus;
  resumeStatus: "running" | "countdown" | "struggle" | "rescued";
  countdown: number;
  elapsed: number;
  distance: number;
  lane: number;
  visualLane: number;
  jump: number;
  slide: number;
  gap: number;
  coins: number;
  dodged: number;
  hits: number;
  invincible: number;
  stumble: number;
  nextRow: number;
  rows: number;
  entities: RunEntity[];
  nextId: number;
  seed: number;
  notice: string;
  noticeLeft: number;
  reaction: TianReaction;
  reactionUntil: number;
  carJumpStreak: number;
  recordTarget: number;
  recordCelebrated: boolean;
  strugglesUsed: number;
  rescues: number;
  struggleLeft: number;
  struggleTaps: number;
  struggleTarget: number;
  baitLeft: number;
  baitCooldown: number;
  baitBoost: number;
  baitBonus: number;
  baitOutcome: "none" | "active" | "success" | "caught";
  baitNoticeUntil: number;
  caughtByBait: boolean;
};

export function createTianGame(seed = 81377): TianGame {
  return {
    status: "ready", resumeStatus: "running", countdown: 3,
    elapsed: 0, distance: 0, lane: 1, visualLane: 1, jump: 0, slide: 0,
    gap: 32, coins: 0, dodged: 0, hits: 0, invincible: 0, stumble: 0,
    nextRow: 0, rows: 0, entities: [], nextId: 0, seed: seed >>> 0 || 1,
    notice: "", noticeLeft: 0,
    reaction: "smirk", reactionUntil: 0, carJumpStreak: 0,
    recordTarget: 0, recordCelebrated: false,
    strugglesUsed: 0, rescues: 0, struggleLeft: 0, struggleTaps: 0, struggleTarget: STRUGGLE_TARGETS[0],
    baitLeft: 0, baitCooldown: 0, baitBoost: 0, baitBonus: 0, baitOutcome: "none", baitNoticeUntil: 0, caughtByBait: false,
  };
}

function random(game: TianGame) {
  let seed = game.seed;
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  game.seed = seed >>> 0;
  return game.seed / 4294967296;
}

export function startTianGame(game: TianGame) {
  if (game.status === "ready") game.status = "countdown";
}

export function pauseTianGame(game: TianGame) {
  if (game.status === "running" || game.status === "countdown" || game.status === "struggle" || game.status === "rescued") {
    game.resumeStatus = game.status;
    game.status = "paused";
  }
}

export function resumeTianGame(game: TianGame) {
  if (game.status === "paused") game.status = game.resumeStatus;
}

function enterStruggle(game: TianGame) {
  if (game.strugglesUsed >= MAX_STRUGGLES) { game.status = "caught"; return; }
  game.struggleTarget = STRUGGLE_TARGETS[game.strugglesUsed];
  game.strugglesUsed++;
  game.struggleTaps = 0;
  game.struggleLeft = STRUGGLE_SECONDS;
  game.jump = 0; game.slide = 0; game.stumble = 0;
  game.status = "struggle";
}

export function tapTianStruggle(game: TianGame) {
  if (game.status !== "struggle" || game.struggleLeft <= 0) return;
  game.struggleTaps = Math.min(game.struggleTarget, game.struggleTaps + 1);
  if (game.struggleTaps < game.struggleTarget) return;
  game.rescues++;
  game.status = "rescued";
  game.countdown = 3;
  game.hits = 0; game.gap = 32; game.invincible = 2;
  game.jump = 0; game.slide = 0; game.stumble = 0;
  game.notice = ""; game.noticeLeft = 0;
  game.reaction = "smirk"; game.reactionUntil = game.elapsed + 3;
  game.carJumpStreak = 0;
  game.caughtByBait = false;
  game.baitOutcome = "none"; game.baitNoticeUntil = 0;
  const speed = baseRunSpeed(game.distance);
  game.entities = game.entities.filter((item) => item.z / entityPace(item) > speed * 2);
  game.nextRow = Math.max(game.nextRow, game.distance + speed);
}

export function actTianGame(game: TianGame, action: RunAction) {
  if (game.status !== "running") return;
  if (action === "left") game.lane = Math.max(0, game.lane - 1);
  if (action === "right") game.lane = Math.min(2, game.lane + 1);
  if (action === "jump" && game.jump <= 0 && game.slide <= 0) game.jump = JUMP_SECONDS;
  if (action === "slide" && game.slide <= 0 && game.jump <= 0) game.slide = SLIDE_SECONDS;
}

export function jumpHeight(game: TianGame) {
  return game.jump > 0 ? Math.sin((1 - game.jump / JUMP_SECONDS) * Math.PI) : 0;
}

export function runScore(game: TianGame) {
  return Math.floor(game.distance) * 2 + game.coins * 25 + game.dodged * 35 + game.baitBonus;
}

export function runSpeed(game: TianGame) {
  return baseRunSpeed(game.distance) * (1 + game.baitBoost) * (game.stumble > 0 ? 0.62 : 1);
}

export function baitBlockReason(game: TianGame) {
  if (game.baitLeft > 0) return "active";
  if (game.status !== "running") return "phase";
  if (game.hits > 0) return "hurt";
  if (game.invincible > 0) return "protected";
  if (game.baitCooldown > 0) return "cooldown";
  return "";
}

export function startTianBait(game: TianGame) {
  if (baitBlockReason(game)) return false;
  game.baitLeft = BAIT_SECONDS;
  game.baitOutcome = "active";
  game.baitNoticeUntil = 0;
  return true;
}

function finishBait(game: TianGame, success: boolean) {
  game.baitLeft = 0;
  game.baitCooldown = BAIT_COOLDOWN;
  game.baitOutcome = success ? "success" : "caught";
  game.baitNoticeUntil = game.elapsed + 3;
  if (success) game.baitBonus += 200;
  else game.baitBoost = 0;
}

export function baseRunSpeed(distance: number) {
  // A faster opening and a smooth, bounded ramp keep endless play responsive at long distances.
  return START_SPEED + 54 * (1 - Math.exp(-distance / 1400));
}

export function rowInterval(distance: number) {
  return 2.1 - 0.9 * (1 - Math.exp(-distance / 1200));
}

export function entityPace(item: RunEntity) {
  return item.pace ?? (item.kind === "car" ? 1.6 : item.kind === "truck" ? 1.3 : 1);
}

function react(game: TianGame, reaction: TianReaction) {
  if (game.hits > 0) return;
  game.reaction = reaction;
  game.reactionUntil = game.elapsed + 3;
}

export function visibleTianReaction(game: TianGame): TianReaction {
  if (game.hits > 0) return "fear";
  return game.elapsed < game.reactionUntil ? game.reaction : "smirk";
}

function spawnRow(game: TianGame) {
  // Rotate through action/ground/traffic routes, with randomized lanes and secondary obstacles.
  // Every row still leaves an empty escape lane; coins can deliberately reward a harder route.
  const safeLane = Math.floor(random(game) * 3);
  const otherLanes = [0, 1, 2].filter((lane) => lane !== safeLane);
  if (random(game) < 0.5) otherLanes.reverse();
  const [challengeLane, secondaryLane] = otherLanes;
  const pattern = game.rows % 4;
  let coinLane = challengeLane;
  let pickup: CoinPickup = "air";
  let coinPace = 1;
  const addObstacle = (lane: number, kind: ObstacleKind) => {
    const pace = kind === "car" ? 1.6 : kind === "truck" ? 1.3 : 1;
    // Normalize collision time across moving and stationary rows. Traffic moves toward the player,
    // but cannot overtake another row and turn a previously safe path into an unavoidable trap.
    game.entities.push({ id: game.nextId++, lane, z: LOOK_AHEAD * pace, kind, resolved: false, pace });
  };
  if (pattern === 1) {
    coinLane = safeLane; pickup = "ground";
    addObstacle(challengeLane, game.distance > 180 ? "cart" : "barrier");
    if (game.distance > 160) addObstacle(secondaryLane, random(game) < 0.5 ? "barrier" : "arch");
  } else if (pattern === 2) {
    pickup = "low";
    addObstacle(challengeLane, "arch");
    if (game.distance > 160) addObstacle(secondaryLane, game.distance > 400 ? "truck" : "cart");
  } else if (pattern === 3 && game.distance > 180) {
    addObstacle(challengeLane, "car"); coinPace = 1.6;
    if (game.distance > 300) addObstacle(secondaryLane, "truck");
  } else {
    addObstacle(challengeLane, "barrier");
    if (game.distance > 160) addObstacle(secondaryLane, random(game) < 0.5 ? "cart" : "arch");
  }
  // Close clusters fit a single jump/slide even at the opening speed. Pickup posture is enforced.
  for (const offset of [-3, 0, 3]) {
    game.entities.push({ id: game.nextId++, lane: coinLane, z: (LOOK_AHEAD + offset) * coinPace,
      kind: "coin", pickup, pace: coinPace, resolved: false });
  }
  game.rows++;
}

export function stepTianGame(game: TianGame, seconds: number) {
  if (!["running", "countdown", "struggle", "rescued"].includes(game.status)) return;
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  // A suspended tab must never skip an obstacle or consume a run on resume.
  const dt = Math.min(seconds, 0.05);
  if (game.status === "struggle") {
    game.struggleLeft = Math.max(0, game.struggleLeft - dt);
    if (game.struggleLeft <= 0.000001) { game.struggleLeft = 0; game.status = "caught"; }
    return;
  }
  if (game.status === "countdown" || game.status === "rescued") {
    game.countdown = Math.max(0, game.countdown - dt);
    if (game.countdown <= 0.000001) { game.countdown = 0; game.status = "running"; }
    return;
  }
  game.elapsed += dt;
  const baitWasActive = game.baitLeft > 0;
  game.baitBoost += ((baitWasActive ? 0.12 : 0) - game.baitBoost) * (1 - Math.exp(-7 * dt));
  if (game.baitBoost < 0.000001) game.baitBoost = 0;
  if (!baitWasActive) {
    game.baitCooldown = Math.max(0, game.baitCooldown - dt);
    if (game.baitCooldown < 0.000001) game.baitCooldown = 0;
  }
  game.jump = Math.max(0, game.jump - dt);
  game.slide = Math.max(0, game.slide - dt);
  game.invincible = Math.max(0, game.invincible - dt);
  game.stumble = Math.max(0, game.stumble - dt);
  game.noticeLeft = Math.max(0, game.noticeLeft - dt);
  game.visualLane += (game.lane - game.visualLane) * (1 - Math.exp(-18 * dt));
  const travel = runSpeed(game) * dt;
  const previousDistance = game.distance;
  game.distance += travel;
  if (Math.floor(game.distance / 1000) > Math.floor(previousDistance / 1000)) react(game, "shush");
  if (game.distance >= game.nextRow) {
    spawnRow(game);
    // Time between rows tightens toward 1.2s while preserving a full jump/slide recovery window.
    game.nextRow = game.distance + baseRunSpeed(game.distance) * rowInterval(game.distance);
  }

  for (const item of game.entities) {
    const before = item.z;
    item.z -= travel * entityPace(item);
    if (item.resolved || before < 0 || item.z > 0) continue;
    item.resolved = true;
    const sameLane = Math.abs(game.visualLane - item.lane) < 0.42;
    if (item.kind === "coin") {
      const height = jumpHeight(game);
      const posture = item.pickup === "air" ? height >= 0.5
        : item.pickup === "low" ? game.slide > 0.08
        : game.slide <= 0 && height < 0.35;
      if (sameLane && posture) {
        game.coins++;
        if (baitWasActive) game.baitBonus += 50;
        if (game.coins % 18 === 0) react(game, "grin");
      }
      continue;
    }
    const avoided = !sameLane || (item.kind === "barrier" && jumpHeight(game) >= 0.42)
      || (item.kind === "car" && jumpHeight(game) >= 0.55)
      || (item.kind === "arch" && game.slide > 0.08);
    if (avoided) {
      game.dodged++;
      if (item.kind === "car") {
        game.carJumpStreak = sameLane ? game.carJumpStreak + 1 : 0;
        if (game.carJumpStreak > 0 && game.carJumpStreak % 3 === 0) react(game, "tongue");
      }
    } else if (game.invincible <= 0) {
      game.hits = baitWasActive ? 2 : game.hits + 1;
      game.carJumpStreak = 0;
      game.gap = game.hits === 1 ? 6 : 0;
      game.stumble = 0.7;
      game.invincible = 0.9;
      game.notice = game.hits === 1 ? "第一次磕绊！再撞一次就被抓了" : "第二次磕绊，被抓住了！";
      game.noticeLeft = 2.3;
      if (game.hits >= 2) {
        game.caughtByBait = baitWasActive;
        if (baitWasActive) finishBait(game, false);
        enterStruggle(game); break;
      }
    }
  }
  game.entities = game.entities.filter((item) => item.z > -18);
  if (baitWasActive && game.status === "running" && game.baitLeft > 0) {
    game.baitLeft = Math.max(0, game.baitLeft - dt);
    if (game.baitLeft <= 0.000001) finishBait(game, true);
  }
  if (!game.recordCelebrated && game.recordTarget > 0 && runScore(game) > game.recordTarget) {
    game.recordCelebrated = true;
    react(game, "smirk");
  }
}

export function tianSnapshot(game: TianGame) {
  return {
    status: game.status, distance: Math.floor(game.distance), score: runScore(game),
    coins: game.coins, gap: Math.round(game.gap), hits: game.hits, dodged: game.dodged,
    seconds: Math.floor(game.elapsed), countdown: Math.ceil(game.countdown),
    tempo: baseRunSpeed(game.distance) * (1 + game.baitBoost) / START_SPEED,
    reaction: visibleTianReaction(game),
    strugglesLeft: MAX_STRUGGLES - game.strugglesUsed, strugglesUsed: game.strugglesUsed,
    rescues: game.rescues, struggleLeft: game.struggleLeft,
    struggleTaps: game.struggleTaps, struggleTarget: game.struggleTarget,
    pausedFrom: game.resumeStatus,
    baitLeft: game.baitLeft, baitCooldown: game.baitCooldown, baitBlock: baitBlockReason(game),
    baitBonus: game.baitBonus, baitOutcome: game.baitOutcome, caughtByBait: game.caughtByBait,
    baitSuccessNotice: game.baitOutcome === "success" && game.elapsed < game.baitNoticeUntil,
    notice: game.noticeLeft > 0 ? game.notice : "",
  };
}
