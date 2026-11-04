"use client";

import Image from "next/image";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import styles from "./cao-arcade.module.css";
import CaoAchievements from "./cao-achievements";

const ammo = [
  {
    id: "normal",
    name: "普通",
    weight: 650,
    rate: "65%",
    color: "#c9ae7e",
    title: "曹先生已出膛",
    effect: "短金尾迹",
  },
  {
    id: "mithril",
    name: "秘银",
    weight: 220,
    rate: "22%",
    color: "#e2ded0",
    title: "秘银觉醒",
    effect: "银白冷光与细金轨迹",
  },
  {
    id: "gold",
    name: "黄金",
    weight: 90,
    rate: "9%",
    color: "#ffc84c",
    title: "黄金时刻",
    effect: "金色火花与璀璨光轨",
  },
  {
    id: "crystal",
    name: "水晶",
    weight: 35,
    rate: "3.5%",
    color: "#ffe6b3",
    title: "晶耀降临",
    effect: "香槟色棱镜碎光",
  },
  {
    id: "demon",
    name: "恶魔",
    weight: 5,
    rate: "0.5%",
    color: "#d88c28",
    title: "恶魔降临",
    effect: "黑金裂焰与暗金光环",
  },
] as const;

const storageKey = "zhajinbang-cao-collection-v1";
const sprite = (id: string) => `/ammo/cao-v1/cao-${id}.png`;
const emptyCounts = () => ammo.map(() => 0);
type Stats = { counts: number[] };
function updateStats(state: Stats, index: number | "reset"): Stats {
  if (index === "reset") return { counts: emptyCounts() };
  return {
    counts: state.counts.map((count, i) => count + Number(i === index)),
  };
}

type Shot = {
  material: number;
  x: number;
  y: number;
  age: number;
  drift: number;
};

export default function CaoArcade() {
  const [stats, dispatch] = useReducer(updateStats, {
    counts: emptyCounts(),
  });
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [canSave, setCanSave] = useState(true);
  const [ready, setReady] = useState(false);
  const [assetError, setAssetError] = useState(false);
  const [firing, setFiring] = useState(false);
  const [rareNotice, setRareNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<"range" | "collection" | "achievements">(
    "range",
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shotsRef = useRef<Shot[]>([]);
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
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setFiring(false);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("keyup", stop);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
      window.removeEventListener("blur", stop);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("keyup", stop);
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
    const images = ammo.map(() => new window.Image());
    let loaded = 0;
    images.forEach((img, index) => {
      img.onload = () => {
        if (++loaded === ammo.length && !disposed) setReady(true);
      };
      img.onerror = () => {
        if (!disposed) setAssetError(true);
      };
      img.src = sprite(ammo[index].id);
    });
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      dimensionsRef.current = { width, height };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      shotsRef.current = [];
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const draw = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const { width, height } = dimensionsRef.current;
      context.clearRect(0, 0, width, height);
      shotsRef.current = shotsRef.current.filter((shot) => shot.age < 2.5);
      for (const shot of shotsRef.current) {
        shot.age += dt;
        const t = shot.age * 0.5;
        const material = ammo[shot.material];
        const x = shot.x + shot.drift * t;
        const y = shot.y - height * t * 0.85;
        const size = Math.min(width * 0.055, 31.5);
        context.save();
        context.globalAlpha = Math.max(0, 1 - Math.max(0, t - 0.75) * 2);
        if (!reducedMotion.matches) {
          context.strokeStyle = material.color;
          context.lineWidth = shot.material > 1 ? 3 : 1;
          context.shadowColor = material.color;
          context.shadowBlur = shot.material > 1 ? 16 : 4;
          context.beginPath();
          context.moveTo(x, y + size);
          context.lineTo(x - shot.drift * 0.08, y + size + 35);
          context.stroke();
          if (shot.material >= 2) {
            for (let p = 0; p < 6; p++) {
              const angle = (p * Math.PI) / 3 + t * 2;
              context.fillStyle = material.color;
              const radius = (12 + t * 28) * (shot.material === 4 ? 1.4 : 1);
              context.save();
              context.translate(
                x + Math.cos(angle) * radius,
                y + size + Math.sin(angle) * radius,
              );
              if (shot.material === 3) context.rotate(Math.PI / 4);
              context.fillRect(
                -1,
                -1,
                shot.material === 3 ? 4 : 2,
                shot.material === 3 ? 4 : 2,
              );
              context.restore();
            }
          }
          if (shot.material === 4) {
            context.beginPath();
            context.arc(x, y + size / 2, size * 0.7, 0, Math.PI * 2);
            context.stroke();
          }
        }
        context.shadowBlur = 0;
        const img = images[shot.material];
        if (img.complete && img.naturalWidth)
          context.drawImage(img, x - size / 2, y, size, size * 1.5);
        context.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const fire = useCallback(() => {
    let roll = Math.random() * 1000;
    const index = ammo.findIndex((entry) => {
      roll -= entry.weight;
      return roll < 0;
    });
    const material = Math.max(index, 0);
    dispatch(material);
    if (material >= 2) {
      if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
      setRareNotice(ammo[material].name + "曹先生已出膛");
      noticeTimer.current = setTimeout(() => setRareNotice(""), 3000);
    }
    setUnlocked((current) =>
      current.includes(ammo[material].id)
        ? current
        : [...current, ammo[material].id],
    );
    const { width, height } = dimensionsRef.current;
    shotsRef.current.push({
      material,
      x: width / 2,
      y: height - Math.min(height * 0.19, 310 / 3) * 0.62,
      age: 0,
      drift: (Math.random() - 0.5) * width * 0.28,
    });
  }, []);

  const start = () => {
    if (!ready || !storageReady || intervalRef.current !== null) return;
    setFiring(true);
    fire();
    intervalRef.current = setInterval(fire, 350);
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
            setTab("collection");
          }}
        >
          弹药图鉴 <span>{unlocked.length} / 5</span>
        </button>
        <button
          type="button"
          aria-pressed={tab === "achievements"}
          onClick={() => {
            stop();
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
          <div className={styles.stage} data-firing={firing}>
            <div className={styles.stageLabel}>
              CAO / FULL AUTO <span>{firing ? "连发中" : "待命"}</span>
            </div>
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
          </div>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.fire}
              disabled={!ready || !storageReady || assetError}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                start();
              }}
              onPointerUp={stop}
              onPointerCancel={stop}
              onLostPointerCapture={stop}
              onBlur={stop}
              onKeyDown={(event) => {
                if (event.code === "Space" || event.code === "Enter") {
                  event.preventDefault();
                  if (!event.repeat) start();
                }
              }}
              onKeyUp={(event) => {
                if (event.code === "Space" || event.code === "Enter") {
                  event.preventDefault();
                  stop();
                }
              }}
              onClick={(event) => {
                if (event.detail === 0 && !firing && ready) fire();
              }}
            >
              {assetError
                ? "素材加载失败，请刷新"
                : !ready
                  ? "装填素材中…"
                  : firing
                    ? "曹先生出膛中…"
                    : "按住发射"}
            </button>
            <p>鼠标 / 手指长按 · 聚焦按钮后按住空格或回车 · 松开停止</p>
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
              shotsRef.current = [];
              dispatch("reset");
              if (noticeTimer.current !== null)
                clearTimeout(noticeTimer.current);
              setRareNotice("");
            }}
          >
            重置本次
          </button>
          <p className={styles.hint}>本次计数在刷新或离开后归零。</p>
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
