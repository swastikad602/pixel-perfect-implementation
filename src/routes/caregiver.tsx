import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Music, Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Shell } from "@/components/rc/Shell";
import { Button, Card, CardTitle, Field, Modal, StatusBadge } from "@/components/rc/ui";
import { Chatbox } from "@/components/rc/Chatbox";
import {
  AddFavoriteModal,
  CompanionAlertsBanner,
  ElderCompanionPanel,
} from "@/components/rc/CompanionCaregiver";
import { getDb, today } from "@/lib/db";
import { useDexie } from "@/hooks/useDexie";
import { needsReview, orientationTrend } from "@/lib/adaptive";
import { DOMAIN_LABEL } from "@/lib/mockData";
import { useApp } from "@/store/app";
import type { ReminderStatus } from "@/lib/types";

export const Route = createFileRoute("/caregiver")({
  component: Caregiver,
  head: () => ({
    meta: [
      { title: "Caregiver dashboard — RECONNECT" },
      { name: "description", content: "Linked elders, today's activities, reminder status and family memory cards." },
      { property: "og:title", content: "Caregiver dashboard — RECONNECT" },
      { property: "og:description", content: "Track routines and engagement for the elders you support." },
    ],
  }),
});

type FormKind = "elder" | "reminder" | "card" | null;

interface FormState {
  name?: string;
  pin?: string;
  age?: string;
  state?: string;
  elderId?: string;
  title?: string;
  time?: string;
  category?: string;
  windowSec?: string;
  relationship?: string;
  emoji?: string;
  note?: string;
}

function Caregiver() {
  const bump = useApp((s) => s.bump);
  const simulateOffline = useApp((s) => s.simulateOffline);
  const setSimulateOffline = useApp((s) => s.setSimulateOffline);
  const [form, setForm] = useState<FormKind>(null);
  const [f, setF] = useState<FormState>({});
  const [favOpen, setFavOpen] = useState(false);

  const data = useDexie(async () => {
    const db = getDb();
    const elders = await db.elders.toArray();
    const sessions = await db.sessions.toArray();
    const reminders = await db.reminders.toArray();
    const cards = await db.memoryCards.toArray();
    return { elders, sessions, reminders, cards };
  });

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    const db = getDb();
    if (form === "elder" && f.name && f.pin) {
      await db.elders.add({
        id: `e${Date.now()}`,
        name: f.name,
        pin: f.pin,
        age: Number(f.age) || 70,
        state: f.state || "West Bengal",
        language: "en",
      });
    }
    if (form === "reminder" && f.elderId && f.title) {
      await db.reminders.add({
        elderId: f.elderId,
        title: f.title,
        time: f.time || "09:00",
        category: f.category || "Medicine",
        status: "pending",
        windowSec: Number(f.windowSec) || 90,
        createdAt: Date.now(),
      });
    }
    if (form === "card" && f.elderId && f.name) {
      await db.memoryCards.add({
        elderId: f.elderId,
        name: f.name,
        relationship: f.relationship || "Family",
        emoji: f.emoji || "🙂",
        note: f.note || "",
      });
    }
    setF({});
    setForm(null);
    bump();
  };

  const tone = (s: ReminderStatus) =>
    s === "done" ? "success" : s === "help" ? "info" : s === "missed" ? "warning" : "neutral";

  const elderOptions = (data?.elders ?? []).map((e) => `${e.id} — ${e.name}`).join(", ");

  return (
    <Shell role="caregiver" title="Caregiver dashboard" subtitle="Everything saves on this device, online or offline.">
      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={() => setForm("elder")}>
          <Plus className="h-4 w-4" /> Add elder
        </Button>
        <Button variant="soft" onClick={() => setForm("reminder")}>
          <Plus className="h-4 w-4" /> Add reminder
        </Button>
        <Button variant="soft" onClick={() => setForm("card")}>
          <Plus className="h-4 w-4" /> Add family memory card
        </Button>
        <Button variant="soft" onClick={() => setFavOpen(true)}>
          <Music className="h-4 w-4" /> Add favourite song or poem
        </Button>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={simulateOffline}
            onChange={(e) => setSimulateOffline(e.target.checked)}
          />
          Simulate offline (demo)
        </label>
      </div>

      <CompanionAlertsBanner elders={data?.elders ?? []} />
      <AddFavoriteModal open={favOpen} onClose={() => setFavOpen(false)} elders={data?.elders ?? []} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(data?.elders ?? []).map((elder) => {
            const sessions = (data?.sessions ?? []).filter((s) => s.elderId === elder.id);
            const last = sessions.sort((a, b) => b.ts - a.ts)[0];
            const todays = sessions.filter((s) => s.date === today());
            const flag = needsReview(sessions);
            const rems = (data?.reminders ?? []).filter((r) => r.elderId === elder.id);
            const cards = (data?.cards ?? []).filter((c) => c.elderId === elder.id);
            return (
              <Card key={elder.id} className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-xl">{elder.name}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {elder.age} · {elder.state} · PIN {elder.pin}
                  </span>
                  {flag && <StatusBadge tone="warning">Needs review</StatusBadge>}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Last activity" value={last ? new Date(last.ts).toLocaleDateString() : "—"} />
                  <Stat label="Completed today" value={String(todays.length)} />
                  <Stat label="Family cards" value={String(cards.length)} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-muted-foreground">Orientation check-in</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Stat
                      label="Last 7 days"
                      value={orientationTrend(sessions, 7) === null ? "—" : `${orientationTrend(sessions, 7)}%`}
                    />
                    <Stat
                      label="Last 30 days"
                      value={orientationTrend(sessions, 30) === null ? "—" : `${orientationTrend(sessions, 30)}%`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Activity performance trend — not a clinical diagnosis.
                  </p>
                </div>
                <ElderCompanionPanel elderId={elder.id} />
                <div>
                  <p className="mb-2 text-sm font-semibold text-muted-foreground">Reminders</p>
                  <div className="space-y-2">
                    {rems.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2">
                        <span className="font-semibold">{r.time}</span>
                        <span>{r.title}</span>
                        <span className="text-xs text-muted-foreground">{r.category}</span>
                        <span className="ml-auto">
                          <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge>
                        </span>
                      </div>
                    ))}
                    {rems.length === 0 && <p className="text-sm text-muted-foreground">No reminders yet.</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recent activity by area:{" "}
                  {Object.entries(
                    sessions.slice(-8).reduce<Record<string, number>>((acc, s) => {
                      acc[DOMAIN_LABEL[s.domain]] = (acc[DOMAIN_LABEL[s.domain]] ?? 0) + 1;
                      return acc;
                    }, {}),
                  )
                    .map(([k, v]) => `${k} ×${v}`)
                    .join(" · ") || "—"}
                </p>
              </Card>
            );
          })}
        </div>
        <Chatbox thread="caregiver" />
      </div>

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form === "elder" ? "Add elder" : form === "reminder" ? "Add reminder" : "Add family memory card"}
      >
        <div className="space-y-3">
          {form === "elder" && (
            <>
              <Field label="Name" value={f.name ?? ""} onChange={set("name")} />
              <Field label="4-digit PIN" maxLength={4} value={f.pin ?? ""} onChange={set("pin")} />
              <Field label="Age" value={f.age ?? ""} onChange={set("age")} />
              <Field label="State" value={f.state ?? ""} onChange={set("state")} />
            </>
          )}
          {form === "reminder" && (
            <>
              <Field label={`Elder id (${elderOptions})`} value={f.elderId ?? ""} onChange={set("elderId")} />
              <Field label="Title" value={f.title ?? ""} onChange={set("title")} />
              <Field label="Time" type="time" value={f.time ?? ""} onChange={set("time")} />
              <Field label="Category" value={f.category ?? ""} onChange={set("category")} />
              <Field label="Response window (seconds)" value={f.windowSec ?? "90"} onChange={set("windowSec")} />
            </>
          )}
          {form === "card" && (
            <>
              <Field label={`Elder id (${elderOptions})`} value={f.elderId ?? ""} onChange={set("elderId")} />
              <Field label="Name" value={f.name ?? ""} onChange={set("name")} />
              <Field label="Relationship" value={f.relationship ?? ""} onChange={set("relationship")} />
              <Field label="Emoji / photo stand-in" value={f.emoji ?? ""} onChange={set("emoji")} />
              <Field label="Note" value={f.note ?? ""} onChange={set("note")} />
            </>
          )}
          <Button className="w-full" onClick={save}>
            Save
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-4 py-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="font-serif text-xl font-bold">{value}</p>
    </div>
  );
}
