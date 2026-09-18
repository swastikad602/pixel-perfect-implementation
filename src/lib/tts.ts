import type { Lang } from "./types";

// Browser SpeechSynthesis only — no paid cloud TTS. Silently degrades to text-only.
export function speak(text: string, lang: Lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const wanted = lang === "bn" ? "bn" : "en";
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(wanted));
  if (voice) utter.voice = voice;
  utter.lang = lang === "bn" ? "bn-IN" : "en-IN";
  utter.rate = 0.9;
  synth.speak(utter);
}

export function ttsAvailable() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
