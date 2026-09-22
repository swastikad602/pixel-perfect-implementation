import type { Lang } from "./types";
import { detectDistress, distressFallback, fallbackReply, parseTags } from "./companion.shared";

/* =====================================================================
 * Response generation — getCompanionReply()
 * Isolated and swappable: replace the body to use a different LLM.
 * Primary: Google Gemini 2.5 Flash (GEMINI_API_KEY, generateContent).
 * Assumption: until GEMINI_API_KEY is added, the same Gemini 2.5 Flash model is
 * reached through the built-in AI gateway so the companion still works.
 * ===================================================================== */

export interface HistoryTurn {
  from: "user" | "bot";
  text: string;
}

export interface ReplyContext {
  lang: Lang;
  elderName: string;
  caregiverName: string;
  favorites: string[];
}

export interface CompanionReply {
  reply: string;
  concern: boolean;
  concernReason: string | null;
  playFavorite: boolean;
  notifyCaregiver: boolean;
  source: "gemini" | "gateway" | "fallback";
}

export function buildSystemPrompt(ctx: ReplyContext): string {
  const language =
    ctx.lang === "bn"
      ? "Bengali, written in Bengali script (বাংলা), everyday spoken Bengali"
      : "simple, everyday English";
  const favs = ctx.favorites.length ? ctx.favorites.map((f) => `"${f}"`).join(", ") : "none yet";
  return `You are a gentle, patient companion for ${ctx.elderName}, an older adult who may be living with memory loss. You are talking out loud, by voice.

HOW YOU TALK
- Like a caring friend, not an assistant or a service. Calm, warm, simple words, short sentences.
- Reply in 1 to 3 short sentences only. No lists, no emojis, no markdown, no stage directions.
- Always reply in ${language}.
- Respond to what they actually said. Ask at most one gentle question.

WHO YOU ARE
- You are not a human. Never claim to be a person, a family member, a friend from their past, or anyone real.
- If asked who you are, answer gently and honestly, for example: "I'm your friendly companion, here to chat with you."
- If they call you by a relative's name, do not pretend to be that person. Kindly say you are their companion, and invite them to talk about that person.

WHEN THEY SEEM CONFUSED
- If they ask for someone who has passed away, think it is an earlier year, or want to go to an old home: never argue, never correct harshly, never insist on "the truth".
- Do not confirm or add to details that are not true either. Stay warm and non-committal.
- Acknowledge the feeling underneath ("You miss her very much", "That home meant a lot to you"), then softly move toward something comforting or present: a happy memory, how they feel now, a cup of tea, a favourite song.

REAL PEOPLE MATTER MOST
- You do not replace ${ctx.caregiverName} or their family. Now and then (not every reply) warmly suggest real contact, e.g. "Would you like me to let ${ctx.caregiverName} know you're feeling this way?"
- If they clearly say yes to letting ${ctx.caregiverName} know, or ask for ${ctx.caregiverName} or family to come, reassure them and add ${"[[NOTIFY_CAREGIVER]]"} at the very end.

HEALTH
- Never give medical, diagnostic, medicine, dosage or treatment advice of any kind, not even general tips.
- For anything about health, pain, medicines or symptoms, say kindly that ${ctx.caregiverName} or their doctor is the right person to help, and offer to let ${ctx.caregiverName} know.

DISTRESS
- If they sound very sad, hopeless, frightened, in pain, very lonely, or speak about dying, not wanting to live, or wanting to join someone who has died: stay warm and present, keep them company, and say you will let ${ctx.caregiverName} know so someone can be with them. Do not try to counsel, fix or solve it.
- In that case add ${"[[CONCERN]]"} at the very end of your reply.

FAVOURITE SONGS AND POEMS
- Available recordings: ${favs}.
- If it feels like a good moment (they seem low, restless, or mention music or poems) you may occasionally offer one. Do not offer again if you offered recently.
- If they ask to hear a song, poem or music and recordings are available, say you will play it and add ${"[[PLAY_FAVORITE]]"} at the very end. If none are available, say ${ctx.caregiverName} can add some.

The [[...]] tags are hidden instructions for the app and are never read aloud. Only use them in the situations above.`;
}

function toGeminiContents(history: HistoryTurn[], message: string) {
  const turns = [...history.slice(-12), { from: "user" as const, text: message }];
  // Gemini expects the conversation to start with a user turn and alternate roles.
  while (turns.length && turns[0]!.from !== "user") turns.shift();
  const out: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const t of turns) {
    const role = t.from === "user" ? "user" : "model";
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts[0]!.text += `\n${t.text}`;
    else out.push({ role, parts: [{ text: t.text }] });
  }
  return out;
}

async function callGemini(apiKey: string, system: string, history: HistoryTurn[], message: string) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: toGeminiContents(history, message),
        generationConfig: {
          temperature: 0.7,
          // Safety net only — brevity is enforced by the prompt so speech never cuts mid-sentence.
          maxOutputTokens: 300,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    promptFeedback?: { blockReason?: string };
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  };
  if (data.promptFeedback?.blockReason) throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
  const cand = data.candidates?.[0];
  if (cand?.finishReason === "SAFETY") throw new Error("Gemini safety stop");
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini empty reply");
  return text;
}

async function callGateway(apiKey: string, system: string, history: HistoryTurn[], message: string) {
  const messages = [
    { role: "system", content: system },
    ...history.slice(-12).map((h) => ({ role: h.from === "user" ? "user" : "assistant", content: h.text })),
    { role: "user", content: message },
  ];
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, max_tokens: 300, temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Gateway empty reply");
  return text;
}

export async function getCompanionReply(
  transcript: string,
  conversationHistory: HistoryTurn[],
  ctx: ReplyContext,
): Promise<CompanionReply> {
  const keywordConcern = detectDistress(transcript);
  const system = buildSystemPrompt(ctx);
  const geminiKey = process.env["GEMINI_API_KEY"];
  const gatewayKey = process.env["LOVABLE_API_KEY"];

  let raw: string | null = null;
  let source: CompanionReply["source"] = "fallback";
  try {
    if (geminiKey) {
      raw = await callGemini(geminiKey, system, conversationHistory, transcript);
      source = "gemini";
    } else if (gatewayKey) {
      raw = await callGateway(gatewayKey, system, conversationHistory, transcript);
      source = "gateway";
    }
  } catch (e) {
    console.error("[companion] reply generation failed, using warm fallback:", e);
    raw = null;
    source = "fallback";
  }

  if (raw === null) {
    const concern = !!keywordConcern;
    return {
      reply: concern ? distressFallback(ctx.lang, ctx.caregiverName) : fallbackReply(ctx.lang),
      concern,
      concernReason: keywordConcern,
      playFavorite: false,
      notifyCaregiver: false,
      source,
    };
  }

  const parsed = parseTags(raw);
  const concern = parsed.concern || !!keywordConcern;
  return {
    reply: parsed.text || fallbackReply(ctx.lang),
    concern,
    concernReason: keywordConcern ?? (parsed.concern ? "Companion model noticed signs of distress" : null),
    playFavorite: parsed.playFavorite,
    notifyCaregiver: parsed.notifyCaregiver,
    source,
  };
}

/* =====================================================================
 * Bhashini (ULCA) — ASR and TTS pipelines.
 * Step 1: getModelsPipeline (userID + ulcaApiKey) → serviceId + compute endpoint.
 * Step 2: call the compute endpoint with the returned inference key.
 * Secrets: BHASHINI_USER_ID, BHASHINI_API_KEY, BHASHINI_PIPELINE_ID.
 * ===================================================================== */

// Public MeitY pipeline — used if BHASHINI_PIPELINE_ID is not set.
const DEFAULT_PIPELINE_ID = "64392f96daac500b55c543cd";

interface PipelineConfig {
  serviceId: string;
  callbackUrl: string;
  authName: string;
  authValue: string;
  expires: number;
}
const configCache = new Map<string, PipelineConfig>();

export class BhashiniUnavailable extends Error {}

async function getPipelineConfig(task: "asr" | "tts", lang: Lang): Promise<PipelineConfig> {
  const key = `${task}:${lang}`;
  const hit = configCache.get(key);
  if (hit && hit.expires > Date.now()) return hit;

  const userId = process.env["BHASHINI_USER_ID"];
  const apiKey = process.env["BHASHINI_API_KEY"];
  const pipelineId = process.env["BHASHINI_PIPELINE_ID"] || DEFAULT_PIPELINE_ID;
  if (!userId || !apiKey) throw new BhashiniUnavailable("Bhashini credentials are not configured");

  const res = await fetch("https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json", userID: userId, ulcaApiKey: apiKey },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      pipelineTasks: [{ taskType: task, config: { language: { sourceLanguage: lang } } }],
      pipelineRequestConfig: { pipelineId },
    }),
  });
  if (!res.ok) throw new BhashiniUnavailable(`Bhashini config ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    pipelineResponseConfig?: { taskType: string; config?: { serviceId?: string }[] }[];
    pipelineInferenceAPIEndPoint?: { callbackUrl?: string; inferenceApiKey?: { name?: string; value?: string } };
  };
  const serviceId = data.pipelineResponseConfig?.find((c) => c.taskType === task)?.config?.[0]?.serviceId;
  const ep = data.pipelineInferenceAPIEndPoint;
  if (!serviceId || !ep?.callbackUrl || !ep.inferenceApiKey?.value) {
    throw new BhashiniUnavailable(`Bhashini has no ${task} service for ${lang}`);
  }
  const cfg: PipelineConfig = {
    serviceId,
    callbackUrl: ep.callbackUrl,
    authName: ep.inferenceApiKey.name || "Authorization",
    authValue: ep.inferenceApiKey.value,
    expires: Date.now() + 30 * 60 * 1000,
  };
  configCache.set(key, cfg);
  return cfg;
}

async function compute(cfg: PipelineConfig, body: unknown) {
  const res = await fetch(cfg.callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", [cfg.authName]: cfg.authValue },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new BhashiniUnavailable(`Bhashini compute ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as {
    pipelineResponse?: {
      taskType: string;
      output?: { source?: string }[];
      audio?: { audioContent?: string }[];
    }[];
  };
}

/** Speech → text. `wavBase64` is 16 kHz mono PCM WAV. */
export async function bhashiniTranscribe(wavBase64: string, lang: Lang): Promise<string> {
  const cfg = await getPipelineConfig("asr", lang);
  const data = await compute(cfg, {
    pipelineTasks: [
      {
        taskType: "asr",
        config: { language: { sourceLanguage: lang }, serviceId: cfg.serviceId, audioFormat: "wav", samplingRate: 16000 },
      },
    ],
    inputData: { audio: [{ audioContent: wavBase64 }] },
  });
  return data.pipelineResponse?.[0]?.output?.[0]?.source?.trim() ?? "";
}

/** Text → speech. Returns base64 WAV. */
export async function bhashiniSynthesize(text: string, lang: Lang): Promise<string> {
  const cfg = await getPipelineConfig("tts", lang);
  const data = await compute(cfg, {
    pipelineTasks: [
      {
        taskType: "tts",
        config: { language: { sourceLanguage: lang }, serviceId: cfg.serviceId, gender: "female", samplingRate: 22050 },
      },
    ],
    inputData: { input: [{ source: text }] },
  });
  const audio = data.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
  if (!audio) throw new BhashiniUnavailable("Bhashini returned no audio");
  return audio;
}
