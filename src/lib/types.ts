export type Domain = "memory" | "attention" | "pattern" | "executive";
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
  domain: Domain;
  level: Level;
  accuracy: number; // 0..1
  durationSec: number;
  date: string; // ISO date (yyyy-mm-dd)
  ts: number;
}

export interface Recommendation {
  key: string; // `${elderId}:${domain}`
  elderId: string;
  domain: Domain;
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
