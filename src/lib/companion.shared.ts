import type { Lang } from "./types";

/**
 * Pure helpers shared by the browser and the server: distress detection,
 * warm fallback replies and the hidden reply tags the model can emit.
 * Safe to import anywhere (no secrets, no browser APIs).
 */

export const TAG_CONCERN = "[[CONCERN]]";
export const TAG_PLAY = "[[PLAY_FAVORITE]]";
export const TAG_NOTIFY = "[[NOTIFY_CAREGIVER]]";

export interface ReplyFlags {
  concern: boolean;
  playFavorite: boolean;
  notifyCaregiver: boolean;
}

/** Removes any [[TAG]] markers so they are never shown or read aloud. */
export function parseTags(raw: string): { text: string } & ReplyFlags {
  const concern = raw.includes(TAG_CONCERN);
  const playFavorite = raw.includes(TAG_PLAY);
  const notifyCaregiver = raw.includes(TAG_NOTIFY);
  const text = raw.replace(/\[\[[A-Z_]+\]\]/g, "").replace(/\s+/g, " ").trim();
  return { text, concern, playFavorite, notifyCaregiver };
}

/* ---------------- Distress detection (lightweight, keyword based) ---------------- */
// Assumption: a transparent keyword list is used as the always-on safety net; the model
// adds a [[CONCERN]] tag for paraphrases the list misses. Either one raises the alert.
const DISTRESS_EN: RegExp[] = [
  /\b(want|wish|going|ready) to die\b/,
  /\bwish (i|I) (was|were) dead\b/,
  /\b(kill|hurt|harm) myself\b/,
  /\bend (my|it all|my life)\b/,
  /\bsuicid/,
  /\bbetter off (dead|without me)\b/,
  /\b(don'?t|do not) want to (live|be here|wake up)\b/,
  /\bno (reason|point) (to|in) (live|living|go on)\b/,
  /\bcan'?t go on\b/,
  /\btired of (living|life)\b/,
  /\bhopeless\b/,
  /\b(nobody|no one) (cares|loves me|wants me)\b/,
  /\b(join|be with) (him|her|them|my (late|dead))\b/,
  /\bwant to go (to|be with) (my )?(late |dead )?(husband|wife|mother|father|son|daughter) (in heaven|who (died|passed))/,
  /\b(so|very|completely|all) alone\b/,
  /\b(terrified|so scared|very scared|so frightened)\b/,
];

const DISTRESS_BN: string[] = [
  "মরে যেতে চাই",
  "মরতে চাই",
  "মরে যাই",
  "বাঁচতে চাই না",
  "বাঁচতে ইচ্ছে করে না",
  "আত্মহত্যা",
  "নিজেকে শেষ",
  "বেঁচে থেকে কী লাভ",
  "বেঁচে থেকে কি লাভ",
  "আর পারছি না",
  "কেউ আমাকে ভালোবাসে না",
  "কেউ আমার খোঁজ নেয় না",
  "আমার কেউ নেই",
  "খুব একা",
  "ওর কাছে চলে যেতে চাই",
  "তার কাছে চলে যেতে চাই",
  "ওপারে চলে যেতে চাই",
  "খুব ভয় করছে",
  "ভীষণ ভয়",
];

export function detectDistress(text: string): string | null {
  const lower = text.toLowerCase();
  for (const re of DISTRESS_EN) if (re.test(lower)) return `Matched phrase: "${lower.match(re)?.[0]}"`;
  for (const p of DISTRESS_BN) if (text.includes(p)) return `Matched phrase: "${p}"`;
  return null;
}

/** "play my song", "গান শোনাও" … — a direct request for a favourite. */
export function wantsFavorite(text: string): boolean {
  const lower = text.toLowerCase();
  if (/\b(play|put on|hear|listen to|sing)\b.*\b(song|music|poem|gaan|kobita|favou?rite)\b/.test(lower)) return true;
  return ["গান শোনাও", "গান বাজাও", "গানটা", "কবিতা শোনাও", "প্রিয় গান", "গান শুনব", "গান শুনতে"].some((p) =>
    text.includes(p),
  );
}

/* ---------------- Warm fallbacks (API down, offline, safety block) ---------------- */
const FALLBACK: Record<Lang, string[]> = {
  en: [
    "I'm here with you. Tell me more.",
    "That sounds important. I'm listening.",
    "Thank you for telling me. How are you feeling now?",
    "I'm right here. Would you like to tell me about it?",
  ],
  bn: [
    "আমি আপনার পাশে আছি। আরও বলুন।",
    "শুনছি, বলুন।",
    "আমাকে বলার জন্য ধন্যবাদ। এখন কেমন লাগছে?",
    "আমি এখানেই আছি। সে কথা একটু বলবেন?",
  ],
};

export function fallbackReply(lang: Lang, seed = Date.now()): string {
  const list = FALLBACK[lang];
  return list[seed % list.length]!;
}

export function distressFallback(lang: Lang, caregiver: string): string {
  return lang === "bn"
    ? `আমি আপনার পাশেই আছি। আমি ${caregiver}কে জানাচ্ছি, যাতে কেউ শীঘ্রই আপনার কাছে আসে।`
    : `I'm right here with you. I'm letting ${caregiver} know, so someone can be with you soon.`;
}
