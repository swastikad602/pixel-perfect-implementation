import type { Domain, GameMode, GameSession, Level } from "./types";

// Expected comfortable duration per round-set, used to judge "fast" vs "slow".
const PAR_SECONDS: Record<Domain, number> = {
  memory: 60,
  attention: 45,
  pattern: 40,
  executive: 50,
};

// Newer modes have their own par time; falls back to the domain par.
const MODE_PAR_SECONDS: Partial<Record<GameMode, number>> = {
  recall_tap: 55,
  quick_spot: 30,
};

/**
 * Plain client-side adaptive engine — no ML.
 * Operates per (domain, mode) pair so each game adapts independently.
 * >=80% accuracy and finished within par -> step up to level 2.
 * <50% accuracy, or clearly slow (>1.6x par) -> step down to level 1.
 * Otherwise keep the level that was just played.
 */
export function recommendLevel(session: {
  domain: Domain;
  mode?: GameMode;
  level: Level;
  accuracy: number;
  durationSec: number;
}): Level {
  const par = (session.mode && MODE_PAR_SECONDS[session.mode]) ?? PAR_SECONDS[session.domain];
  const fast = session.durationSec <= par;
  const slow = session.durationSec > par * 1.6;

  if (session.accuracy >= 0.8 && fast) return 2;
  if (session.accuracy < 0.5 || slow) return 1;
  return session.level;
}

/** "Needs review": recent accuracy dropped meaningfully vs the rolling average. */
export function needsReview(sessions: GameSession[]): boolean {
  const games = sessions.filter((s) => s.domain !== "orientation");
  if (games.length < 6) return false;
  const sorted = [...games].sort((a, b) => a.ts - b.ts);
  const recent = sorted.slice(-3);
  const baseline = sorted.slice(0, -3);
  const avg = (xs: GameSession[]) => xs.reduce((s, x) => s + x.accuracy, 0) / xs.length;
  return avg(recent) < avg(baseline) - 0.15;
}

export function averageAccuracy(sessions: GameSession[]): number {
  if (!sessions.length) return 0;
  return sessions.reduce((s, x) => s + x.accuracy, 0) / sessions.length;
}

/** % of orientation check-ins answered correctly in the last N days (null when none). */
export function orientationTrend(sessions: GameSession[], days: number): number | null {
  const from = Date.now() - days * 864e5;
  const xs = sessions.filter((s) => s.domain === "orientation" && s.ts >= from);
  if (!xs.length) return null;
  return Math.round((xs.filter((s) => s.accuracy >= 1).length / xs.length) * 100);
}
