import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ElderShell } from "@/components/rc/ElderShell";
import { AudioIcon, Button, Card, StatusBadge } from "@/components/rc/ui";
import { getDb } from "@/lib/db";
import { useDexie } from "@/hooks/useDexie";
import { useApp } from "@/store/app";
import { t } from "@/lib/i18n";
import type { ReminderStatus } from "@/lib/types";

export const Route = createFileRoute("/elder/routine")({
  component: Routine,
  head: () => ({
    meta: [
      { title: "My Routine — RECONNECT" },
      { name: "description", content: "Today's reminders with Done, Remind me later and I need help." },
      { property: "og:title", content: "My Routine — RECONNECT" },
      { property: "og:description", content: "A simple daily timeline of reminders, saved on the device." },
    ],
  }),
});

function Routine() {
  const navigate = useNavigate();
  const lang = useApp((s) => s.lang);
  const elderId = useApp((s) => s.elderId);
  const bump = useApp((s) => s.bump);
  const [now, setNow] = useState(Date.now());

  const reminders = useDexie(
    async () =>
      elderId
        ? (await getDb().reminders.where("elderId").equals(elderId).toArray()).sort((a, b) =>
            a.time.localeCompare(b.time),
          )
        : [],
    [elderId],
  );

  // Response window: a pending reminder that gets no answer within windowSec is marked missed.
  useEffect(() => {
    const id = setInterval(async () => {
      setNow(Date.now());
      const list = reminders ?? [];
      const overdue = list.filter(
        (r) => r.status === "pending" && Date.now() - r.createdAt > r.windowSec * 1000,
      );
      if (overdue.length) {
        await Promise.all(overdue.map((r) => getDb().reminders.update(r.id!, { status: "missed" })));
        bump();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [reminders, bump]);

  const respond = async (id: number, status: ReminderStatus) => {
    const patch: Record<string, unknown> = { status, respondedAt: Date.now() };
    if (status === "snoozed") {
      patch.status = "pending";
      patch.createdAt = Date.now(); // restart the response window
    }
    await getDb().reminders.update(id, patch);
    bump();
  };

  const tone = (s: ReminderStatus) =>
    s === "done" ? "success" : s === "help" ? "info" : s === "missed" ? "warning" : "neutral";

  return (
    <ElderShell title={t("myRoutine", lang)} onBack={() => navigate({ to: "/elder" })}>
      <div className="space-y-5">
        {(reminders ?? []).map((r) => {
          const left = Math.max(0, r.windowSec - Math.floor((now - r.createdAt) / 1000));
          return (
            <Card key={r.id} className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-xl bg-secondary px-3 py-1.5 font-bold">{r.time}</span>
                <p className="font-serif text-2xl font-semibold">{r.title}</p>
                <AudioIcon text={r.title} />
                <div className="ml-auto flex items-center gap-2">
                  {r.status === "pending" && left > 0 && (
                    <span className="text-sm text-muted-foreground">{left}s</span>
                  )}
                  <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge>
                </div>
              </div>
              {r.status !== "done" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button size="lg" onClick={() => respond(r.id!, "done")}>
                    {t("done", lang)}
                  </Button>
                  <Button variant="soft" size="lg" onClick={() => respond(r.id!, "snoozed")}>
                    {t("remindLater", lang)}
                  </Button>
                  <Button variant="accent" size="lg" onClick={() => respond(r.id!, "help")}>
                    {t("needHelp", lang)}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
        {reminders && reminders.length === 0 && (
          <p className="text-lg text-muted-foreground">Nothing scheduled today.</p>
        )}
      </div>
    </ElderShell>
  );
}
