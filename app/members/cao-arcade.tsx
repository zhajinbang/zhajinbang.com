"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./cao-arcade.module.css";
import CaoAchievements from "./cao-achievements";
import useBoostTime from "./use-boost-time";
import { ammo, createGame, fireShot, gameSnapshot, stepGame } from "./cao-game";
import type { PointerEvent as ReactPointerEvent } from "react";
import { visibleRose } from "./cao-game";
import type { RoseTarget } from "./cao-game";

const storageKey = "zhajinbang-cao-collection-v1";
const sprite = (id: string) => `/ammo/cao-v1/cao-${id}.png`;
export default function CaoArcade() {
  const gameRef = useRef(createGame());
  const [stats, setStats] = useState(() => gameSnapshot(gameRef.current));
  const lifetime = useBoostTime(stats.boostedElapsed);
  const aimRef = useRef({ x: 0.5, y: 0.18 });
  const activeRange = useRef(true);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [canSave, setCanSave] = useState(true);
  const [ready, setReady] = useState(false);
  const [assetError, setAssetError] = useState(false);
  const [firing, setFiring] = useState(false);
  const [rose, setRose] = useState<RoseTarget | null>(null);
  const [difficulty, setDifficulty] = useState(0.8);
  const [rareNotice, setRareNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roseProgress = useRef<HTMLProgressElement>(null);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<"range" | "collection" | "achievements">(
    "range",
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recoilTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoFireTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dimensionsRef = useRef({ width: 1, height: 1 });
  const total = stats.counts.reduce((sum, count) => sum + count, 0);
  const active = ammo[selected];

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      );
      if (Array.isArray(stored))
        setUnlocked(ammo.filter((a) => stored.includes(a.id)).map((a) => a.id));
    } catch {
      setCanSave(false);
    }
    setStorageReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const incoming: unknown = JSON.parse(event.newValue);
        if (Array.isArray(incoming))
          setUnlocked((current) => [
            ...new Set([
              ...current,
              ...ammo.filter((a) => incoming.includes(a.id)).map((a) => a.id),
            ]),
          ]);
      } catch {
        /* Ignore malformed data from another tab. */
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (!storageReady || !canSave) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(unlocked));
    } catch {
      setCanSave(false);
    }
  }, [unlocked, storageReady, canSave]);

  const stop = useCallback(() => {
    if (autoFireTimer.current !== null) clearInterval(autoFireTimer.current);
    autoFireTimer.current = null;
    if (recoilTimer.current !== null) clearTimeout(recoilTimer.current);
    recoilTimer.current = null;
    setFiring(false);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    const onKeyRelease = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "Enter") stop();
    };
    window.addEventListener("blur", stop);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("keyup", onKeyRelease);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (autoFireTimer.current !== null) clearInterval(autoFireTimer.current);
      if (recoilTimer.current !== null) clearTimeout(recoilTimer.current);
      if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
      window.removeEventListener("blur", stop);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("keyup", onKeyRelease);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [stop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let disposed = false;
    let frame = 0;
    let previous = performance.now();
    let lastSnapshot = 0;
    const images = [...ammo.map(() => new window.Image()), new window.Image()];
    let loaded = 0;
    images.forEach((img, index) => {
      img.onload = () => {
        if (++loaded === images.length && !disposed) setReady(true);
      };
      img.onerror = () => {
        if (!disposed) setAssetError(true);
      };
      img.src =
        index === ammo.length
          ? "/ammo/cao-v1/rose-top.png"
          : sprite(ammo[index].id);
    });
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      dimensionsRef.current = { width, height };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const draw = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const { width, height } = dimensionsRef.current;
      const game = gameRef.current;
      if (activeRange.current && !document.hidden && loaded === images.length)
        stepGame(game, dt, width, height);
      context.clearRect(0, 0, width, height);
      for (const shot of game.shots) {
        const material = ammo[shot.material];
        const x = shot.x * width,
          y = shot.y * height;
        const size = Math.min(width * 0.055, 31.5);
        context.save();
        context.translate(x, y);
        context.rotate(
          Math.atan2(shot.vy * height, shot.vx * width) + Math.PI / 2,
        );
        if (!reducedMotion.matches) {
          context.strokeStyle = material.color;
          context.lineWidth = material.rare ? 2 : 1;
          context.shadowColor = material.color;
          context.shadowBlur = material.rare ? 12 : 3;
          context.beginPath();
          context.moveTo(0, size / 2);
          context.lineTo(0, size * 1.6);
          context.stroke();
          if (material.hidden) {
            context.beginPath();
            context.ellipse(0, 0, size * 0.7, size, 0, 0, Math.PI * 2);
            context.stroke();
          }
        }
        context.shadowBlur = 0;
        const img = images[shot.material];
        if (img.complete && img.naturalWidth)
          context.drawImage(img, -size / 2, -size * 0.75, size, size * 1.5);
        context.restore();
      }
      for (const burst of game.bursts) {
        context.save();
        context.globalAlpha = 1 - burst.age / 0.8;
        const x = burst.x * width,
          y = burst.y * height;
        context.fillStyle = "#f2dca5";
        context.font = "bold 18px sans-serif";
        context.textAlign = "center";
        context.fillText("+" + burst.score, x, y - 35 - burst.age * 35);
        if (!reducedMotion.matches) {
          context.fillStyle = "#a82539";
          for (let i = 0; i < 7; i++) {
            const angle = (i * Math.PI * 2) / 7;
            const distance = burst.age * 80;
            context.beginPath();
            context.ellipse(
              x + Math.cos(angle) * distance,
              y + Math.sin(angle) * distance,
              5,
              3,
              angle,
              0,
              Math.PI * 2,
            );
            context.fill();
          }
        }
        context.restore();
      }
      const aim = aimRef.current;
      const ax = aim.x * width,
        ay = aim.y * height;
      const originY = height - Math.min(height * 0.19, 310 / 3) * 0.62;
      const direction = Math.atan2(ay - originY, ax - width / 2);
      context.strokeStyle = "#d8ad55";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(width / 2, originY);
      context.lineTo(
        width / 2 + Math.cos(direction) * 22,
        originY + Math.sin(direction) * 22,
      );
      context.stroke();
      if (now - lastSnapshot > 100) {
        setStats(gameSnapshot(game));
        lastSnapshot = now;
      }
      setRose(
        activeRange.current && loaded === images.length
          ? visibleRose(game)
          : null,
      );
      if (roseProgress.current && game.roseTarget)
        roseProgress.current.value = Math.max(
          0,
          game.boostedSeconds > 0
            ? game.boostedSeconds / 15
            : 1 - (game.time - game.roseTarget.cycle) / game.duration,
        );
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const fire = useCallback((targetCycle?: number) => {
    const { width, height } = dimensionsRef.current;
    if (targetCycle !== undefined) {
      const target = visibleRose(gameRef.current);
      if (!target || target.cycle !== targetCycle) return;
      aimRef.current = { x: target.x, y: target.y };
    }
    const material = fireShot(gameRef.current, aimRef.current, width, height);
    if (material === null) return;
    setRose(visibleRose(gameRef.current));
    setStats(gameSnapshot(gameRef.current));
    setFiring(true);
    if (recoilTimer.current !== null) clearTimeout(recoilTimer.current);
    recoilTimer.current = setTimeout(() => setFiring(false), 160);
    if (ammo[material].rare) {
      if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
      setRareNotice(ammo[material].name + "曹先生已出膛");
      noticeTimer.current = setTimeout(() => setRareNotice(""), 3000);
    }
    setUnlocked((current) =>
      current.includes(ammo[material].id)
        ? current
        : [...current, ammo[material].id],
    );
  }, []);

  const aimAt = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    aimRef.current = {
      x: Math.max(
        0.03,
        Math.min(0.97, (event.clientX - rect.left) / rect.width),
      ),
      y: Math.max(
        0.06,
        Math.min(0.75, (event.clientY - rect.top) / rect.height),
      ),
    };
  };

  const start = () => {
    if (!ready || !storageReady || assetError) return;
    fire();
  };
  const startBoostFire = () => {
    if (
      !ready ||
      !storageReady ||
      gameRef.current.boostedSeconds <= 0 ||
      autoFireTimer.current !== null
    )
      return;
    const shoot = () => {
      const game = gameRef.current;
      if (game.boostedSeconds <= 0) {
        stop();
        return;
      }
      const target = visibleRose(game);
      if (target) fire(target.cycle);
    };
    shoot();
    autoFireTimer.current = setInterval(shoot, 125);
  };

  return (
    <main className={styles.page} lang="zh-CN">
      <header className={styles.header}>
        <a href="/#members">← 返回基地</a>
        <span>曹先生 / the 17cmer</span>
        <span className={styles.headerNote}>CAO AMMUNITION CLUB</span>
      </header>
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>PRIVATE ARCADE</p>
          <h1 className={styles.title}>曹先生弹药库</h1>
        </div>
        <p>每一发，都是一位曹先生。</p>
      </div>
      <nav className={styles.tabs} aria-label="曹先生菜单">
        <button
          type="button"
          aria-pressed={tab === "range"}
          onClick={() => {
            stop();
            activeRange.current = true;
            setTab("range");
          }}
        >
          发射场
        </button>
        <button
          type="button"
          aria-pressed={tab === "collection"}
          onClick={() => {
            stop();
            activeRange.current = false;
            setTab("collection");
          }}
        >
          弹药图鉴{" "}
          <span>
            {unlocked.length} / {ammo.length}
          </span>
        </button>
        <button
          type="button"
          aria-pressed={tab === "achievements"}
          onClick={() => {
            stop();
            activeRange.current = false;
            setTab("achievements");
          }}
        >
          成就图鉴
        </button>
      </nav>
      <div className={styles.layout}>
        <section
          className={styles.range}
          aria-label="曹先生发射场"
          hidden={tab !== "range"}
        >
          <div
            className={styles.stage}
            data-firing={firing}
            data-boosted={stats.boostedSeconds > 0}
            onPointerMove={aimAt}
            onPointerDown={(event) => {
              aimAt(event);
              event.currentTarget.setPointerCapture(event.pointerId);
              if (event.button === 0) start();
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
            tabIndex={0}
            role="group"
            aria-label="玫瑰反应训练"
            onKeyDown={(event) => {
              const steps: Record<string, [number, number]> = {
                ArrowLeft: [-0.03, 0],
                ArrowRight: [0.03, 0],
                ArrowUp: [0, -0.03],
                ArrowDown: [0, 0.03],
              };
              const step = steps[event.key];
              if (step) {
                event.preventDefault();
                aimRef.current = {
                  x: Math.max(0.03, Math.min(0.97, aimRef.current.x + step[0])),
                  y: Math.max(0.06, Math.min(0.65, aimRef.current.y + step[1])),
                };
              }
              if (event.code === "Space") {
                event.preventDefault();
                if (!event.repeat) start();
              }
            }}
            onKeyUp={(event) => {
              if (event.code === "Space") {
                event.preventDefault();
                stop();
              }
            }}
            onBlur={stop}
          >
            <div className={styles.stageLabel}>
              CAO / ROSE TRAINING <span>点击玫瑰</span>
            </div>
            {stats.boostedSeconds > 0 && (
              <div className={styles.boostBanner} role="status">
                <strong>曹先生高潮了</strong>
                <span>
                  {stats.boostedSeconds.toFixed(1)} 秒 · 隐藏弹药已加入
                </span>
              </div>
            )}
            <Image
              className={styles.launcher}
              src="/ammo/cao-v1/cao-launcher.png"
              width={1292}
              height={1227}
              alt="曹先生双臂展示肌肉，身穿黑金装甲，胸前安装着向上发射的趣味转轮机枪"
              priority
            />
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              aria-hidden="true"
            />
            {ready && !assetError && rose && (
              <button
                key={rose.cycle}
                type="button"
                className={styles.roseTarget}
                style={{ left: rose.x * 100 + "%", top: rose.y * 100 + "%" }}
                aria-label="点击玫瑰发射"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  if (event.button !== 0) return;
                  if (gameRef.current.boostedSeconds > 0) startBoostFire();
                  else fire(rose.cycle);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (event.detail === 0) fire(rose.cycle);
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (
                    gameRef.current.boostedSeconds > 0 &&
                    (event.code === "Space" || event.code === "Enter")
                  ) {
                    event.preventDefault();
                    if (!event.repeat) startBoostFire();
                  }
                }}
                onKeyUp={(event) => {
                  event.stopPropagation();
                  stop();
                }}
              >
                <Image
                  src="/ammo/cao-v1/rose-top.png"
                  width={1280}
                  height={1280}
                  alt=""
                  draggable={false}
                  unoptimized
                />
                <progress
                  ref={roseProgress}
                  max={1}
                  value={1}
                  aria-label="玫瑰剩余时间"
                />
              </button>
            )}
          </div>
          <div className={styles.controls}>
            {stats.boostedSeconds > 0 && (
              <button
                type="button"
                className={styles.fire}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  startBoostFire();
                }}
                onPointerUp={stop}
                onPointerCancel={stop}
                onLostPointerCapture={stop}
                onBlur={stop}
                onKeyDown={(event) => {
                  if (event.code === "Space" || event.code === "Enter") {
                    event.preventDefault();
                    if (!event.repeat) startBoostFire();
                  }
                }}
                onKeyUp={stop}
                onClick={(event) => {
                  if (event.detail === 0)
                    fire(visibleRose(gameRef.current)?.cycle);
                }}
              >
                按住疯狂发射
              </button>
            )}
            <div
              className={styles.difficulty}
              role="group"
              aria-label="选择难度"
            >
              {[
                { value: 0.8, label: "轻松 · 0.8 秒" },
                { value: 0.6, label: "标准 · 0.6 秒" },
                { value: 0.4, label: "挑战 · 0.4 秒" },
              ].map((level) => (
                <button
                  type="button"
                  key={level.value}
                  aria-pressed={difficulty === level.value}
                  disabled={stats.boostedSeconds > 0}
                  onClick={() => {
                    stop();
                    setDifficulty(level.value);
                    const game = gameRef.current;
                    game.duration = level.value;
                    game.roseTarget = null;
                    game.time = Math.ceil(game.time);
                    setRose(null);
                  }}
                >
                  {level.label}
                </button>
              ))}
            </div>
            <p>
              {assetError
                ? "素材加载失败，请刷新。"
                : !ready
                  ? "装填素材中…"
                  : stats.boostedSeconds > 0
                    ? "按住固定玫瑰或发射按钮连射，松开停止。命中正常加分，高潮持续 15 秒。"
                    : "每秒刷新一朵玫瑰，点击即发射并结算命中。进度条耗尽会漏点，连击中断并扣除 20 点高潮值。"}
            </p>
          </div>
        </section>

        <section
          className={styles.collection}
          hidden={tab !== "collection"}
          aria-label="弹药图鉴"
        >
          <div className={styles.inspection}>
            <Image
              src={sprite(active.id)}
              width={1024}
              height={1536}
              className={
                !unlocked.includes(active.id) ? styles.locked : undefined
              }
              alt={
                unlocked.includes(active.id)
                  ? active.name + "曹先生材质检视"
                  : "尚未解锁的曹先生剪影"
              }
            />
            <div>
              <p className={styles.eyebrow}>MATERIAL ARCHIVE</p>
              <h2>{active.name}曹先生</h2>
              <p>
                {unlocked.includes(active.id)
                  ? active.effect
                  : active.hidden
                    ? "高潮状态期间才有机会射出，出膛即可解锁。"
                    : "在发射场射出此材质，即可解锁。"}{" "}
              </p>
            </div>
          </div>
          <div className={styles.specimens}>
            {ammo.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
              >
                <Image
                  src={sprite(entry.id)}
                  width={1024}
                  height={1536}
                  className={
                    !unlocked.includes(entry.id) ? styles.locked : undefined
                  }
                  alt=""
                />
                <strong>{entry.name}</strong>
                <small>
                  {unlocked.includes(entry.id) ? "已解锁" : "未发现"}
                </small>
              </button>
            ))}
          </div>
          <p className={styles.hint}>
            {canSave
              ? "图鉴保存在当前浏览器，重置本次计数后仍保留。"
              : "浏览器暂无法保存图鉴，本页内仍可解锁。"}
          </p>
        </section>

        <CaoAchievements
          total={total}
          hits={stats.hits}
          bestCombo={stats.bestCombo}
          activations={stats.activations}
          hiddenShots={stats.hiddenShots}
          boostTime={lifetime.total}
          unlocked={unlocked}
          hidden={tab !== "achievements"}
        />

        <aside className={styles.scoreboard} aria-label="本次发射计分板">
          <p className={styles.eyebrow}>SESSION SCOREBOARD</p>
          <h2>本次共发射</h2>
          <div className={styles.total} data-testid="total-shots">
            {total.toLocaleString()}
            <small>发曹先生</small>
          </div>
          <div className={styles.combatStats}>
            <span>
              得分<strong data-testid="score">{stats.score}</strong>
            </span>
            <span>
              命中<strong>{stats.hits}</strong>
            </span>
            <span>
              命中率
              <strong>
                {stats.hits + stats.misses
                  ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
                  : 0}
                %
              </strong>
            </span>
            <span>
              连续命中<strong>{stats.combo}</strong>
            </span>
          </div>
          <div className={styles.heat} role="status">
            <strong>
              {stats.boostedSeconds > 0 ? "曹先生高潮了" : "高潮值"}
            </strong>
            <progress
              max={100}
              value={
                stats.boostedSeconds > 0
                  ? (stats.boostedSeconds / 15) * 100
                  : stats.heat
              }
              aria-label="高潮值或状态剩余时间"
            />
            <small>
              {stats.boostedSeconds > 0
                ? "剩余 " +
                  stats.boostedSeconds.toFixed(1) +
                  " 秒 · 隐藏弹药已加入"
                : stats.heat + " / 100"}
            </small>
          </div>
          <div className={styles.lifetime}>
            <span>累计高潮时间</span>
            <strong data-testid="boost-time">
              {lifetime.total.toFixed(1)} 秒
            </strong>
            <small>
              {lifetime.saved
                ? "保存在当前浏览器，重置后保留"
                : "当前浏览器无法保存，仅记录本页"}
            </small>
          </div>
          <dl>
            {ammo.map((entry, i) => (
              <div key={entry.id}>
                <dt>
                  <i style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </dt>
                <dd data-testid={`count-${entry.id}`}>
                  {stats.counts[i].toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
          <button
            className={styles.reset}
            type="button"
            onClick={() => {
              stop();
              const elapsed = gameRef.current.boostedElapsed;
              gameRef.current = createGame(difficulty);
              gameRef.current.boostedElapsed = elapsed;
              setRose(null);
              setStats(gameSnapshot(gameRef.current));
              if (noticeTimer.current !== null)
                clearTimeout(noticeTimer.current);
              setRareNotice("");
            }}
          >
            重置本次
          </button>
          <p className={styles.hint}>
            本次战绩在刷新或离开后归零。命中率计入打空和超时漏点。
          </p>
          <div className={styles.rareNotice} role="status" aria-live="polite">
            {rareNotice}
          </div>
        </aside>
      </div>
      <footer className={styles.footer}>
        ZHAJINBANG · CAO AMMUNITION CLUB{" "}
        <a href="/#members">RETURN TO BASE ↗</a>
      </footer>
    </main>
  );
}
