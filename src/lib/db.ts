import Dexie, { type Table } from "dexie";
import type {
  ChatMessage,
  DoctorNote,
  Domain,
  Elder,
  GameSession,
  Level,
  MemoryCard,
  Recommendation,
  Reminder,
} from "./types";
import {
  DOMAINS,
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
          level,
          accuracy: Math.round(accuracy * 100) / 100,
          durationSec: Math.round(35 + (1 - accuracy) * 70),
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

export async function getRecommendedLevel(elderId: string, domain: Domain): Promise<Level> {
  const rec = await getDb().recommendations.get(`${elderId}:${domain}`);
  return rec?.level ?? 1;
}

export async function saveRecommendation(elderId: string, domain: Domain, level: Level) {
  await getDb().recommendations.put({
    key: `${elderId}:${domain}`,
    elderId,
    domain,
    level,
    updatedAt: Date.now(),
  });
}

export async function addSession(s: Omit<GameSession, "id" | "date" | "ts">) {
  const now = new Date();
  await getDb().sessions.add({ ...s, date: isoDay(now), ts: now.getTime() });
}

export const today = () => isoDay(new Date());
