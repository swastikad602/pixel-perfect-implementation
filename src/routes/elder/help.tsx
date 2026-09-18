import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ElderShell } from "@/components/rc/ElderShell";
import { AudioIcon, Button, Card } from "@/components/rc/ui";
import { getDb } from "@/lib/db";
import { useApp } from "@/store/app";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/elder/help")({
  component: Help,
  head: () => ({
    meta: [
      { title: "Help — RECONNECT" },
      { name: "description", content: "One large button that tells the caregiver help is needed." },
      { property: "og:title", content: "Help — RECONNECT" },
      { property: "og:description", content: "A single calm way to ask a caregiver for help." },
    ],
  }),
});

function Help() {
  const navigate = useNavigate();
  const lang = useApp((s) => s.lang);
  const elderId = useApp((s) => s.elderId);
  const bump = useApp((s) => s.bump);
  const [sent, setSent] = useState(false);

  const askForHelp = async () => {
    if (elderId) {
      // Recorded as a help-flagged item so the caregiver dashboard shows it live.
      await getDb().reminders.add({
        elderId,
        title: "Asked for help from the Help screen",
        time: new Date().toTimeString().slice(0, 5),
        category: "Help",
        status: "help",
        respondedAt: Date.now(),
        windowSec: 90,
        createdAt: Date.now(),
      });
      bump();
    }
    setSent(true);
  };

  return (
    <ElderShell title={t("help", lang)} onBack={() => navigate({ to: "/elder" })}>
      <div className="mx-auto max-w-xl space-y-6 text-center">
        {sent ? (
          <Card className="space-y-4">
            <div className="text-6xl">🤝</div>
            <div className="flex items-center justify-center gap-3">
              <p className="font-serif text-2xl">{t("helpText", lang)}</p>
              <AudioIcon text={t("helpText", lang)} />
            </div>
          </Card>
        ) : (
          <>
            <Button size="xl" className="w-full" onClick={askForHelp}>
              {t("callCaregiver", lang)}
            </Button>
            <div className="flex justify-center">
              <AudioIcon text={t("callCaregiver", lang)} />
            </div>
          </>
        )}
      </div>
    </ElderShell>
  );
}
