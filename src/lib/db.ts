import Dexie, { type Table } from "dexie";
import type {
  ChatMessage,
  CompanionAlert,
  CompanionMessage,
  Consent,
  DoctorNote,
  Domain,
  Elder,
  Favorite,
  GameMode,
  GameSession,
  Level,
  MemoryCard,
  Recommendation,
  Reminder,
} from "./types";
import {
  DOMAINS,
  DOMAIN_MODES,
  SEED_ELDERS,
  SEED_MEMORY_CARDS,
  SEED_REMINDERS,
} from "./mockData";

class ReconnectDB extends Dexie {
  elders!: Table<Elder, string>;
  sessions!: Table<GameSession, number>;
  recommendations!: Table<Recommendation, string>;
  reminders!: Table<Reminder, number>;
  memoryCards!: Table<MemoryCard, number>;
  notes!: Table<DoctorNote, number>;
  chat!: Table<ChatMessage, number>;
  // Cached cloud TTS clips (base64 mp3) keyed by `${lang}:${text}`.
  ttsClips!: Table<{ key: string; audio: string; createdAt: number }, string>;
  // Companion (v4): transcripts, caregiver alerts, favourite songs/poems, consent.
  companion!: Table<CompanionMessage, number>;
  alerts!: Table<CompanionAlert, number>;
  favorites!: Table<Favorite, number>;
  consents!: Table<Consent, string>;

  constructor() {
    super("reconnect");
    this.version(1).stores({
      elders: "id, name",
      sessions: "++id, elderId, domain, date, ts",
      recommendations: "key, elderId, domain",
      reminders: "++id, elderId, status",
      memoryCards: "++id, elderId",
      notes: "++id, elderId, ts",
      chat: "++id, thread, ts",
    });
    this.version(2).stores({ ttsClips: "key" });
    // v3 adds the per-game `mode` field (several games per domain) and orientation entries.
    this.version(3)
      .stores({
        sessions: "++id, elderId, domain, mode, date, ts",
        recommendations: "key, elderId, domain, mode",
      })
      .upgrade(async (tx) => {
        const legacyMode: Record<string, GameMode> = {
          memory: "matching",
          attention: "find_object",
          pattern: "sequence",
          executive: "arrange",
        };
        await tx
          .table("sessions")
          .toCollection()
          .modify((s: GameSession) => {
            const legacy = legacyMode[s.domain];
            if (!s.mode && legacy) s.mode = legacy;
          });
      });
    this.version(4).stores({
      companion: "++id, elderId, ts",
      alerts: "++id, elderId, ts, acknowledged",
      favorites: "++id, elderId, createdAt",
      consents: "elderId",
    });
  }
}

let _db: ReconnectDB | null = null;
// Dexie is browser-only; never instantiate during SSR.
export function getDb(): ReconnectDB {
  if (typeof window === "undefined") throw new Error("Dexie is browser-only");
  if (!_db) _db = new ReconnectDB();
  return _db;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Seeds 3 elders with several weeks of varied session history (idempotent). */
export async function ensureSeed() {
  const db = getDb();
  const count = await db.elders.count();
  if (count > 0) return;

  await db.elders.bulkPut(SEED_ELDERS);

  const sessions: GameSession[] = [];
  SEED_ELDERS.forEach((elder, idx) => {
    for (let dayAgo = 27; dayAgo >= 0; dayAgo--) {
      const perDay = (dayAgo + idx) % 3 === 0 ? 1 : 2;
      for (let k = 0; k < perDay; k++) {
        const domain: Domain = DOMAINS[(dayAgo + k + idx) % 4]!;
        const modes = DOMAIN_MODES[domain];
        const mode = modes[(dayAgo + k) % modes.length]!;
        const base = 0.55 + idx * 0.08 + (k % 2) * 0.05;
        // Elder e1 drifts downward in the last week so "Needs review" is real.
        const drift = idx === 0 && dayAgo < 6 ? -0.28 : 0;
        const wobble = (((dayAgo * 37 + k * 11 + idx * 5) % 21) - 10) / 100;
        const accuracy = Math.max(0.15, Math.min(1, base + drift + wobble));
        const level: Level = accuracy >= 0.8 ? 2 : 1;
        const d = new Date();
        d.setDate(d.getDate() - dayAgo);
        d.setHours(9 + k * 5, 15, 0, 0);
        sessions.push({
          elderId: elder.id,
          domain,
          mode,
          level,
          accuracy: Math.round(accuracy * 100) / 100,
          durationSec: Math.round(35 + (1 - accuracy) * 70),
          date: isoDay(d),
          ts: d.getTime(),
        });
      }
      // One orientation check-in on most days, so the trend has history.
      if ((dayAgo + idx) % 2 === 0) {
        const d = new Date();
        d.setDate(d.getDate() - dayAgo);
        d.setHours(8, 5, 0, 0);
        const correct = (dayAgo * 7 + idx * 3) % 10 > (idx === 0 && dayAgo < 7 ? 5 : 2);
        sessions.push({
          elderId: elder.id,
          domain: "orientation",
          level: 1,
          accuracy: correct ? 1 : 0,
          durationSec: 6,
          responseMs: 4200 + ((dayAgo * 311) % 5000),
          date: isoDay(d),
          ts: d.getTime(),
        });
      }
    }
  });
  await db.sessions.bulkAdd(sessions);

  await db.memoryCards.bulkAdd(SEED_MEMORY_CARDS.map((c) => ({ ...c })));
  await db.reminders.bulkAdd(
    SEED_REMINDERS.map((r) => ({
      ...r,
      status: "pending" as const,
      windowSec: 90,
      createdAt: Date.now(),
    })),
  );
}

const recKey = (elderId: string, domain: Domain, mode: GameMode) => `${elderId}:${domain}:${mode}`;

export async function getRecommendedLevel(
  elderId: string,
  domain: Domain,
  mode: GameMode,
): Promise<Level> {
  const db = getDb();
  const rec = await db.recommendations.get(recKey(elderId, domain, mode));
  if (rec) return rec.level;
  // Fall back to the older per-domain recommendation saved before modes existed.
  const legacy = await db.recommendations.get(`${elderId}:${domain}`);
  return legacy?.level ?? 1;
}

export async function saveRecommendation(
  elderId: string,
  domain: Domain,
  mode: GameMode,
  level: Level,
) {
  await getDb().recommendations.put({
    key: recKey(elderId, domain, mode),
    elderId,
    domain,
    mode,
    level,
    updatedAt: Date.now(),
  });
}

export async function addSession(s: Omit<GameSession, "id" | "date" | "ts">) {
  const now = new Date();
  await getDb().sessions.add({ ...s, date: isoDay(now), ts: now.getTime() });
}

/** Silent orientation check-in log — never used for elder-facing level messaging. */
export async function addOrientationEntry(p: {
  elderId: string;
  correct: boolean;
  responseMs: number;
}) {
  await addSession({
    elderId: p.elderId,
    domain: "orientation",
    level: 1,
    accuracy: p.correct ? 1 : 0,
    durationSec: Math.round(p.responseMs / 1000),
    responseMs: p.responseMs,
  });
}

export const today = () => isoDay(new Date());

/* ---------------- Companion ---------------- */

/** Transcripts are kept only as long as needed for caregiver alerts and doctor review. */
export const TRANSCRIPT_RETENTION_DAYS = 30;

export async function pruneCompanion(elderId: string) {
  const db = getDb();
  const cutoff = Date.now() - TRANSCRIPT_RETENTION_DAYS * 864e5;
  await db.companion.where("elderId").equals(elderId).and((m) => m.ts < cutoff).delete();
  await db.alerts
    .where("elderId")
    .equals(elderId)
    .and((a) => a.acknowledged === 1 && a.ts < cutoff)
    .delete();
}

export async function hasCompanionConsent(elderId: string) {
  const row = await getDb().consents.get(elderId);
  return !!row?.companion;
}

export async function setCompanionConsent(elderId: string, value: boolean, by: "elder" | "caregiver") {
  const db = getDb();
  await db.consents.put({ elderId, companion: value, updatedAt: Date.now(), by });
  // Withdrawing consent also removes the stored conversation.
  if (!value) await db.companion.where("elderId").equals(elderId).delete();
}
