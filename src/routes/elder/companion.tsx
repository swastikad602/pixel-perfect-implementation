import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mic, Music, Square, Send } from "lucide-react";
import { ElderShell } from "@/components/rc/ElderShell";
import { AudioIcon, Button, Card } from "@/components/rc/ui";
import { getDb, hasCompanionConsent, pruneCompanion, setCompanionConsent } from "@/lib/db";
import { useDexie } from "@/hooks/useDexie";
import { useApp } from "@/store/app";
import { t, tf } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { SEED_ACCOUNTS } from "@/lib/mockData";
import { HoldRecorder } from "@/lib/voiceInput";
import { onSpeakingChange, playClip, speak, stopSpeaking } from "@/lib/tts";
import { companionReply, synthesizeSpeech, transcribeSpeech } from "@/lib/companion.functions";
import { detectDistress, distressFallback, fallbackReply, wantsFavorite } from "@/lib/companion.shared";
import type { CompanionMessage, Favorite } from "@/lib/types";

export const Route = createFileRoute("/elder/companion")({
  component: Companion,
  head: () => ({
    meta: [
      { title: "Talk to a Friend — RECONNECT" },
      { name: "description", content: "A gentle voice companion: hold the button, speak, and hear a warm reply." },
      { property: "og:title", content: "Talk to a Friend — RECONNECT" },
      { property: "og:description", content: "Voice-first, warm companion chat in Bengali or English, with favourite songs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Phase = "idle" | "listening" | "thinking" | "speaking";

// Assumption: the demo has one caregiver account; its first name is used in replies.
const CAREGIVER_NAME = (SEED_ACCOUNTS.find((a) => a.role === "caregiver")?.name ?? "your caregiver").split(" ")[0]!;

function waitForSpeechEnd() {
  return new Promise<void>((resolve) => {
    let seenBusy = false;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      unsubscribe();
      resolve();
    };
    const unsubscribe = onSpeakingChange((busy) => {
      if (busy) seenBusy = true;
      else if (seenBusy) queueMicrotask(finish);
    });
    setTimeout(finish, 45000);
  });
}

function Companion() {
  const navigate = useNavigate();
  const lang = useApp((s) => s.lang);
  const elderId = useApp((s) => s.elderId);
  const userName = useApp((s) => s.userName);
  const bump = useApp((s) => s.bump);
  const firstName = userName.split(" ")[0] ?? "";

  const consent = useDexie(async () => (elderId ? hasCompanionConsent(elderId) : false), [elderId]);
  const messages = useDexie(
    async () => (elderId ? getDb().companion.where("elderId").equals(elderId).sortBy("ts") : []),
    [elderId],
  );
  const favorites = useDexie(
    async () => (elderId ? getDb().favorites.where("elderId").equals(elderId).sortBy("createdAt") : []),
    [elderId],
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [tapMode, setTapMode] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const [picker, setPicker] = useState(false);
  const [playing, setPlaying] = useState<Favorite | null>(null);
  const [typed, setTyped] = useState("");

  const phaseRef = useRef<Phase>("idle");
  const tapRef = useRef(false);
  const recRef = useRef<HoldRecorder | null>(null);
  const startRef = useRef<Promise<void> | null>(null);
  const pressAt = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const favIdx = useRef(0);
  const msgsRef = useRef<CompanionMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  msgsRef.current = messages ?? [];
  const setP = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    if (elderId) void pruneCompanion(elderId);
  }, [elderId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length, phase]);

  useEffect(
    () => () => {
      recRef.current?.cancel();
      audioRef.current?.pause();
      stopSpeaking();
    },
    [],
  );

  const stopFavorite = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(null);
  };

  const playFavorite = (f: Favorite) => {
    stopSpeaking();
    stopFavorite();
    const url = URL.createObjectURL(f.audio);
    const el = new Audio(url);
    audioRef.current = el;
    el.onended = () => {
      URL.revokeObjectURL(url);
      setPlaying(null);
    };
    setPlaying(f);
    setPicker(false);
    void el.play().catch(() => setPlaying(null));
  };

  /** Speaks a reply: Bhashini TTS first, then the app's usual voice (cloud → browser). */
  const say = async (text: string) => {
    setP("speaking");
    let played = false;
    if (navigator.onLine) {
      try {
        const r = await synthesizeSpeech({ data: { text, lang } });
        if (r.ok && r.audio) {
          playClip(r.audio);
          played = true;
        }
      } catch {
        /* fall through to speak() */
      }
    }
    if (!played) speak(text, lang);
    await waitForSpeechEnd();
    setP("idle");
  };

  const offerFavorite = async (fromVoice: boolean) => {
    const list = favorites ?? [];
    if (list.length === 0) return say(t("noFavorites", lang));
    if (list.length === 1) return playFavorite(list[0]!);
    if (fromVoice) {
      playFavorite(list[favIdx.current % list.length]!);
      favIdx.current += 1;
    } else {
      setPicker(true);
      speak(t("chooseFavorite", lang), lang);
    }
  };

  const handleUserText = async (text: string) => {
    if (!elderId) return;
    setP("thinking");
    const db = getDb();
    const history = msgsRef.current.slice(-12).map((m) => ({ from: m.from, text: m.text }));
    const userMsgId = await db.companion.add({ elderId, from: "user", text, ts: Date.now() });
    bump();

    let result: {
      reply: string;
      concern: boolean;
      concernReason: string | null;
      playFavorite: boolean;
      notifyCaregiver: boolean;
    };
    try {
      if (!navigator.onLine) throw new Error("offline");
      result = await companionReply({
        data: {
          text,
          lang,
          history,
          elderName: firstName,
          caregiverName: CAREGIVER_NAME,
          favorites: (favorites ?? []).map((f) => f.title),
        },
      });
    } catch {
      // Offline or backend unreachable: warm local reply, local distress check.
      const reason = detectDistress(text);
      result = {
        reply: reason ? distressFallback(lang, CAREGIVER_NAME) : fallbackReply(lang),
        concern: !!reason,
        concernReason: reason,
        playFavorite: false,
        notifyCaregiver: false,
      };
    }

    if (result.concern || result.notifyCaregiver) {
      // Silent caregiver alert — the elder only ever hears the warm reply.
      await db.alerts.add({
        elderId,
        level: result.concern ? "urgent" : "request",
        transcript: text,
        reply: result.reply,
        reason: result.concern
          ? (result.concernReason ?? "Signs of distress in a Companion chat")
          : "Asked for their caregiver during a Companion chat",
        ts: Date.now(),
        acknowledged: 0,
      });
      await db.companion.update(userMsgId, { flagged: true });
    }
    await db.companion.add({ elderId, from: "bot", text: result.reply, ts: Date.now() });
    bump();

    await say(result.reply);
    if ((result.playFavorite || wantsFavorite(text)) && !result.concern) await offerFavorite(true);
  };

  const finishListening = async () => {
    tapRef.current = false;
    setTapMode(false);
    setP("thinking");
    await startRef.current?.catch(() => undefined);
    const rec = recRef.current;
    if (!rec) return setP("idle");
    const { wavBase64, browserText } = await rec.stop();

    let text = "";
    if (wavBase64 && navigator.onLine) {
      try {
        const r = await transcribeSpeech({ data: { audio: wavBase64, lang } });
        if (r.ok) text = r.text;
      } catch {
        /* use browser transcript */
      }
    }
    if (!text) text = browserText; // Bhashini unavailable → browser SpeechRecognition
    if (!text) return say(t("didNotHear", lang));
    await handleUserText(text);
  };

  const onPressStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (phaseRef.current === "listening") {
      if (tapRef.current) void finishListening();
      return;
    }
    if (phaseRef.current === "thinking") return;
    stopSpeaking();
    stopFavorite();
    setPicker(false);
    pressAt.current = Date.now();
    setP("listening");
    recRef.current ??= new HoldRecorder();
    startRef.current = recRef.current.start(lang).catch((err) => {
      console.warn("[companion] mic unavailable", err);
      setMicBlocked(true);
      tapRef.current = false;
      setTapMode(false);
      setP("idle");
      throw err;
    });
  };

  const onPressEnd = () => {
    if (phaseRef.current !== "listening" || tapRef.current) return;
    // A quick tap switches to tap-to-start / tap-to-stop, easier for unsteady hands.
    if (Date.now() - pressAt.current < 450) {
      tapRef.current = true;
      setTapMode(true);
      return;
    }
    void finishListening();
  };

  const sendTyped = async () => {
    const v = typed.trim();
    if (!v || phaseRef.current === "thinking") return;
    setTyped("");
    stopSpeaking();
    stopFavorite();
    await handleUserText(v);
  };

  const greeting = tf("companionGreeting", lang, { name: firstName });
  const status =
    phase === "listening"
      ? tapMode
        ? t("tapToStop", lang)
        : t("listening", lang)
      : phase === "thinking"
        ? t("thinking", lang)
        : phase === "speaking"
          ? t("speakingNow", lang)
          : t("holdHint", lang);

  if (consent === undefined) return <ElderShell title={t("companion", lang)}>{null}</ElderShell>;

  if (!consent) {
    return (
      <ElderShell title={t("companion", lang)} onBack={() => navigate({ to: "/elder" })}>
        <Card className="mx-auto max-w-2xl space-y-6 p-8 text-center">
          <div className="text-6xl">🤝</div>
          <div className="flex items-center justify-center gap-3">
            <h2 className="font-serif text-3xl font-bold">{t("consentTitle", lang)}</h2>
          </div>
          <div className="flex items-start gap-3 text-left">
            <p className="text-xl leading-relaxed">{t("consentText", lang)}</p>
            <AudioIcon text={t("consentText", lang)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              size="xl"
              onClick={async () => {
                if (!elderId) return;
                await setCompanionConsent(elderId, true, "elder");
                bump();
              }}
            >
              {t("consentYes", lang)}
            </Button>
            <Button size="xl" variant="soft" onClick={() => navigate({ to: "/elder" })}>
              {t("consentNo", lang)}
            </Button>
          </div>
        </Card>
      </ElderShell>
    );
  }

  return (
    <ElderShell title={t("companion", lang)} onBack={() => navigate({ to: "/elder" })}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="max-h-[42vh] space-y-4 overflow-y-auto rounded-3xl border border-border bg-card p-5">
          <Bubble from="bot" text={greeting} />
          {(messages ?? []).map((m) => (
            <Bubble key={m.id} from={m.from} text={m.text} />
          ))}
          {phase === "thinking" && (
            <div className="flex gap-2 px-2" aria-label={t("thinking", lang)}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-3 w-3 animate-bounce rounded-full bg-primary/50"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="min-h-9 text-center font-serif text-2xl" aria-live="polite">
            {status}
          </p>
          <div className="relative">
            {phase === "listening" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" aria-hidden />
            )}
            <button
              type="button"
              aria-label={t("holdToTalk", lang)}
              onPointerDown={onPressStart}
              onPointerUp={onPressEnd}
              onPointerCancel={onPressEnd}
              onContextMenu={(e) => e.preventDefault()}
              disabled={phase === "thinking"}
              className={cn(
                "relative flex h-44 w-44 touch-none select-none flex-col items-center justify-center gap-2 rounded-full border-8 shadow-lg transition-all focus-visible:outline-none focus-visible:ring-8 focus-visible:ring-ring/40 disabled:opacity-60",
                phase === "listening"
                  ? "scale-105 border-accent bg-accent text-accent-foreground"
                  : "border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {phase === "listening" ? <Square className="h-14 w-14" /> : <Mic className="h-16 w-16" />}
              <span className="px-3 text-center text-lg font-bold leading-tight">{t("holdToTalk", lang)}</span>
            </button>
          </div>
          {micBlocked && <p className="text-center text-lg text-muted-foreground">{t("micBlocked", lang)}</p>}
        </div>

        {playing ? (
          <Card className="flex items-center gap-4">
            <Music className="h-10 w-10 shrink-0 animate-pulse text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-2xl font-bold">{playing.title}</p>
              {playing.label && <p className="truncate text-lg text-muted-foreground">{playing.label}</p>}
            </div>
            <Button size="lg" variant="soft" onClick={stopFavorite}>
              <Square className="h-5 w-5" /> {t("stop", lang)}
            </Button>
          </Card>
        ) : (
          <Button
            variant="elder"
            size="xl"
            className="w-full"
            disabled={phase === "listening" || phase === "thinking"}
            onClick={() => {
              stopSpeaking();
              void offerFavorite(false);
            }}
          >
            <Music className="h-8 w-8 text-primary" /> {t("playFavorite", lang)}
          </Button>
        )}

        {picker && (favorites ?? []).length > 1 && (
          <div className="space-y-3">
            <p className="text-center font-serif text-2xl">{t("chooseFavorite", lang)}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(favorites ?? []).map((f) => (
                <button
                  key={f.id}
                  onClick={() => playFavorite(f)}
                  className="flex min-h-24 flex-col items-start justify-center rounded-3xl border-4 border-primary/25 bg-card p-5 text-left shadow-sm transition-all hover:border-primary"
                >
                  <span className="font-serif text-2xl font-bold">🎵 {f.title}</span>
                  {f.label && <span className="text-base text-muted-foreground">{f.label}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <details className="rounded-2xl border border-border bg-card/60 px-4 py-3">
          <summary className="cursor-pointer text-base font-semibold text-muted-foreground">
            {t("helperType", lang)}
          </summary>
          <div className="mt-3 flex gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void sendTyped()}
              aria-label={t("helperType", lang)}
              className="flex-1 rounded-xl border-2 border-input bg-background px-4 py-3 text-lg outline-none focus:border-primary"
            />
            <Button size="lg" onClick={() => void sendTyped()} aria-label={t("send", lang)}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </details>
      </div>
    </ElderShell>
  );
}

function Bubble({ from, text }: { from: "user" | "bot"; text: string }) {
  return (
    <div className={cn("flex items-end gap-2", from === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-3xl px-5 py-3 text-xl leading-relaxed",
          from === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
        )}
      >
        {text}
      </div>
      {from === "bot" && <AudioIcon text={text} />}
    </div>
  );
}
