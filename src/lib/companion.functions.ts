import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { bhashiniSynthesize, bhashiniTranscribe, getCompanionReply } from "./companion.server";

const langSchema = z.enum(["en", "bn"]);

/** Bhashini speech-to-text. Never throws — returns ok:false so the browser can fall back. */
export const transcribeSpeech = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ audio: z.string().min(100).max(4_000_000), lang: langSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const text = await bhashiniTranscribe(data.audio, data.lang);
      return { ok: true as const, text };
    } catch (e) {
      console.error("[companion] Bhashini ASR unavailable:", e instanceof Error ? e.message : e);
      return { ok: false as const, text: "" };
    }
  });

/** Bhashini text-to-speech. Returns base64 WAV, or ok:false for the browser fallback. */
export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().min(1).max(900), lang: langSchema }).parse(d))
  .handler(async ({ data }) => {
    try {
      const audio = await bhashiniSynthesize(data.text, data.lang);
      return { ok: true as const, audio };
    } catch (e) {
      console.error("[companion] Bhashini TTS unavailable:", e instanceof Error ? e.message : e);
      return { ok: false as const, audio: "" };
    }
  });

export const companionReply = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        text: z.string().min(1).max(2000),
        lang: langSchema,
        history: z
          .array(z.object({ from: z.enum(["user", "bot"]), text: z.string().max(2000) }))
          .max(40),
        elderName: z.string().max(80),
        caregiverName: z.string().max(80),
        favorites: z.array(z.string().max(120)).max(30),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    getCompanionReply(data.text, data.history, {
      lang: data.lang,
      elderName: data.elderName,
      caregiverName: data.caregiverName,
      favorites: data.favorites,
    }),
  );
