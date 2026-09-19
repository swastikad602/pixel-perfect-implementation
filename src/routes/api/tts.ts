import { createFileRoute } from "@tanstack/react-router";

/**
 * Cloud text-to-speech for RECONNECT — Sarvam AI (Bulbul v3).
 * Key never leaves the server; Sarvam returns base64 MP3 in `audios[0]`,
 * which is passed straight through to the client.
 */
const SPEAKER_EN = "anushka"; // clear, calm Indian-English voice
const SPEAKER_BN = "kavya"; // clearest of the Bengali speakers tried

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["SARVAM_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "TTS key not configured" }, { status: 503 });
        }

        let body: { text?: unknown; lang?: unknown };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const text = typeof body.text === "string" ? body.text.trim().slice(0, 900) : "";
        const lang = body.lang === "bn" ? "bn" : "en";
        if (!text) return Response.json({ error: "text is required" }, { status: 400 });

        const res = await fetch("https://api.sarvam.ai/text-to-speech", {
          method: "POST",
          headers: {
            "api-subscription-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model: "bulbul:v3",
            target_language_code: lang === "bn" ? "bn-IN" : "en-IN",
            speaker: lang === "bn" ? SPEAKER_BN : SPEAKER_EN,
            pace: 0.9, // gentle pace for elderly listeners
          }),
        });

        if (!res.ok) {
          const detail = await res.text();
          console.error(`Sarvam TTS failed [${res.status}]: ${detail}`);
          return Response.json({ error: detail || "TTS failed" }, { status: res.status });
        }

        const data = (await res.json()) as { audios?: string[] };
        const audio = data.audios?.[0];
        if (!audio) {
          return Response.json({ error: "No audio returned" }, { status: 502 });
        }
        return Response.json({ audio });
      },
    },
  },
});
