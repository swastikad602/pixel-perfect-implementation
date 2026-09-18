import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Shell } from "@/components/rc/Shell";
import { Button, Card, CardTitle, StatusBadge } from "@/components/rc/ui";
import { Chatbox } from "@/components/rc/Chatbox";
import { getDb } from "@/lib/db";
import { useDexie } from "@/hooks/useDexie";
import { DOMAINS, DOMAIN_LABEL } from "@/lib/mockData";
import { averageAccuracy, needsReview } from "@/lib/adaptive";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/doctor")({
  component: Doctor,
  head: () => ({
    meta: [
      { title: "Clinician view — RECONNECT" },
      { name: "description", content: "Weekly and monthly activity performance trends per cognitive area, with notes." },
      { property: "og:title", content: "Clinician view — RECONNECT" },
      { property: "og:description", content: "Activity performance trends — not a clinical diagnosis." },
    ],
  }),
});

const DISCLAIMER = "Activity performance trend — not a clinical diagnosis.";

function Doctor() {
  const bump = useApp((s) => s.bump);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const data = useDexie(async () => {
    const db = getDb();
    return {
      elders: await db.elders.toArray(),
      sessions: await db.sessions.toArray(),
      notes: await db.notes.toArray(),
    };
  });

  const elders = data?.elders ?? [];
  const activeId = selected ?? elders[0]?.id ?? null;
  const sessions = (data?.sessions ?? []).filter((s) => s.elderId === activeId);

  // Weekly averages per domain, last 4 weeks.
  const weekly = [3, 2, 1, 0].map((w) => {
    const from = Date.now() - (w + 1) * 7 * 864e5;
    const to = Date.now() - w * 7 * 864e5;
    const row: Record<string, string | number> = { period: w === 0 ? "This week" : `${w + 1}w ago` };
    DOMAINS.forEach((d) => {
      const xs = sessions.filter((s) => s.domain === d && s.ts >= from && s.ts < to);
      row[DOMAIN_LABEL[d]] = Math.round(averageAccuracy(xs) * 100);
    });
    return row;
  });

  const monthly = DOMAINS.map((d) => ({
    domain: DOMAIN_LABEL[d],
    sessions: sessions.filter((s) => s.domain === d).length,
    average: Math.round(averageAccuracy(sessions.filter((s) => s.domain === d)) * 100),
  }));

  const saveNote = async () => {
    if (!activeId || !note.trim()) return;
    await getDb().notes.add({ elderId: activeId, text: note.trim(), ts: Date.now() });
    setNote("");
    bump();
  };

  return (
    <Shell
      role="doctor"
      title="Clinician view"
      subtitle={DISCLAIMER}
      showDisclaimer={false}
    >
      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="space-y-2 lg:col-span-1">
          <CardTitle>Patients</CardTitle>
          {elders.map((e) => {
            const own = (data?.sessions ?? []).filter((s) => s.elderId === e.id);
            return (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left ${
                  activeId === e.id ? "bg-primary/10 font-semibold text-primary" : "hover:bg-secondary/60"
                }`}
              >
                {e.name}
                {needsReview(own) && <StatusBadge tone="warning">review</StatusBadge>}
              </button>
            );
          })}
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardTitle>Weekly trend by area (% accuracy)</CardTitle>
            <p className="mb-4 text-xs text-muted-foreground">{DISCLAIMER}</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" stroke="var(--muted-foreground)" />
                  <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Legend />
                  {DOMAINS.map((d, i) => (
                    <Line
                      key={d}
                      type="monotone"
                      dataKey={DOMAIN_LABEL[d]}
                      stroke={`var(--chart-${i + 1})`}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardTitle>Monthly volume and average by area</CardTitle>
            <p className="mb-4 text-xs text-muted-foreground">{DISCLAIMER}</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="domain" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sessions" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="average" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3">
              <CardTitle>Clinical notes</CardTitle>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Observations about engagement and routine…"
                className="w-full rounded-xl border-2 border-input bg-background px-4 py-2.5 outline-none focus:border-primary"
              />
              <Button onClick={saveNote}>Save note</Button>
              <div className="space-y-2">
                {(data?.notes ?? [])
                  .filter((n) => n.elderId === activeId)
                  .sort((a, b) => b.ts - a.ts)
                  .map((n) => (
                    <div key={n.id} className="rounded-xl bg-secondary/50 px-3 py-2 text-sm">
                      <p>{n.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(n.ts).toLocaleString()}</p>
                    </div>
                  ))}
              </div>
            </Card>
            <Chatbox thread="doctor" />
          </div>
        </div>
      </div>
    </Shell>
  );
}
