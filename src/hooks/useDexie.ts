import { useEffect, useState } from "react";
import { ensureSeed } from "@/lib/db";
import { useApp } from "@/store/app";

/** Runs a Dexie read in the browser only, re-running whenever data changes. */
export function useDexie<T>(fn: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const rev = useApp((s) => s.rev);
  const [data, setData] = useState<T>();

  useEffect(() => {
    let alive = true;
    (async () => {
      await ensureSeed();
      const result = await fn();
      if (alive) setData(result);
    })().catch((e) => console.error(e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, ...deps]);

  return data;
}

export function useOnline() {
  const simulateOffline = useApp((s) => s.simulateOffline);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online && !simulateOffline;
}
