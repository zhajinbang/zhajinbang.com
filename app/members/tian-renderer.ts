import { jumpHeight, type RunEntity, type TianGame } from "./tian-game";

export type RunAssets = { map: HTMLImageElement; runner: HTMLImageElement; chaser: HTMLImageElement };

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 5) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

function project(w: number, h: number, lane: number, z: number) {
  const scale = 22 / (22 + Math.max(-6, z));
  return { x: w / 2 + (lane - 1) * w * 0.325 * scale, y: h * (0.38 + 0.52 * scale), scale };
}

function drawEntity(ctx: CanvasRenderingContext2D, item: RunEntity, w: number, h: number) {
  const p = project(w, h, item.lane, item.z);
  const unit = Math.min(w * 0.235, h * 0.32) * p.scale;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (165 - item.z) / 25);
  ctx.translate(p.x, p.y);
  ctx.fillStyle = "#15120d55";
  ctx.beginPath(); ctx.ellipse(0, 0, unit * (item.kind === "coin" ? 0.12 : 0.53), unit * (item.kind === "coin" ? 0.035 : 0.11), 0, 0, Math.PI * 2); ctx.fill();
  if (item.kind === "coin") {
    ctx.translate(0, -unit * (item.pickup === "air" ? 1.02 : item.pickup === "low" ? 0.17 : 0.37));
    ctx.fillStyle = "#ffdc71"; ctx.shadowColor = "#ffdf7e"; ctx.shadowBlur = 10 * p.scale;
    ctx.beginPath(); ctx.ellipse(0, 0, unit * 0.11, unit * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = "#9a661d"; ctx.lineWidth = Math.max(1, unit * 0.013);
    ctx.stroke(); ctx.fillStyle = "#9a661d"; ctx.font = `bold ${unit * 0.16}px Arial`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("田", 0, 0);
    ctx.restore(); return;
  }
  ctx.lineWidth = Math.max(1, unit * 0.025);
  if (item.kind === "barrier") {
    ctx.fillStyle = "#3d3430"; rounded(ctx, -unit * 0.48, -unit * 0.37, unit * 0.96, unit * 0.3, unit * 0.025);
    ctx.save(); ctx.beginPath(); ctx.rect(-unit * 0.48, -unit * 0.37, unit * 0.96, unit * 0.3); ctx.clip();
    ctx.strokeStyle = "#f0ba4d"; ctx.lineWidth = unit * 0.12;
    for (let i = -3; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(i * unit * 0.28, -unit * 0.4); ctx.lineTo(i * unit * 0.28 - unit * 0.28, 0); ctx.stroke();
    }
    ctx.restore(); ctx.fillStyle = "#37302a";
    rounded(ctx, -unit * 0.5, -unit * 0.08, unit * 0.2, unit * 0.09, 1);
    rounded(ctx, unit * 0.3, -unit * 0.08, unit * 0.2, unit * 0.09, 1);
  } else if (item.kind === "arch") {
    ctx.fillStyle = "#dcae54";
    rounded(ctx, -unit * 0.48, -unit * 0.95, unit * 0.07, unit * 0.95, 2);
    rounded(ctx, unit * 0.41, -unit * 0.95, unit * 0.07, unit * 0.95, 2);
    rounded(ctx, -unit * 0.52, -unit * 0.95, unit * 1.04, unit * 0.34, 3);
    ctx.strokeStyle = "#201b16"; ctx.lineWidth = unit * 0.04;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * unit * 0.14, -unit * 0.92); ctx.lineTo(i * unit * 0.14 - unit * 0.1, -unit * 0.65); ctx.stroke();
    }
  } else if (item.kind === "cart") {
    ctx.fillStyle = "#292e30"; rounded(ctx, -unit * 0.44, -unit * 0.65, unit * 0.88, unit * 0.56, unit * 0.025);
    ctx.strokeStyle = "#a07839"; ctx.strokeRect(-unit * 0.4, -unit * 0.6, unit * 0.8, unit * 0.46);
    ctx.fillStyle = "#e2b653"; rounded(ctx, -unit * 0.52, -unit * 1.02, unit * 1.04, unit * 0.2, 2);
    ctx.fillStyle = "#5b4730"; rounded(ctx, -unit * 0.44, -unit * 0.85, unit * 0.045, unit * 0.3, 0);
    rounded(ctx, unit * 0.395, -unit * 0.85, unit * 0.045, unit * 0.3, 0);
    ctx.fillStyle = "#17191a";
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * unit * 0.29, -unit * 0.06, unit * 0.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#f7d591"; ctx.font = `bold ${unit * 0.13}px Arial`; ctx.textAlign = "center";
    ctx.fillText("赤峰小吃", 0, -unit * 0.34);
  } else if (item.kind === "car") {
    // Front-facing sedan: roof, windshield, hood, grille and two headlights.
    ctx.fillStyle = "#171b20";
    rounded(ctx, -unit * 0.39, -unit * 0.22, unit * 0.16, unit * 0.24, unit * 0.035);
    rounded(ctx, unit * 0.23, -unit * 0.22, unit * 0.16, unit * 0.24, unit * 0.035);
    const body = ctx.createLinearGradient(0, -unit * 0.66, 0, 0);
    body.addColorStop(0, "#a29a83"); body.addColorStop(0.5, "#5b6064"); body.addColorStop(1, "#242c33");
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(-unit * 0.28, -unit * 0.63); ctx.quadraticCurveTo(0, -unit * 0.72, unit * 0.28, -unit * 0.63);
    ctx.lineTo(unit * 0.39, -unit * 0.35); ctx.lineTo(unit * 0.44, -unit * 0.25); ctx.lineTo(unit * 0.43, -unit * 0.05);
    ctx.lineTo(-unit * 0.43, -unit * 0.05); ctx.lineTo(-unit * 0.44, -unit * 0.25); ctx.lineTo(-unit * 0.39, -unit * 0.35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#213b4a";
    ctx.beginPath(); ctx.moveTo(-unit * 0.25, -unit * 0.59); ctx.lineTo(unit * 0.25, -unit * 0.59);
    ctx.lineTo(unit * 0.33, -unit * 0.39); ctx.lineTo(-unit * 0.33, -unit * 0.39); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#b8dce085"; ctx.lineWidth = unit * 0.015;
    ctx.beginPath(); ctx.moveTo(-unit * 0.2, -unit * 0.56); ctx.lineTo(unit * 0.19, -unit * 0.44); ctx.stroke();
    ctx.fillStyle = "#768083"; rounded(ctx, -unit * 0.34, -unit * 0.36, unit * 0.68, unit * 0.1, unit * 0.02);
    ctx.fillStyle = "#11181c"; rounded(ctx, -unit * 0.19, -unit * 0.22, unit * 0.38, unit * 0.1, 2);
    ctx.fillStyle = "#ffe6a3";
    rounded(ctx, -unit * 0.38, -unit * 0.24, unit * 0.15, unit * 0.065, unit * 0.02);
    rounded(ctx, unit * 0.23, -unit * 0.24, unit * 0.15, unit * 0.065, unit * 0.02);
    ctx.fillStyle = "#a99263"; rounded(ctx, -unit * 0.12, -unit * 0.1, unit * 0.24, unit * 0.035, 1);
    ctx.strokeStyle = "#d0b77d"; ctx.lineWidth = unit * 0.015;
    ctx.beginPath(); ctx.moveTo(-unit * 0.38, -unit * 0.055); ctx.lineTo(unit * 0.38, -unit * 0.055); ctx.stroke();
  } else if (item.kind === "truck") {
    // Tall box truck, visually distinct from a jumpable low sedan.
    ctx.fillStyle = "#262c31"; rounded(ctx, -unit * 0.46, -unit * 1.5, unit * 0.92, unit * 1.26, unit * 0.035);
    ctx.fillStyle = "#697074"; rounded(ctx, -unit * 0.4, -unit * 1.44, unit * 0.8, unit * 0.7, 1);
    ctx.strokeStyle = "#434b50"; ctx.lineWidth = unit * 0.018;
    for (let line = 0; line < 5; line++) {
      ctx.beginPath(); ctx.moveTo(-unit * 0.38, -unit * (1.36 - line * 0.12)); ctx.lineTo(unit * 0.38, -unit * (1.36 - line * 0.12)); ctx.stroke();
    }
    ctx.fillStyle = "#1b1e20";
    rounded(ctx, -unit * 0.46, -unit * 0.27, unit * 0.15, unit * 0.29, unit * 0.025);
    rounded(ctx, unit * 0.31, -unit * 0.27, unit * 0.15, unit * 0.29, unit * 0.025);
    const cab = ctx.createLinearGradient(0, -unit * 0.76, 0, 0);
    cab.addColorStop(0, "#e5bc66"); cab.addColorStop(1, "#85622a");
    ctx.fillStyle = cab; rounded(ctx, -unit * 0.43, -unit * 0.79, unit * 0.86, unit * 0.71, unit * 0.04);
    ctx.fillStyle = "#1e3744"; rounded(ctx, -unit * 0.36, -unit * 0.71, unit * 0.72, unit * 0.29, unit * 0.02);
    ctx.strokeStyle = "#d9e6dd77"; ctx.lineWidth = unit * 0.012;
    ctx.beginPath(); ctx.moveTo(0, -unit * 0.7); ctx.lineTo(0, -unit * 0.43); ctx.stroke();
    ctx.fillStyle = "#242a2f"; rounded(ctx, -unit * 0.2, -unit * 0.32, unit * 0.4, unit * 0.14, 1);
    ctx.fillStyle = "#fceab8";
    rounded(ctx, -unit * 0.37, -unit * 0.28, unit * 0.13, unit * 0.07, 1);
    rounded(ctx, unit * 0.24, -unit * 0.28, unit * 0.13, unit * 0.07, 1);
    ctx.fillStyle = "#55554b"; rounded(ctx, -unit * 0.46, -unit * 0.13, unit * 0.92, unit * 0.07, 1);
  }
  ctx.restore();
}

export function drawTianGame(ctx: CanvasRenderingContext2D, game: TianGame, assets: RunAssets, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  // Keep the locality artwork as a scenic backdrop. Gameplay road and props are rendered separately.
  const cover = Math.max(w / assets.map.width, h / assets.map.height);
  ctx.drawImage(assets.map, (w - assets.map.width * cover) / 2, (h - assets.map.height * cover) / 2, assets.map.width * cover, assets.map.height * cover);
  const hy = h * 0.38;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(w * 0.475, hy); ctx.lineTo(w * 0.525, hy);
  ctx.lineTo(w * 1.08, h); ctx.lineTo(-w * 0.08, h); ctx.closePath(); ctx.clip();
  const asphalt = ctx.createLinearGradient(0, hy, 0, h);
  asphalt.addColorStop(0, "#727780"); asphalt.addColorStop(1, "#484850");
  ctx.fillStyle = asphalt; ctx.fillRect(0, hy, w, h - hy);
  // Perspective markings advance with traveled distance, including while jumping.
  const offset = game.distance % 15;
  for (let z = -offset; z < 160; z += 15) {
    if (z < -5) continue;
    for (const line of [0.5, 1.5]) {
      const near = project(w, h, line, z);
      const far = project(w, h, line, z + 7);
      ctx.strokeStyle = "#f4eed9d9"; ctx.lineWidth = Math.max(1, w * 0.007 * near.scale);
      ctx.beginPath(); ctx.moveTo(near.x, near.y); ctx.lineTo(far.x, far.y); ctx.stroke();
    }
  }
  ctx.strokeStyle = "#e8d4a499"; ctx.lineWidth = 2;
  for (const edge of [-0.5, 2.5]) {
    const near = project(w, h, edge, -5); const far = project(w, h, edge, 180);
    ctx.beginPath(); ctx.moveTo(near.x, near.y); ctx.lineTo(far.x, far.y); ctx.stroke();
  }
  // Small foreground roadside posts provide motion without hiding the sightline.
  for (let z = 160 - game.distance % 22; z > -5; z -= 22) {
    for (const side of [-0.85, 2.85]) {
      const p = project(w, h, side, z); const height = h * 0.14 * p.scale;
      ctx.fillStyle = "#e8be63"; ctx.fillRect(p.x - 2 * p.scale, p.y - height, 4 * p.scale, height);
      ctx.fillStyle = "#fff4d4"; ctx.beginPath(); ctx.arc(p.x, p.y - height, 4 * p.scale, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  const fog = ctx.createLinearGradient(0, hy - 12, 0, hy + h * 0.16);
  fog.addColorStop(0, "#cfdfed55"); fog.addColorStop(1, "#cfdfed00");
  ctx.fillStyle = fog; ctx.fillRect(w * 0.4, hy - 12, w * 0.2, h * 0.16);

  const entities = [...game.entities].sort((a, b) => b.z - a.z);
  for (const item of entities.filter((item) => item.z >= 0)) drawEntity(ctx, item, w, h);
  const player = project(w, h, game.visualLane, 0);
  const active = game.status === "running";
  const bob = active && game.jump <= 0 && game.slide <= 0 ? Math.sin(game.distance * 1.3) * 2.5 : 0;
  const spriteHeight = Math.min(h * 0.275, w * 0.34);
  const spriteWidth = spriteHeight * assets.runner.width / assets.runner.height;
  ctx.save();
  ctx.fillStyle = "#16120a44"; ctx.beginPath(); ctx.ellipse(player.x, player.y, spriteWidth * 0.36, spriteWidth * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  if (game.invincible > 0 && Math.floor(game.invincible * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.translate(player.x, player.y - jumpHeight(game) * h * 0.24 + bob);
  const tilt = active ? Math.sin(game.distance * 0.65) * 0.035 : 0;
  ctx.rotate(tilt + (game.lane - game.visualLane) * 0.09);
  if (game.slide > 0) ctx.scale(1.15, 0.46);
  ctx.drawImage(assets.runner, -spriteWidth / 2, -spriteHeight, spriteWidth, spriteHeight);
  ctx.restore();
  for (const item of entities.filter((item) => item.z < 0)) drawEntity(ctx, item, w, h);

  // The pursuer only enters at the very bottom when a collision brings him close.
  if (game.gap < 20 || game.status === "caught") {
    const danger = Math.max(0, 1 - game.gap / 20);
    const ch = h * 0.4;
    const cw = ch * assets.chaser.width / assets.chaser.height;
    ctx.save(); ctx.globalAlpha = 0.85;
    ctx.drawImage(assets.chaser, player.x - cw / 2, h - ch * (0.2 + danger * 0.5), cw, ch);
    ctx.restore();
  }
  if (game.stumble > 0) {
    ctx.fillStyle = `rgba(166, 64, 26, ${game.stumble * 0.2})`; ctx.fillRect(0, 0, w, h);
  }
}
