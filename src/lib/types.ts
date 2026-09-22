export type Domain = "memory" | "attention" | "pattern" | "executive";
/** Entries stored in the sessions table: the four game domains plus orientation check-ins. */
export type EntryDomain = Domain | "orientation";
/** Multiple games can live inside one domain; each mode adapts independently. */
export type GameMode = "matching" | "recall_tap" | "find_object" | "quick_spot" | "sequence" | "arrange";
export type Level = 1 | 2;
export type Role = "elder" | "caregiver" | "doctor" | "government";
export type Lang = "en" | "bn";

export interface Elder {
  id: string;
  name: string;
  pin: string;
  age: number;
  state: string;
  language: Lang;
}

export interface GameSession {
  id?: number;
  elderId: string;
  domain: EntryDomain;
  /** Undefined for legacy rows and for orientation entries. */
  mode?: GameMode;
  level: Level;
  accuracy: number; // 0..1
  durationSec: number;
  /** Silent response-time logging (quick spot, orientation check-in). */
  responseMs?: number;
  /** Extra detail for the caregiver/doctor views, never shown to the elder. */
  correctCount?: number;
  incorrectCount?: number;
  date: string; // ISO date (yyyy-mm-dd)
  ts: number;
}

export interface Recommendation {
  key: string; // `${elderId}:${domain}:${mode}`
  elderId: string;
  domain: Domain;
  mode: GameMode;
  level: Level;
  updatedAt: number;
}

export type ReminderStatus = "pending" | "done" | "snoozed" | "help" | "missed";

export interface Reminder {
  id?: number;
  elderId: string;
  title: string;
  time: string; // HH:mm
  category: string;
  status: ReminderStatus;
  respondedAt?: number;
  windowSec: number;
  createdAt: number;
}

export interface MemoryCard {
  id?: number;
  elderId: string;
  name: string;
  relationship: string;
  emoji: string;
  note: string;
}

export interface DoctorNote {
  id?: number;
  elderId: string;
  text: string;
  ts: number;
}

export interface ChatMessage {
  id?: number;
  thread: string; // "caregiver" | "doctor"
  from: "user" | "bot";
  text: string;
  ts: number;
}

/* ---------------- Companion ---------------- */
export interface CompanionMessage {
  id?: number;
  elderId: string;
  from: "user" | "bot";
  text: string;
  ts: number;
  /** True when this turn triggered a caregiver alert. */
  flagged?: boolean;
}

export type AlertLevel = "urgent" | "request";

/** Caregiver-facing alert raised by the Companion. Never shared with the government view. */
export interface CompanionAlert {
  id?: number;
  elderId: string;
  level: AlertLevel;
  /** What the elder said (context for the caregiver). */
  transcript: string;
  /** What the companion said back. */
  reply: string;
  reason: string;
  ts: number;
  acknowledged: 0 | 1;
  acknowledgedAt?: number;
}

/** Caregiver-uploaded song or poem the elder loves (audio kept on this device). */
export interface Favorite {
  id?: number;
  elderId: string; // user_id
  title: string;
  label: string;
  audio: Blob; // audio_url is created from this blob at play time
  mime: string;
  createdAt: number;
}

export interface Consent {
  elderId: string;
  companion: boolean;
  updatedAt: number;
  by: "elder" | "caregiver";
}
