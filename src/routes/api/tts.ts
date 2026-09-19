import { createFileRoute } from "@tanstack/react-router";

/**
 * Cloud text-to-speech for RECONNECT.
 * Key never leaves the server; returns base64 MP3 because ElevenLabs replies with raw audio bytes.
 */
const VOICE_EN = "JBFqnCBsd6RMkjVDRZzb"; // George — clear, calm English
const VOICE_BN = "EXAVITQu4vr4xnSDxMaL"; // Sarah — clearest of the voices tried on Bengali script

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["ELEVENLABS_API_KEY"];
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

        const voiceId = lang === "bn" ? VOICE_BN : VOICE_EN;
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.6,
                similarity_boost: 0.75,
                style: 0.2,
                use_speaker_boost: true,
                speed: 0.9, // gentle pace for elderly listeners
              },
            }),
          },
        );

        if (!res.ok) {
          const detail = await res.text();
          console.error(`ElevenLabs TTS failed [${res.status}]: ${detail}`);
          return Response.json({ error: detail || "TTS failed" }, { status: res.status });
        }

        const audio = Buffer.from(await res.arrayBuffer()).toString("base64");
        return Response.json({ audio });
      },
    },
  },
});
