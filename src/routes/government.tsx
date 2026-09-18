import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ShieldCheck } from "lucide-react";
import { Shell } from "@/components/rc/Shell";
import { Card, CardTitle } from "@/components/rc/ui";
import { getDb } from "@/lib/db";
import { useDexie } from "@/hooks/useDexie";
import { LANGUAGE_USAGE, STATE_PARTICIPATION } from "@/lib/mockData";

export const Route = createFileRoute("/government")({
  component: Government,
  head: () => ({
    meta: [
      { title: "Public health overview — RECONNECT" },
      { name: "description", content: "Aggregated, de-identified participation across states and languages." },
      { property: "og:title", content: "Public health overview — RECONNECT" },
      { property: "og:description", content: "Aggregate-only programme metrics. No personal data is shown." },
    ],
  }),
});

function Government() {
  // Aggregate only — this view never reads or displays individual records.
  const local = useDexie(async () => {
    const db = getDb();
    const sessions = await db.sessions.count();
    const reminders = await db.reminders.toArray();
    const acked = reminders.filter((r) => r.status === "done").length;
    return {
      sessions,
      ackRate: reminders.length ? Math.round((acked / reminders.length) * 100) : 0,
    };
  });

  const totalUsers = STATE_PARTICIPATION.reduce((s, x) => s + x.users, 0);
  const totalSessions = STATE_PARTICIPATION.reduce((s, x) => s + x.sessions, 0) + (local?.sessions ?? 0);

  return (
    <Shell
      role="government"
      title="Public health overview"
      subtitle="Programme participation across the memory-care initiative."
      showDisclaimer={false}
      banner={
        <div className="flex items-center justify-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <ShieldCheck className="h-4 w-4" /> Aggregated, de-identified data — no individual records are shown
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Active users" value={totalUsers.toLocaleString()} />
        <Kpi label="Completed sessions" value={totalSessions.toLocaleString()} />
        <Kpi label="States participating" value={String(STATE_PARTICIPATION.length)} />
        <Kpi label="Reminder acknowledgement" value={`${local?.ackRate ?? 0}%`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Participation by state</CardTitle>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STATE_PARTICIPATION}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="state" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip />
                <Bar dataKey="users" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>Language usage</CardTitle>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={LANGUAGE_USAGE} dataKey="value" nameKey="language" outerRadius={100} label>
                  {LANGUAGE_USAGE.map((_, i) => (
                    <Cell key={i} fill={`var(--chart-${i + 1})`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Figures are illustrative programme aggregates. RECONNECT supports engagement and routines; it is not a
        diagnostic or treatment system.
      </p>
    </Shell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl font-bold text-primary">{value}</p>
    </Card>
  );
}
