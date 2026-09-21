import { useEffect, useMemo, useRef, useState } from "react";
import { AudioIcon, Button, Card } from "./ui";
import { useApp } from "@/store/app";
import { DAY_NAMES, MONTH_NAMES, localizeNumber, t, tf } from "@/lib/i18n";
import { addOrientationEntry, today } from "@/lib/db";

const storageKey = (elderId: string) => `rc:orientation:${elderId}`;

/**
 * Daily orientation check-in. Never a test: every tap gets the same warm reveal,
 * no correct/incorrect feedback, and nothing feeds the elder-facing level messaging.
 */
export function Orientation({ elderId }: { elderId: string }) {
  const lang = useApp((s) => s.lang);
  const bump = useApp((s) => s.bump);
  const [show, setShow] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const shownAt = useRef(0);
  const logged = useRef(false);

  const now = useMemo(() => new Date(), []);
  const realDay = now.getDay();
  const options = useMemo(() => {
    // Real day plus two plausible neighbours, in a randomised order.
    const picks = [realDay, (realDay + 6) % 7, (realDay + 1) % 7];
    return picks
      .map((d) => ({ d, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.d);
  }, [realDay]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey(elderId)) === today()) return;
    shownAt.current = Date.now();
    setShow(true);
  }, [elderId]);

  const log = async (correct: boolean) => {
    if (logged.current) return;
    logged.current = true;
    window.localStorage.setItem(storageKey(elderId), today());
    await addOrientationEntry({ elderId, correct, responseMs: Date.now() - shownAt.current });
    bump();
  };

  // No tap within 15 seconds: reveal the same warm message, never a "time's up".
  useEffect(() => {
    if (!show || revealed) return;
    const id = setTimeout(() => {
      setRevealed(true);
      void log(false);
    }, 15000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, revealed]);

  if (!show) return null;

  const dateText = `${localizeNumber(now.getDate(), lang)} ${MONTH_NAMES[lang][now.getMonth()]}`;
  const reveal = tf("orientationReveal", lang, { day: DAY_NAMES[lang][realDay]!, date: dateText });
  const question = t("orientationQuestion", lang);

  return (
    <Card className="mb-6 border-2 border-primary/25 bg-secondary/40">
      {revealed ? (
        <div className="flex items-center justify-center gap-3">
          <p className="text-center font-serif text-2xl font-semibold">{reveal}</p>
          <AudioIcon text={reveal} />
        </div>
      ) : (
        <>
          <div className="mb-5 flex items-center justify-center gap-3">
            <p className="text-center font-serif text-2xl font-semibold">{question}</p>
            <AudioIcon text={question} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {options.map((d) => (
              <Button
                key={d}
                variant="elder"
                size="lg"
                onClick={() => {
                  setRevealed(true);
                  void log(d === realDay);
                }}
              >
                {DAY_NAMES[lang][d]}
              </Button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
