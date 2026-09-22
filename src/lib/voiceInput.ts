import type { Lang } from "./types";

/**
 * Hold-to-talk capture. Records the mic (for Bhashini ASR, as 16 kHz mono WAV)
 * while the browser's own SpeechRecognition listens in parallel, so there is a
 * ready transcript to fall back to if Bhashini is unavailable.
 */

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canRecord() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

export class HoldRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private sr: SR | null = null;
  private srEnded: Promise<void> = Promise.resolve();
  private finals = "";
  private interim = "";
  private startedAt = 0;

  async start(lang: Lang) {
    this.chunks = [];
    this.finals = "";
    this.interim = "";
    this.startedAt = Date.now();

    if (canRecord()) {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
      this.recorder = new MediaRecorder(this.stream);
      this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
      this.recorder.start();
    }

    const Ctor = getSpeechRecognition();
    if (Ctor) {
      try {
        const sr = new Ctor();
        sr.lang = lang === "bn" ? "bn-IN" : "en-IN";
        sr.continuous = true;
        sr.interimResults = true;
        sr.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i]!;
            if (r.isFinal) this.finals += `${r[0]!.transcript} `;
            else interim += r[0]!.transcript;
          }
          this.interim = interim;
        };
        this.srEnded = new Promise((resolve) => {
          sr.onend = () => resolve();
          sr.onerror = () => resolve();
        });
        sr.start();
        this.sr = sr;
      } catch {
        this.sr = null;
      }
    }
    if (!this.recorder && !this.sr) throw new Error("no-mic");
  }

  /** Stops everything; returns WAV for Bhashini (null if too short) and the browser transcript. */
  async stop(): Promise<{ wavBase64: string | null; browserText: string; durationMs: number }> {
    const durationMs = Date.now() - this.startedAt;
    const recorded = new Promise<Blob | null>((resolve) => {
      if (!this.recorder || this.recorder.state === "inactive") return resolve(null);
      this.recorder.onstop = () => resolve(new Blob(this.chunks, { type: this.recorder?.mimeType || "audio/webm" }));
      this.recorder.stop();
    });
    if (this.sr) {
      try {
        this.sr.stop();
      } catch {
        /* already stopped */
      }
    }
    const blob = await recorded;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    await Promise.race([this.srEnded, new Promise((r) => setTimeout(r, 1500))]);
    this.sr = null;

    let wavBase64: string | null = null;
    if (blob && blob.size > 0 && durationMs > 400) {
      try {
        wavBase64 = await toWav16kBase64(blob);
      } catch (e) {
        console.warn("[companion] could not convert recording", e);
      }
    }
    return { wavBase64, browserText: (this.finals || this.interim).trim(), durationMs };
  }

  cancel() {
    try {
      this.recorder?.stop();
      this.sr?.stop();
    } catch {
      /* noop */
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    this.sr = null;
  }
}

async function toWav16kBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(buf);
  void ctx.close();
  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  const pcm = rendered.getChannelData(0);

  const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  out.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, rate, true);
  out.setUint32(28, rate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  str(36, "data");
  out.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]!));
    out.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(out.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
