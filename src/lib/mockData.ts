// Single source of seed/mock data. Replace with real API/database calls later.
import type { Domain, EntryDomain, GameMode } from "./types";

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

export const DOMAIN_LABEL: Record<EntryDomain, string> = {
  memory: "Memory",
  attention: "Attention",
  pattern: "Patterns",
  executive: "Daily Routine",
  orientation: "Orientation",
};

export const DOMAIN_EMOJI: Record<Domain, string> = {
  memory: "🧠",
  attention: "👀",
  pattern: "🔷",
  executive: "📋",
};

/** Games available inside each domain. Order matters for the picker screen. */
export const DOMAIN_MODES: Record<Domain, GameMode[]> = {
  memory: ["matching", "recall_tap"],
  attention: ["find_object", "quick_spot"],
  pattern: ["sequence"],
  executive: ["arrange"],
};

export const MODE_LABEL: Record<GameMode, { en: string; bn: string }> = {
  matching: { en: "Picture Matching", bn: "ছবি মেলানো" },
  recall_tap: { en: "What Did You See?", bn: "আপনি কী দেখেছেন?" },
  find_object: { en: "Find the Object", bn: "জিনিসটি খুঁজুন" },
  quick_spot: { en: "Quick Spot", bn: "চটপট দেখা" },
  sequence: { en: "What Comes Next?", bn: "এরপর কী আসবে?" },
  arrange: { en: "Put in Order", bn: "ক্রমে সাজান" },
};

export const MODE_EMOJI: Record<GameMode, string> = {
  matching: "🃏",
  recall_tap: "👁️",
  find_object: "🔍",
  quick_spot: "⚡",
  sequence: "🔷",
  arrange: "📋",
};

export const MEMORY_ITEMS = ["🍎", "🌻", "🐦", "☕", "🔑", "🧵"];
export const ATTENTION_ITEMS = ["🔑", "👓", "☂️", "🧦", "📻", "🪥", "🍌", "🧼"];
/** Familiar objects shown in "What Did You See?" (5 targets are picked from these). */
export const RECALL_ITEMS = ["🍵", "🕯️", "📕", "🪑", "🧺", "🥄", "🧢", "🌼"];
/** Distractors; the last two are deliberately similar to the targets for level 2. */
export const RECALL_DISTRACTORS = ["🚲", "🐈", "🎈", "🧊", "🍶", "📗"];
/** Single familiar objects flashed in "Quick Spot". */
export const SPOT_ITEMS = ["🔔", "🍋", "🧤", "🕰️", "🍞", "🌂"];
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
  { state: "Assam", users: 6240, sessions: 28460 },
  { state: "Tripura", users: 2580, sessions: 11790 },
  { state: "Meghalaya", users: 1960, sessions: 8420 },
  { state: "Manipur", users: 1740, sessions: 7680 },
  { state: "Nagaland", users: 1320, sessions: 5710 },
  { state: "Arunachal Pradesh", users: 940, sessions: 3890 },
  { state: "Mizoram", users: 860, sessions: 3740 },
  { state: "Sikkim", users: 510, sessions: 2180 },
];

export const LANGUAGE_USAGE = [
  { language: "Bengali", value: 41 },
  { language: "English", value: 34 },
  { language: "Tamil", value: 14 },
  { language: "Malayalam", value: 11 },
];
