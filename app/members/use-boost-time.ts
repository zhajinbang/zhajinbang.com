"use client";

import { useEffect, useRef, useState } from "react";

const prefix = "zhajinbang-cao-boost-time-v1:";

// Each visit owns one record, so simultaneous tabs never overwrite each other's time.
export default function useBoostTime(elapsed: number) {
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;
  const [total, setTotal] = useState(0);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const key = prefix + crypto.randomUUID();
    const sync = () => {
      const seconds = Math.max(0, Math.round(elapsedRef.current * 1000) / 1000);
      try {
        if (seconds > 0) localStorage.setItem(key, String(seconds));
        let sum = seconds;
        for (let i = 0; i < localStorage.length; i++) {
          const storedKey = localStorage.key(i);
          if (!storedKey?.startsWith(prefix) || storedKey === key) continue;
          const value = Number(localStorage.getItem(storedKey));
          if (Number.isFinite(value) && value > 0) sum += value;
        }
        setTotal(sum);
      } catch {
        setSaved(false);
        setTotal(seconds);
      }
    };
    sync();
    const timer = setInterval(sync, 1000);
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(prefix)) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pagehide", sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pagehide", sync);
      sync();
    };
  }, []);
  return { total, saved };
}
