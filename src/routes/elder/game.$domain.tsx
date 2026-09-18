import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Game, type GameResult } from "@/components/rc/Game";
import { ElderShell } from "@/components/rc/ElderShell";
import { AudioIcon, Button } from "@/components/rc/ui";
import { DOMAIN_LABEL } from "@/lib/mockData";
import type { Domain, Level } from "@/lib/types";
import { addSession, getRecommendedLevel, saveRecommendation } from "@/lib/db";
import { recommendLevel } from "@/lib/adaptive";
import { useApp } from "@/store/app";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/elder/game/$domain")({
  component: GameScreen,
  head: () => ({
    meta: [
      { title: "Activity — RECONNECT" },
      { name: "description", content: "A calm activity that adapts quietly to the player's comfort level." },
      { property: "og:title", content: "Activity — RECONNECT" },
      { property: "og:description", content: "Memory, attention, pattern and routine activities with two gentle levels." },
    ],
  }),
});

function GameScreen() {
  const { domain } = useParams({ from: "/elder/game/$domain" }) as { domain: Domain };
  const navigate = useNavigate();
  const lang = useApp((s) => s.lang);
  const elderId = useApp((s) => s.elderId);
  const bump = useApp((s) => s.bump);

  const [level, setLevel] = useState<Level | null>(null);
  const [finished, setFinished] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!elderId) return;
    getRecommendedLevel(elderId, domain).then(setLevel).catch(() => setLevel(1));
  }, [elderId, domain, round]);

  const onFinish = async (r: GameResult) => {
    if (!elderId || !level) return;
    await addSession({ elderId, domain, level, accuracy: r.accuracy, durationSec: r.durationSec });
    const next = recommendLevel({ domain, level, accuracy: r.accuracy, durationSec: r.durationSec });
    await saveRecommendation(elderId, domain, next);
    bump();
    setFinished(true);
  };

  if (!level) return <ElderShell title={DOMAIN_LABEL[domain]}>{null}</ElderShell>;

  return (
    <ElderShell onBack={() => navigate({ to: "/elder/play" })}>
      {finished ? (
        <div className="mx-auto max-w-xl text-center">
          <div className="text-7xl">🌸</div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <p className="font-serif text-3xl font-semibold leading-snug">{t("wellDone", lang)}</p>
            <AudioIcon text={t("wellDone", lang)} />
          </div>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => {
                setFinished(false);
                setRound((r) => r + 1);
              }}
            >
              {t("playAgain", lang)}
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate({ to: "/elder" })}>
              {t("exit", lang)}
            </Button>
          </div>
        </div>
      ) : (
        <Game key={`${domain}-${level}-${round}`} domain={domain} level={level} onFinish={onFinish} />
      )}
    </ElderShell>
  );
}
