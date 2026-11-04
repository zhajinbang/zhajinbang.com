export const ammo = [
  {
    id: "normal",
    name: "普通",
    weight: 400,
    boostedWeight: 390,
    score: 10,
    color: "#c9ae7e",
    effect: "短金尾迹",
    rare: false,
    hidden: false,
  },
  {
    id: "mithril",
    name: "秘银",
    weight: 200,
    boostedWeight: 200,
    score: 20,
    color: "#e2ded0",
    effect: "银白冷光与细金轨迹",
    rare: false,
    hidden: false,
  },
  {
    id: "gold",
    name: "黄金",
    weight: 70,
    boostedWeight: 70,
    score: 40,
    color: "#ffc84c",
    effect: "金色火花与璀璨光轨",
    rare: true,
    hidden: false,
  },
  {
    id: "crystal",
    name: "水晶",
    weight: 30,
    boostedWeight: 30,
    score: 80,
    color: "#ffe6b3",
    effect: "香槟色棱镜碎光",
    rare: true,
    hidden: false,
  },
  {
    id: "demon",
    name: "恶魔",
    weight: 0,
    boostedWeight: 5,
    score: 200,
    color: "#d88c28",
    effect: "黑金裂焰与暗金光环",
    rare: true,
    hidden: true,
  },
  {
    id: "wood",
    name: "木制",
    weight: 300,
    boostedWeight: 300,
    score: 5,
    color: "#ba8248",
    effect: "木屑与暖棕尾迹",
    rare: false,
    hidden: false,
  },
  {
    id: "slime-ivory",
    name: "粘液象牙",
    weight: 0,
    boostedWeight: 5,
    score: 200,
    color: "#fff0c9",
    effect: "象牙碎光与金色黏液拉丝",
    rare: true,
    hidden: true,
  },
] as const;

export type RoseTarget = {
  x: number;
  y: number;
  cycle: number;
  resolved: boolean;
};
export type Shot = {
  material: number;
  x: number;
  y: number;
  endX: number;
  endY: number;
  age: number;
  vx: number;
  vy: number;
  flightSeconds: number;
};
export type Burst = { x: number; y: number; age: number; score: number };
export function createGame(duration = 0.8) {
  return {
    counts: ammo.map(() => 0),
    hits: 0,
    misses: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    heat: 0,
    boostedSeconds: 0,
    boostedElapsed: 0,
    activations: 0,
    hiddenShots: 0,
    time: 0,
    duration,
    roseTarget: null as RoseTarget | null,
    shots: [] as Shot[],
    bursts: [] as Burst[],
  };
}
export type Game = ReturnType<typeof createGame>;
export function shotOrigin(height: number) {
  return { x: 0.5, y: 1 - (Math.min(height * 0.19, 310 / 3) * 0.62) / height };
}
export function visibleRose(game: Game) {
  const target = game.roseTarget;
  return target &&
    (game.boostedSeconds > 0 ||
      (!target.resolved && game.time < target.cycle + game.duration))
    ? target
    : null;
}
function miss(game: Game) {
  game.misses++;
  game.combo = 0;
  if (game.boostedSeconds === 0) game.heat = Math.max(0, game.heat - 20);
}
export function fireShot(
  game: Game,
  aim: { x: number; y: number },
  width: number,
  height: number,
  random = Math.random(),
) {
  let roll = random * 1000;
  const material = ammo.findIndex((entry) => {
    roll -= game.boostedSeconds > 0 ? entry.boostedWeight : entry.weight;
    return roll < 0;
  });
  if (material < 0) return null;
  game.counts[material]++;
  if (ammo[material].hidden) game.hiddenShots++;
  const origin = shotOrigin(height);
  game.shots.push({
    material,
    ...origin,
    endX: aim.x,
    endY: aim.y,
    vx: aim.x - origin.x,
    vy: aim.y - origin.y,
    age: 0,
    flightSeconds: game.boostedSeconds > 0 ? 1.8 : 0.22,
  });
  const target = visibleRose(game);
  const radius = 32;
  if (
    target &&
    Math.hypot((aim.x - target.x) * width, (aim.y - target.y) * height) <=
      radius
  ) {
    if (game.boostedSeconds === 0) target.resolved = true;
    const score = ammo[material].score;
    game.hits++;
    game.score += score;
    game.combo++;
    game.bestCombo = Math.max(game.bestCombo, game.combo);
    game.bursts.push({ x: target.x, y: target.y, age: 0, score });
    if (game.boostedSeconds === 0) {
      game.heat = Math.min(100, game.heat + 10);
      if (game.heat === 100) {
        game.boostedSeconds = 15;
        game.activations++;
        game.roseTarget = {
          x: 0.5,
          y: 0.38,
          cycle: -game.activations,
          resolved: false,
        };
      }
    }
  } else {
    miss(game);
  }
  return material;
}
export function stepGame(
  game: Game,
  dt: number,
  _width: number,
  _height: number,
) {
  game.time += dt;
  if (game.boostedSeconds > 0) {
    game.boostedElapsed += Math.min(dt, game.boostedSeconds);
    game.boostedSeconds = Math.max(0, game.boostedSeconds - dt);
    if (game.boostedSeconds === 0) {
      game.heat = 0;
      game.roseTarget = null;
      game.time = Math.ceil(game.time);
    }
  }
  const previous = game.roseTarget;
  if (
    previous &&
    game.boostedSeconds === 0 &&
    !previous.resolved &&
    game.time >= previous.cycle + game.duration
  ) {
    previous.resolved = true;
    miss(game);
  }
  const cycle = Math.floor(game.time);
  if (game.boostedSeconds === 0 && game.roseTarget?.cycle !== cycle) {
    let x = 0.1 + Math.random() * 0.8;
    const y = 0.28 + Math.random() * 0.42;
    if (previous && Math.hypot(x - previous.x, y - previous.y) < 0.24) {
      x =
        previous.x < 0.5
          ? 0.75 + Math.random() * 0.15
          : 0.1 + Math.random() * 0.15;
    }
    game.roseTarget = { x, y, cycle, resolved: false };
  }
  game.bursts = game.bursts.filter((burst) => (burst.age += dt) < 0.8);
  game.shots = game.shots.filter((shot) => {
    shot.age += dt;
    const t = Math.min(1, shot.age / shot.flightSeconds);
    const origin = shotOrigin(_height);
    shot.x = origin.x + (shot.endX - origin.x) * t;
    shot.y = origin.y + (shot.endY - origin.y) * t;
    return shot.age < shot.flightSeconds;
  });
}
export function gameSnapshot(game: Game) {
  return {
    counts: [...game.counts],
    hits: game.hits,
    misses: game.misses,
    score: game.score,
    combo: game.combo,
    bestCombo: game.bestCombo,
    heat: game.heat,
    boostedSeconds: game.boostedSeconds,
    boostedElapsed: game.boostedElapsed,
    activations: game.activations,
    hiddenShots: game.hiddenShots,
  };
}
