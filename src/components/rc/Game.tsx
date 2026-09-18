import { useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { Domain, Level } from "@/lib/types";
import {
  ATTENTION_ITEMS,
  MEMORY_ITEMS,
  PATTERN_SEQUENCES,
  ROUTINE_STEPS,
} from "@/lib/mockData";
import { AudioIcon, Button, ProgressBar } from "./ui";
import { useApp } from "@/store/app";
import { t } from "@/lib/i18n";

function shuffle<T>(arr: T[], seed = Math.random()): T[] {
  const a = [...arr];
  let s = seed * 10000;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type GameResult = { accuracy: number; durationSec: number };

/**
 * One reusable game component powering all four domains.
 * No red / failure styling anywhere: wrong taps simply do not advance.
 */
export function Game({
  domain,
  level,
  onFinish,
}: {
  domain: Domain;
  level: Level;
  onFinish: (r: GameResult) => void;
}) {
  const lang = useApp((s) => s.lang);
  const started = useRef(Date.now());
  const finish = (accuracy: number) =>
    onFinish({
      accuracy: Math.max(0, Math.min(1, accuracy)),
      durationSec: Math.round((Date.now() - started.current) / 1000),
    });

  if (domain === "memory") return <MemoryGame level={level} finish={finish} lang={lang} />;
  if (domain === "attention") return <AttentionGame level={level} finish={finish} lang={lang} />;
  if (domain === "pattern") return <PatternGame level={level} finish={finish} lang={lang} />;
  return <ExecutiveGame level={level} finish={finish} lang={lang} />;
}

function Instruction({ text }: { text: string }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-3">
      <h2 className="text-center font-serif text-3xl font-semibold">{text}</h2>
      <AudioIcon text={text} />
    </div>
  );
}

/* -------- Memory: picture matching -------- */
function MemoryGame({ level, finish, lang }: { level: Level; finish: (a: number) => void; lang: "en" | "bn" }) {
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
      const hit = cards[next[0]] === cards[next[1]];
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

/* -------- Attention: find the object -------- */
function AttentionGame({ level, finish, lang }: { level: Level; finish: (a: number) => void; lang: "en" | "bn" }) {
  const total = 4;
  const size = level === 1 ? 4 : 6;
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);

  const board = useMemo(() => {
    const items = shuffle(ATTENTION_ITEMS, round + 1).slice(0, size);
    // Level 2 adds visually busy distractors around the grid.
    return { items, target: items[round % items.length] };
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

/* -------- Pattern: complete the sequence -------- */
function PatternGame({ level, finish, lang }: { level: Level; finish: (a: number) => void; lang: "en" | "bn" }) {
  const total = PATTERN_SEQUENCES.length;
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [tries, setTries] = useState(0);
  const item = PATTERN_SEQUENCES[round];
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

/* -------- Executive function: arrange the routine -------- */
function ExecutiveGame({ level, finish, lang }: { level: Level; finish: (a: number) => void; lang: "en" | "bn" }) {
  const count = level === 1 ? 3 : 5;
  const correctOrder = useMemo(() => ROUTINE_STEPS[0].slice(0, count), [count]);
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
