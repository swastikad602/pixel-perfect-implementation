import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { Domain, GameMode, Lang, Level } from "@/lib/types";
import {
  ATTENTION_ITEMS,
  MEMORY_ITEMS,
  PATTERN_SEQUENCES,
  RECALL_DISTRACTORS,
  RECALL_ITEMS,
  ROUTINE_STEPS,
  SPOT_ITEMS,
} from "@/lib/mockData";
import { AudioIcon, Button, ProgressBar } from "./ui";
import { useApp } from "@/store/app";
import { t, tf, localizeNumber } from "@/lib/i18n";

function shuffle<T>(arr: T[], seed = Math.random()): T[] {
  const a = [...arr];
  let s = seed * 10000;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

export type GameResult = {
  accuracy: number;
  durationSec: number;
  responseMs?: number;
  correctCount?: number;
  incorrectCount?: number;
  /** Optional warm, game-specific closing line shown instead of the default. */
  message?: string;
};

type Finish = (r: GameResult) => void;

/**
 * One reusable game component powering every domain and game mode.
 * No red / failure styling anywhere: wrong taps simply do not advance.
 */
export function Game({
  domain,
  mode,
  level,
  onFinish,
}: {
  domain: Domain;
  mode: GameMode;
  level: Level;
  onFinish: Finish;
}) {
  const lang = useApp((s) => s.lang);
  const started = useRef(Date.now());
  const finish: Finish = (r) =>
    onFinish({
      ...r,
      accuracy: Math.max(0, Math.min(1, r.accuracy)),
      durationSec: r.durationSec || Math.round((Date.now() - started.current) / 1000),
    });

  const simple = (accuracy: number) => finish({ accuracy, durationSec: 0 });

  if (mode === "recall_tap") return <RecallGame level={level} finish={finish} lang={lang} />;
  if (mode === "quick_spot") return <QuickSpotGame level={level} finish={finish} lang={lang} />;
  if (domain === "memory") return <MemoryGame level={level} finish={simple} lang={lang} />;
  if (domain === "attention") return <AttentionGame level={level} finish={simple} lang={lang} />;
  if (domain === "pattern") return <PatternGame level={level} finish={simple} lang={lang} />;
  return <ExecutiveGame level={level} finish={simple} lang={lang} />;
}

function Instruction({ text }: { text: string }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-3">
      <h2 className="text-center font-serif text-3xl font-semibold">{text}</h2>
      <AudioIcon text={text} />
    </div>
  );
}

/* -------- Memory / matching: picture matching -------- */
function MemoryGame({ level, finish, lang }: { level: Level; finish: (a: number) => void; lang: Lang }) {
  const pairs = level === 1 ? 2 : 3;
  const cards = useMemo(() => {
    const picks = MEMORY_ITEMS.slice(0, pairs);
    return shuffle([...picks, ...picks]);
  }, [pairs]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);

  const tap = (i: number) => {
    if (open.includes(i) || matched.includes(i) || open.length === 2) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setAttempts((a) => a + 1);
      const hit = cards[next[0]!] === cards[next[1]!];
      setTimeout(() => {
        if (hit) {
          const done = [...matched, ...next];
          setMatched(done);
          if (done.length === pairs * 2) finish(pairs / (attempts + 1));
        }
        setOpen([]);
      }, 700);
    }
  };

  return (
    <div>
      <Instruction text={t("memoryInstruction", lang)} />
      <div className={`mx-auto grid max-w-xl gap-4 ${pairs === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {cards.map((c, i) => {
          const shown = open.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              onClick={() => tap(i)}
              className={`flex h-32 items-center justify-center rounded-2xl border-4 text-6xl transition-all duration-300 ${
                matched.includes(i)
                  ? "border-success bg-success/10"
                  : shown
                    ? "border-primary bg-card"
                    : "border-primary/20 bg-secondary"
              }`}
            >
              {shown ? c : ""}
            </button>
          );
        })}
      </div>
      <ProgressBar className="mx-auto mt-8 max-w-xl" value={matched.length / (pairs * 2)} />
    </div>
  );
}

/* -------- Memory / recall_tap: "What Did You See?" -------- */
function RecallGame({ level, finish, lang }: { level: Level; finish: Finish; lang: Lang }) {
  const showMs = level === 1 ? 10000 : 6000;
  const distractorCount = level === 1 ? 3 : 5;

  const { targets, grid } = useMemo(() => {
    const picks = shuffle(RECALL_ITEMS, 0.31).slice(0, 5);
    // Level 2 keeps two visually similar distractors (a cup-like and a book-like item).
    const pool = level === 2 ? RECALL_DISTRACTORS : RECALL_DISTRACTORS.slice(0, 4);
    const distract = shuffle(pool, 0.77).slice(0, distractorCount);
    return { targets: picks, grid: shuffle([...picks, ...distract], 0.53) };
  }, [level, distractorCount]);

  const [phase, setPhase] = useState<"show" | "pick">("show");
  const [selected, setSelected] = useState<string[]>([]);
  const [left, setLeft] = useState(Math.round(showMs / 1000));
  const pickStart = useRef(0);

  useEffect(() => {
    const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const done = setTimeout(() => {
      pickStart.current = Date.now();
      setPhase("pick");
    }, showMs);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [showMs]);

  const toggle = (item: string) =>
    setSelected((p) => (p.includes(item) ? p.filter((x) => x !== item) : [...p, item]));

  const submit = () => {
    const correct = selected.filter((s) => targets.includes(s)).length;
    const incorrect = selected.length - correct;
    finish({
      accuracy: correct / 5,
      durationSec: Math.round((Date.now() - pickStart.current) / 1000),
      correctCount: correct,
      incorrectCount: incorrect,
      message: tf("recallResult", lang, { n: localizeNumber(correct, lang) }),
    });
  };

  if (phase === "show") {
    return (
      <div>
        <Instruction text={t("recallWatch", lang)} />
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-4">
          {targets.map((item, i) => (
            <div
              key={i}
              className="flex h-32 items-center justify-center rounded-2xl border-4 border-primary/25 bg-card text-6xl"
            >
              {item}
            </div>
          ))}
        </div>
        <ProgressBar className="mx-auto mt-8 max-w-xl" value={1 - left / (showMs / 1000)} />
      </div>
    );
  }

  return (
    <div>
      <Instruction text={t("recallPick", lang)} />
      <div className="mx-auto grid max-w-xl grid-cols-3 gap-4 sm:grid-cols-4">
        {grid.map((item, i) => {
          const on = selected.includes(item);
          return (
            <button
              key={i}
              onClick={() => toggle(item)}
              className={`flex h-28 items-center justify-center rounded-2xl border-4 text-5xl transition-all ${
                on ? "border-primary bg-primary/10" : "border-primary/20 bg-card hover:border-primary"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex justify-center">
        <Button size="lg" onClick={submit}>
          {t("done", lang)}
        </Button>
      </div>
    </div>
  );
}

/* -------- Attention / find_object: find the object -------- */
function AttentionGame({ level, finish, lang }: { level: Level; finish: (a: number) => void; lang: Lang }) {
  const total = 4;
  const size = level === 1 ? 4 : 6;
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);

  const board = useMemo(() => {
    const items = shuffle(ATTENTION_ITEMS, round + 1).slice(0, size);
    // Level 2 adds visually busy distractors around the grid.
    return { items, target: items[round % items.length]! };
  }, [round, size]);

  const tap = (item: string) => {
    const hit = item === board.target;
    if (!hit) return; // no failure state: nothing happens on a wrong tap
    const nextCorrect = correct + 1;
    setCorrect(nextCorrect);
    if (round + 1 >= total) finish(nextCorrect / total);
    else setRound(round + 1);
  };

  return (
    <div>
      <Instruction text={`${t("attentionInstruction", lang)}  ${board.target}`} />
      <div className={`mx-auto grid max-w-xl gap-4 ${size === 4 ? "grid-cols-2" : "grid-cols-3"}`}>
        {board.items.map((it, i) => (
          <button
            key={i}
            onClick={() => tap(it)}
            className={`flex h-32 items-center justify-center rounded-2xl border-4 border-primary/20 bg-card text-6xl transition-all hover:border-primary ${
              level === 2 ? "odd:bg-secondary/70" : ""
            }`}
          >
            {it}
          </button>
        ))}
      </div>
      <ProgressBar className="mx-auto mt-8 max-w-xl" value={round / total} />
    </div>
  );
}

/* -------- Attention / quick_spot: self-paced reaction -------- */
function QuickSpotGame({ level, finish, lang }: { level: Level; finish: Finish; lang: Lang }) {
  const total = 3;
  const showMs = level === 1 ? 1500 : 800;
  const [round, setRound] = useState(0);
  const [visible, setVisible] = useState(false);
  const [canTap, setCanTap] = useState(false);
  const appearedAt = useRef(0);
  const times = useRef<number[]>([]);
  const item = SPOT_ITEMS[round % SPOT_ITEMS.length]!;

  useEffect(() => {
    setVisible(false);
    setCanTap(false);
    const show = setTimeout(() => {
      appearedAt.current = Date.now();
      setVisible(true);
      setCanTap(true);
    }, 900);
    const hide = setTimeout(() => setVisible(false), 900 + showMs);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [round, showMs]);

  // No time limit, no penalty: the response time is only logged in the background.
  const tap = () => {
    if (!canTap) return;
    setCanTap(false);
    times.current.push(Date.now() - appearedAt.current);
    if (round + 1 >= total) {
      const avg = times.current.reduce((s, x) => s + x, 0) / times.current.length;
      finish({
        accuracy: 1,
        durationSec: Math.round((times.current.reduce((s, x) => s + x, 0) + total * 900) / 1000),
        responseMs: Math.round(avg),
        correctCount: times.current.length,
        message: t("spotResult", lang),
      });
    } else {
      setRound(round + 1);
    }
  };

  return (
    <div>
      <Instruction text={t("spotWatch", lang)} />
      <div className="mx-auto flex h-56 max-w-xl items-center justify-center rounded-3xl border-4 border-primary/20 bg-card">
        <span className={`text-8xl transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}>
          {item}
        </span>
      </div>
      <div className="mt-8 flex justify-center">
        <Button size="xl" onClick={tap} disabled={!canTap} className="w-full max-w-xl">
          {t("sawIt", lang)}
        </Button>
      </div>
      <ProgressBar className="mx-auto mt-8 max-w-xl" value={round / total} />
    </div>
  );
}

/* -------- Pattern / sequence: complete the sequence -------- */
function PatternGame({ level, finish, lang }: { level: Level; finish: (a: number) => void; lang: Lang }) {
  const total = PATTERN_SEQUENCES.length;
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [tries, setTries] = useState(0);
  const item = PATTERN_SEQUENCES[round]!;
  const options = useMemo(
    () => shuffle([item.answer, ...item.distractors.slice(0, level === 1 ? 1 : 3)], round + 2),
    [item, level, round],
  );

  const tap = (o: string) => {
    setTries((x) => x + 1);
    if (o !== item.answer) return;
    const nextCorrect = correct + 1;
    setCorrect(nextCorrect);
    if (round + 1 >= total) finish(nextCorrect / (tries + 1));
    else setRound(round + 1);
  };

  return (
    <div>
      <Instruction text={t("patternInstruction", lang)} />
      <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-6xl">
        {item.seq.map((s, i) => (
          <span key={i}>{s}</span>
        ))}
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-dashed border-primary/40 text-3xl">
          ?
        </span>
      </div>
      <div className="mx-auto grid max-w-xl grid-cols-2 gap-4">
        {options.map((o, i) => (
          <button
            key={i}
            onClick={() => tap(o)}
            className="flex h-28 items-center justify-center rounded-2xl border-4 border-primary/20 bg-card text-5xl transition-all hover:border-primary"
          >
            {o}
          </button>
        ))}
      </div>
      <ProgressBar className="mx-auto mt-8 max-w-xl" value={round / total} />
    </div>
  );
}

/* -------- Executive / arrange: arrange the routine -------- */
function ExecutiveGame({ level, finish, lang }: { level: Level; finish: (a: number) => void; lang: Lang }) {
  const count = level === 1 ? 3 : 5;
  const correctOrder = useMemo(() => ROUTINE_STEPS[0]!.slice(0, count), [count]);
  const shuffled = useMemo(() => shuffle(correctOrder, 0.42), [correctOrder]);
  const [picked, setPicked] = useState<string[]>([]);

  const pick = (step: string) => {
    if (picked.includes(step)) return;
    const next = [...picked, step];
    setPicked(next);
    if (next.length === count) {
      const hits = next.filter((s, i) => s === correctOrder[i]).length;
      setTimeout(() => finish(hits / count), 600);
    }
  };

  return (
    <div>
      <Instruction text={t("executiveInstruction", lang)} />
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        {shuffled.map((step) => {
          const idx = picked.indexOf(step);
          return (
            <button
              key={step}
              onClick={() => pick(step)}
              className={`flex min-h-20 items-center gap-4 rounded-2xl border-4 px-5 text-left text-2xl font-semibold transition-all ${
                idx >= 0 ? "border-success bg-success/10" : "border-primary/20 bg-card hover:border-primary"
              }`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {idx >= 0 ? idx + 1 : ""}
              </span>
              {step}
              {idx >= 0 && <Check className="ml-auto h-6 w-6 text-success" />}
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex justify-center">
        <Button variant="soft" size="lg" onClick={() => setPicked([])}>
          Start over
        </Button>
      </div>
    </div>
  );
}
