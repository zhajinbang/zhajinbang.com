"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./cao-arcade.module.css";

const achievements = [
  {
    id: "first",
    title: "发曹快乐",
    badge: "发",
    description: "本次发射第一发曹先生。",
    target: 1,
    material: "",
  },
  {
    id: "seventeen",
    title: "17 发，刚刚好",
    badge: "拾",
    description: "单次发射达到 17 发。",
    target: 17,
    material: "",
  },
  {
    id: "hundred",
    title: "百曹齐放",
    badge: "百",
    description: "单次发射达到 100 发。",
    target: 100,
    material: "",
  },
  {
    id: "thousand",
    title: "曹流不息",
    badge: "千",
    description: "单次发射达到 1,000 发。",
    target: 1000,
    material: "",
  },
  {
    id: "silver",
    title: "银才是真绝色",
    badge: "银",
    description: "发现秘银曹先生。",
    target: 1,
    material: "mithril",
  },
  {
    id: "golden",
    title: "含金量拉满",
    badge: "金",
    description: "发现黄金曹先生。",
    target: 1,
    material: "gold",
  },
  {
    id: "crystalline",
    title: "易碎品，轻放",
    badge: "晶",
    description: "发现水晶曹先生。",
    target: 1,
    material: "crystal",
  },
  {
    id: "devil",
    title: "曹先生黑化了",
    badge: "魔",
    description: "发现恶魔曹先生。",
    target: 1,
    material: "demon",
  },
  {
    id: "complete",
    title: "五曹临门",
    badge: "集",
    description: "集齐五种材质的曹先生。",
    target: 5,
    material: "all",
  },
] as const;

const storageKey = "zhajinbang-cao-achievements-v1";

export default function CaoAchievements({
  total,
  unlocked,
  hidden,
}: {
  total: number;
  unlocked: string[];
  hidden: boolean;
}) {
  const [earned, setEarned] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [canSave, setCanSave] = useState(true);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      );
      if (Array.isArray(saved))
        setEarned(
          achievements.filter((a) => saved.includes(a.id)).map((a) => a.id),
        );
    } catch {
      setCanSave(false);
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const incoming: unknown = JSON.parse(event.newValue);
        if (!Array.isArray(incoming)) return;
        setEarned((current) => [
          ...new Set([
            ...current,
            ...achievements
              .filter((a) => incoming.includes(a.id))
              .map((a) => a.id),
          ]),
        ]);
      } catch {
        /* Ignore malformed records from another tab. */
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const progress = useMemo(
    () =>
      achievements.map((achievement) => {
        if (achievement.material === "all") return unlocked.length;
        if (achievement.material)
          return Number(unlocked.includes(achievement.material));
        return total;
      }),
    [total, unlocked],
  );

  useEffect(() => {
    if (!ready) return;
    const next = achievements
      .filter((a, i) => earned.includes(a.id) || progress[i] >= a.target)
      .map((a) => a.id);
    if (next.length !== earned.length) setEarned(next);
    if (canSave) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        setCanSave(false);
      }
    }
  }, [ready, progress, earned, canSave]);

  return (
    <section
      className={styles.achievements}
      aria-label="成就图鉴"
      hidden={hidden}
    >
      <div className={styles.achievementIntro}>
        <div>
          <p className={styles.eyebrow}>CAO HALL OF FAME</p>
          <h2>曹门荣誉室</h2>
        </div>
        <span>
          {earned.length} / {achievements.length} 已解锁
        </span>
      </div>
      <p className={styles.hint}>
        发射次数挑战以本次计分为准。已解锁成就永久点亮，材质成就同步已有图鉴。
      </p>
      <ul className={styles.achievementGrid}>
        {achievements.map((achievement, index) => {
          const complete = earned.includes(achievement.id);
          const value = complete
            ? achievement.target
            : Math.min(progress[index], achievement.target);
          return (
            <li
              key={achievement.id}
              className={styles.achievementCard}
              data-earned={complete}
            >
              <span className={styles.badge} aria-hidden="true">
                {achievement.badge}
              </span>
              <div>
                <span className={styles.achievementStatus}>
                  {complete ? "已达成" : "待解锁"}
                </span>
                <h3>{achievement.title}</h3>
                <p>{achievement.description}</p>
                <progress
                  max={achievement.target}
                  value={value}
                  aria-label={achievement.title + "进度"}
                />
                <small>
                  {value.toLocaleString()} /{" "}
                  {achievement.target.toLocaleString()}
                </small>
              </div>
            </li>
          );
        })}
      </ul>
      <p className={styles.hint}>
        {canSave
          ? "成就保存在当前浏览器，重置本次计分后仍保留。"
          : "浏览器暂无法保存成就，本页内仍可解锁。"}
      </p>
    </section>
  );
}
