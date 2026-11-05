"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { actTianGame, createTianGame, pauseTianGame, resumeTianGame, startTianGame, stepTianGame, tianSnapshot, type RunAction } from "./tian-game";
import { drawTianGame, type RunAssets } from "./tian-renderer";
import styles from "./tian-runner.module.css";
import { caughtCaption, tianReactions } from "./tian-reactions";

const RECORD_KEY = "zhajinbang-tian-runner-record-v1";
const assetPaths = {
  map: "/tian-runner/maps/v1/yulong-street-background.png",
  runner: "/tian-runner/v2/tian-run-back.png",
  chaser: "/tian-runner/v2/player-run-back.png",
};

function readRecord() {
  const value = Number(localStorage.getItem(RECORD_KEY));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export default function TianRunner() {
  const game = useRef(createTianGame());
  const canvas = useRef<HTMLCanvasElement>(null);
  const assets = useRef<RunAssets | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [stats, setStats] = useState(() => tianSnapshot(game.current));
  const [ready, setReady] = useState(false);
  const [assetError, setAssetError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [best, setBest] = useState(0);
  const [recordAvailable, setRecordAvailable] = useState(true);
  const isPlaying = stats.status === "running";
  const isOver = stats.status === "caught";
  const danger = stats.gap <= 12;
  const reaction = tianReactions[stats.reaction];
  const showStageReaction = isPlaying && (
    stats.seconds < 3 || danger || game.current.elapsed < game.current.reactionUntil
  );

  const publish = useCallback(() => setStats(tianSnapshot(game.current)), []);
  const begin = useCallback(() => {
    if (!assets.current) return;
    game.current = createTianGame(Math.floor(Math.random() * 4294967295));
    game.current.recordTarget = best;
    startTianGame(game.current);
    publish();
    canvas.current?.focus({ preventScroll: true });
  }, [best, publish]);
  const togglePause = useCallback(() => {
    if (game.current.status === "paused") resumeTianGame(game.current);
    else pauseTianGame(game.current);
    publish();
  }, [publish]);
  const action = useCallback((value: RunAction) => actTianGame(game.current, value), []);

  useEffect(() => {
    try { setBest(readRecord()); } catch { setRecordAvailable(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false); setAssetError(false); assets.current = null;
    async function load() {
      const entries = await Promise.all(Object.entries(assetPaths).map(async ([key, path]) => {
        const image = new window.Image();
        image.src = path;
        await image.decode();
        return [key, image] as const;
      }));
      if (!cancelled) {
        assets.current = Object.fromEntries(entries) as RunAssets;
        setReady(true);
      }
    }
    load().catch(() => { if (!cancelled) setAssetError(true); });
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    if (!ready || !canvas.current) return;
    const element = canvas.current;
    const context = element.getContext("2d");
    if (!context) { setAssetError(true); return; }
    let width = 1; let height = 1;
    const resize = () => {
      const rect = element.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * dpr); element.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element); resize();
    let raf = 0; let previous = 0; let lastPublish = 0;
    let previousStatus = game.current.status;
    const tick = (now: number) => {
      const dt = previous ? (now - previous) / 1000 : 0;
      previous = now;
      stepTianGame(game.current, dt);
      if (assets.current) drawTianGame(context, game.current, assets.current, width, height);
      if (now - lastPublish > 100 || previousStatus !== game.current.status) {
        publish(); lastPublish = now; previousStatus = game.current.status;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [ready, publish]);

  useEffect(() => {
    if (!isOver) return;
    setBest((previous) => Math.max(previous, stats.score));
    try {
      const record = Math.max(readRecord(), stats.score);
      localStorage.setItem(RECORD_KEY, String(record)); setBest(record);
    } catch { setRecordAvailable(false); }
  }, [isOver, stats.score]);

  useEffect(() => {
    const suspend = () => { pauseTianGame(game.current); publish(); };
    const visibility = () => { if (document.hidden) suspend(); };
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement) return;
      if ((event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) && (event.code === "Space" || event.code === "Enter")) return;
      if (event.code === "Escape" || event.code === "KeyP") {
        event.preventDefault(); if (!event.repeat) togglePause(); return;
      }
      const keys: Record<string, RunAction> = {
        ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
        ArrowUp: "jump", KeyW: "jump", Space: "jump", ArrowDown: "slide", KeyS: "slide",
      };
      const control = keys[event.code];
      if (control && ["running", "countdown", "paused"].includes(game.current.status)) {
        event.preventDefault(); if (!event.repeat) action(control);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", suspend);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", suspend);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [action, publish, togglePause]);

  return (
    <main className={styles.page} lang="zh-CN">
      <header className={styles.header}>
        <Link href="/#members" className={styles.back}>← ZHAJINBANG</Link>
        <span className={styles.edition}>TIAN / ENDLESS RUN</span>
        <span className={styles.version}>ARCADE 01</span>
      </header>

      <div className={styles.titleRow}>
        <div><p className={styles.eyebrow}>CHIFENG · YULONG DAJIE</p><h1>田先生，快跑<span>！</span></h1></div>
        <p className={styles.tagline}>泳圈带好了，拖鞋别跑丢。<br /><span>前方一路畅通，身后可不一定。</span></p>
      </div>

      <div className={styles.layout}>
        <div className={styles.range}>
        <section className={`${styles.stage} ${danger && isPlaying ? styles.danger : ""}`} aria-label="玉龙大街跑酷游戏">
          <canvas ref={canvas} className={styles.canvas} tabIndex={0}
            aria-label="操控田先生逃跑。左右方向键换道，上键或空格跳跃，下键下滑，P暂停。手机可滑动或使用下方按钮。"
            onPointerDown={(event) => {
              if (event.pointerType === "mouse") { canvas.current?.focus({ preventScroll: true }); return; }
              touch.current = { x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerCancel={() => { touch.current = null; }}
            onPointerUp={(event) => {
              const start = touch.current; touch.current = null;
              if (!start) return;
              const dx = event.clientX - start.x; const dy = event.clientY - start.y;
              if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
              action(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy < 0 ? "jump" : "slide");
            }}
          />

          {ready && <div className={styles.stageTop}>
            <span className={styles.location}>↗ 玉龙大街<span>CHIFENG</span></span>
            {(isPlaying || stats.status === "countdown" || stats.status === "paused") &&
              <button className={styles.pause} onClick={togglePause} aria-label={stats.status === "paused" ? "继续游戏" : "暂停游戏"}>
                {stats.status === "paused" ? "▶ 继续" : "Ⅱ 暂停"}
              </button>}
          </div>}

          {showStageReaction && <div
            key={`${stats.reaction}-${game.current.reactionUntil}`}
            className={`${styles.stageReaction} ${danger ? styles.fearReaction : ""}`}
            data-stage-reaction={stats.reaction}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <Image src={reaction.image} alt={`田先生${reaction.name}表情`} width={112} height={112} priority />
            <div><span>{reaction.condition}</span><strong>{reaction.caption}</strong></div>
          </div>}

          {!ready && <div className={styles.overlay}><div className={styles.overlayCard}>
            <p className={styles.eyebrow}>GETTING READY</p><h2>{assetError ? "素材没赶上车" : "正在整理泳圈…"}</h2>
            <p>{assetError ? "请检查网络，重新加载游戏素材。" : "正在加载玉龙大街和角色素材"}</p>
            {assetError && <button className={styles.primary} onClick={() => setAttempt((value) => value + 1)}>重新加载</button>}
          </div></div>}

          {ready && stats.status === "ready" && <div className={styles.overlay}><div className={styles.overlayCard}>
            <p className={styles.eyebrow}>肛门守护计划 / 01</p><h2>我要回皇家帝苑！</h2>
            <p>无限模式，没有终点，越跑越快。<br />第一次磕绊，壮汉逼近；第二次就会被抓。</p>
            <button className={styles.primary} onClick={begin}>开始逃跑 <span>↗</span></button>
            <span className={styles.overlayHint}>方向键 / WASD 操作 · 手机支持滑动</span>
          </div></div>}

          {ready && stats.status === "countdown" && <div className={styles.countdown} aria-live="polite"><strong>{stats.countdown || "跑！"}</strong><span>泳圈就位，准备开溜</span></div>}

          {ready && stats.status === "paused" && <div className={styles.overlay}><div className={styles.overlayCard}>
            <p className={styles.eyebrow}>TAKE A BREATHER</p><h2>田先生喘口气。</h2><p>追逐已暂停。准备好了再跑。</p>
            <button className={styles.primary} onClick={togglePause}>继续逃跑 ↗</button>
            <button className={styles.secondary} onClick={begin}>重新开始</button>
          </div></div>}

          {ready && isOver && <div className={styles.overlay}><div className={styles.overlayCard} role="status">
            <div className={styles.caughtReaction}>
              <Image src={tianReactions.fear.image} alt="田先生惊恐表情" width={52} height={52} />
              <div><p className={styles.eyebrow}>CAUGHT YOU</p><strong>{tianReactions.fear.caption}</strong></div>
            </div>
            <h2 className={styles.caughtTitle}>{caughtCaption}</h2>
            <p>{`这次跑了 ${stats.distance.toLocaleString()} 米，下次再远一点。`}</p>
            <div className={styles.result}><strong>{stats.score.toLocaleString()}<small>本次得分</small></strong><span>{stats.coins} 枚金币<br />{stats.dodged} 次躲避</span></div>
            <button className={styles.primary} onClick={begin}>再给田先生一次机会 ↗</button>
          </div></div>}

          {isPlaying && <div className={styles.inGameHint}>← → 换道 <span>↑ 跳跃</span> ↓ 下滑</div>}
        </section>

        <nav className={styles.touchControls} aria-label="游戏操作按钮">
          <button disabled={!isPlaying} onClick={() => action("left")} aria-label="向左换道">←<span>左移</span></button>
          <button disabled={!isPlaying} onClick={() => action("jump")} aria-label="跳跃">↑<span>跳跃</span></button>
          <button disabled={!isPlaying} onClick={() => action("slide")} aria-label="下滑">↓<span>下滑</span></button>
          <button disabled={!isPlaying} onClick={() => action("right")} aria-label="向右换道">→<span>右移</span></button>
        </nav>
        </div>

        <aside className={styles.sidebar} aria-label="追逐记录与操作说明">
          <div className={styles.scorePanel}>
            <p className={styles.eyebrow}>THIS RUN</p>
            <div className={styles.score}>{stats.score.toLocaleString()}<span>本次得分</span></div>
            <div className={styles.metrics}><div><strong>{stats.distance}<small>m</small></strong><span>已跑距离</span></div><div><strong>{stats.coins}<small>枚</small></strong><span>捡到金币</span></div></div>
            <div className={styles.endlessInfo}><span>∞ 无限模式</span><span>已坚持 {Math.floor(stats.seconds / 60)}:{String(stats.seconds % 60).padStart(2, "0")}</span></div>
            <div className={styles.routeEnds}><span>玉龙大街 · 没有终点</span><span>挑战最高纪录</span></div>
          </div>

          <div className={`${styles.chasePanel} ${danger ? styles.close : ""}`}>
            <div className={styles.chaseHeading}><span>身后的脚步声</span><strong>{stats.gap}<small>m</small></strong></div>
            <div className={styles.raceMeta}><span>磕绊 {stats.hits} / 2</span><span>速度 {stats.tempo.toFixed(2)}×</span></div>
            <div className={styles.chaseTrack} aria-hidden="true"><span>壮汉</span><i style={{ width: `${Math.max(8, stats.gap / 60 * 100)}%` }} /><b>田</b></div>
            <p>{isOver ? "这下田先生可惨了！" : danger ? "就在身后！再撞一次就被抓。" : "保持距离，让他追去吧。"}</p>
          </div>

          <div className={styles.controlsPanel}>
            <p className={styles.eyebrow}>HOW TO GET AWAY</p>
            <div><kbd>←</kbd><kbd>→</kbd><span>左右换道</span></div>
            <div><kbd>↑</kbd><kbd>空格</kbd><span>跳过施工墩、轿车</span></div>
            <div><kbd>↓</kbd><span>从横杆下滑过</span></div>
            <p>货车、小吃车必须换道。高处金币要跳着吃，横杆下的金币要下滑吃。</p>
          </div>
          <div className={styles.record}><span>PERSONAL BEST</span><strong>{best.toLocaleString()}</strong></div>
          {!recordAvailable && <p className={styles.storageNote}>浏览器未允许保存，本次仍可正常游玩。</p>}
        </aside>
      </div>

      <footer className={styles.footer}><span>ZHAJINBANG · 田先生逃跑俱乐部</span><span>玉龙大街 · 卡通改编场景</span></footer>
    </main>
  );
}
