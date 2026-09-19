import type { Lang } from "./types";
import { getDb } from "./db";
import { STRINGS } from "./i18n";

/**
 * Cloud TTS (ElevenLabs via /api/tts) with a Dexie clip cache and a
 * browser SpeechSynthesis fallback so the user never gets silence.
 * speak(text, lang) keeps its original name and signature.
 */

const memory = new Map<string, string>(); // key -> base64 mp3
const inflight = new Map<string, Promise<string | null>>();
let current: HTMLAudioElement | null = null;

const keyOf = (text: string, lang: Lang) => `${lang}:${text}`;

type Listener = (speaking: boolean) => void;
const listeners = new Set<Listener>();
let busy = false;
function setBusy(v: boolean) {
  busy = v;
  listeners.forEach((l) => l(v));
}
export function onSpeakingChange(l: Listener) {
  listeners.add(l);
  l(busy);
  return () => listeners.delete(l);
}

export function ttsAvailable() {
  return typeof window !== "undefined";
}

function browserFallback(text: string, lang: Lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const wanted = lang === "bn" ? "bn" : "en";
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(wanted));
  if (voice) utter.voice = voice;
  utter.lang = lang === "bn" ? "bn-IN" : "en-IN";
  utter.rate = 0.9;
  utter.onend = () => setBusy(false);
  utter.onerror = () => setBusy(false);
  synth.speak(utter);
}

async function fromCache(key: string): Promise<string | null> {
  if (memory.has(key)) return memory.get(key)!;
  try {
    const row = await getDb().ttsClips.get(key);
    if (row?.audio) {
      memory.set(key, row.audio);
      return row.audio;
    }
  } catch {
    /* cache is best-effort */
  }
  return null;
}

async function fetchClip(text: string, lang: Lang): Promise<string | null> {
  const key = keyOf(text, lang);
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { audio?: string };
      if (!data.audio) return null;
      memory.set(key, data.audio);
      try {
        await getDb().ttsClips.put({ key, audio: data.audio, createdAt: Date.now() });
      } catch {
        /* ignore quota / private-mode errors */
      }
      return data.audio;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

function play(audio: string) {
  if (current) {
    current.pause();
    current = null;
  }
  // Sarvam returns WAV ("UklGR..." = RIFF); older cached clips are MP3.
  const mime = audio.startsWith("UklGR") ? "audio/wav" : "audio/mpeg";
  const el = new Audio(`data:${mime};base64,${audio}`);
  current = el;
  el.onended = () => setBusy(false);
  el.onerror = () => setBusy(false);
  void el.play().catch(() => setBusy(false));
}

export function speak(text: string, lang: Lang) {
  if (typeof window === "undefined" || !text) return;
  setBusy(true);
  void (async () => {
    const key = keyOf(text, lang);
    const cached = await fromCache(key);
    if (cached) {
      play(cached);
      return;
    }
    const fresh = await fetchClip(text, lang);
    if (fresh) play(fresh);
    else browserFallback(text, lang); // offline, missing key, or API error
  })();
}

/** 15–20 everyday phrases warmed in both languages on first load. */
const COMMON_KEYS = [
  "wellDone",
  "play",
  "myRoutine",
  "myPeople",
  "help",
  "hello",
  "chooseActivity",
  "done",
  "remindLater",
  "needHelp",
  "helpText",
  "callCaregiver",
  "memoryInstruction",
  "attentionInstruction",
  "patternInstruction",
  "executiveInstruction",
  "todayReminders",
  "playAgain",
  "exit",
];

const EXTRA: { en: string; bn: string }[] = [
  { en: "It's time for your medicine", bn: "আপনার ওষুধ খাওয়ার সময় হয়েছে" },
  { en: "Would you like to continue?", bn: "আপনি কি চালিয়ে যেতে চান?" },
  { en: "Try again", bn: "আবার চেষ্টা করুন" },
];

/** Pre-generates and caches common phrases so they play instantly, even offline. */
export async function prewarmTts() {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const phrases: { text: string; lang: Lang }[] = [];
  for (const k of COMMON_KEYS) {
    const e = STRINGS[k];
    if (!e) continue;
    phrases.push({ text: e.en, lang: "en" }, { text: e.bn, lang: "bn" });
  }
  for (const e of EXTRA) phrases.push({ text: e.en, lang: "en" }, { text: e.bn, lang: "bn" });

  for (const p of phrases) {
    if (await fromCache(keyOf(p.text, p.lang))) continue;
    await fetchClip(p.text, p.lang);
  }
}
