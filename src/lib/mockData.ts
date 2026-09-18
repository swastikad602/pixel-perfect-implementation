// Single source of seed/mock data. Replace with real API/database calls later.
import type { Domain } from "./types";

export type SeedElder = {
  id: string;
  name: string;
  pin: string;
  age: number;
  state: string;
  language: "en" | "bn";
};

export const SEED_ELDERS: SeedElder[] = [
  { id: "e1", name: "Anita Das", pin: "1234", age: 78, state: "West Bengal", language: "bn" },
  { id: "e2", name: "Robert Menon", pin: "2345", age: 81, state: "Kerala", language: "en" },
  { id: "e3", name: "Kamala Iyer", pin: "3456", age: 74, state: "Tamil Nadu", language: "en" },
];

export const SEED_ACCOUNTS = [
  { email: "caregiver@reconnect.app", password: "demo1234", role: "caregiver" as const, name: "Priya Das" },
  { email: "doctor@reconnect.app", password: "demo1234", role: "doctor" as const, name: "Dr. S. Bose" },
  { email: "admin@reconnect.app", password: "demo1234", role: "government" as const, name: "Health Ministry" },
];

export const DOMAINS: Domain[] = ["memory", "attention", "pattern", "executive"];

export const DOMAIN_LABEL: Record<Domain, string> = {
  memory: "Memory",
  attention: "Attention",
  pattern: "Patterns",
  executive: "Daily Routine",
};

export const DOMAIN_EMOJI: Record<Domain, string> = {
  memory: "🧠",
  attention: "👀",
  pattern: "🔷",
  executive: "📋",
};

export const MEMORY_ITEMS = ["🍎", "🌻", "🐦", "☕", "🔑", "🧵"];
export const ATTENTION_ITEMS = ["🔑", "👓", "☂️", "🧦", "📻", "🪥", "🍌", "🧼"];
export const PATTERN_SEQUENCES = [
  { seq: ["🔴", "🔵", "🔴", "🔵"], answer: "🔴", distractors: ["🔵", "🟢", "🟡"] },
  { seq: ["⭐", "⭐", "🌙", "⭐", "⭐"], answer: "🌙", distractors: ["⭐", "☀️", "☁️"] },
  { seq: ["🟩", "🟨", "🟩", "🟨"], answer: "🟩", distractors: ["🟨", "🟦", "🟥"] },
];
export const ROUTINE_STEPS = [
  ["Wake up", "Brush teeth", "Eat breakfast", "Take medicine", "Go for a walk"],
  ["Wash hands", "Sit at table", "Eat lunch", "Rest a while", "Call family"],
];

export const SEED_MEMORY_CARDS = [
  { elderId: "e1", name: "Priya", relationship: "Daughter", emoji: "👩", note: "Calls every evening." },
  { elderId: "e1", name: "Arun", relationship: "Grandson", emoji: "🧒", note: "Loves cricket." },
  { elderId: "e2", name: "Mary", relationship: "Wife", emoji: "👵", note: "Married 52 years." },
  { elderId: "e3", name: "Ravi", relationship: "Son", emoji: "👨", note: "Lives in Chennai." },
];

export const SEED_REMINDERS = [
  { elderId: "e1", title: "Take morning medicine", time: "08:00", category: "Medicine" },
  { elderId: "e1", title: "Drink a glass of water", time: "11:00", category: "Health" },
  { elderId: "e1", title: "Short walk in the garden", time: "17:00", category: "Activity" },
  { elderId: "e2", title: "Blood pressure tablet", time: "09:00", category: "Medicine" },
  { elderId: "e3", title: "Call your son", time: "18:00", category: "Family" },
];

// Aggregate-only figures for the government dashboard (de-identified, illustrative).
export const STATE_PARTICIPATION = [
  { state: "West Bengal", users: 4120, sessions: 18240 },
  { state: "Kerala", users: 3180, sessions: 15110 },
  { state: "Tamil Nadu", users: 2740, sessions: 12980 },
  { state: "Maharashtra", users: 2210, sessions: 9870 },
  { state: "Assam", users: 1180, sessions: 4420 },
];

export const LANGUAGE_USAGE = [
  { language: "Bengali", value: 41 },
  { language: "English", value: 34 },
  { language: "Tamil", value: 14 },
  { language: "Malayalam", value: 11 },
];
