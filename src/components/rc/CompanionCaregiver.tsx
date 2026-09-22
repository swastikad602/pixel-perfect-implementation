import { useRef, useState } from "react";
import { AlertTriangle, BellRing, Music, Play, Square, Trash2 } from "lucide-react";
import { Button, Field, Modal, StatusBadge } from "./ui";
import { getDb, setCompanionConsent } from "@/lib/db";
import { useLiveDexie } from "@/hooks/useDexie";
import { useApp } from "@/store/app";
import type { Elder, Favorite } from "@/lib/types";

const fmt = (ts: number) =>
  new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Real-time, high-visibility Companion alerts (updates live, even from another tab). */
export function CompanionAlertsBanner({ elders }: { elders: Elder[] }) {
  const alerts = useLiveDexie(async () =>
    (await getDb().alerts.where("acknowledged").equals(0).toArray()).sort((a, b) => b.ts - a.ts),
  );
  if (!alerts || alerts.length === 0) return null;
  const nameOf = (id: string) => elders.find((e) => e.id === id)?.name ?? id;

  const ack = async (id: number) => {
    await getDb().alerts.update(id, { acknowledged: 1, acknowledgedAt: Date.now() });
  };

  return (
    <div className="mb-6 space-y-3" role="alert" aria-live="assertive">
      {alerts.map((a) =>
        a.level === "urgent" ? (
          <div
            key={a.id}
            className="rounded-2xl border-4 border-destructive bg-destructive/10 p-5 shadow-lg"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-destructive" />
              </span>
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <p className="font-serif text-xl font-bold text-destructive">
                Urgent: {nameOf(a.elderId)} may be in distress
              </p>
              <span className="text-sm text-muted-foreground">{fmt(a.ts)}</span>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="font-semibold">They said:</span> “{a.transcript}”
              </p>
              <p>
                <span className="font-semibold">Companion replied:</span> “{a.reply}”
              </p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {a.reason}. Raised from the Talk to a Friend screen. Please check in with them in person or by phone —
              RECONNECT does not contact emergency services.
            </p>
            <Button className="mt-3" variant="primary" onClick={() => ack(a.id!)}>
              I'm on it — mark as seen
            </Button>
          </div>
        ) : (
          <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-primary bg-primary/10 p-4">
            <BellRing className="h-5 w-5 text-primary" />
            <p className="font-semibold">{nameOf(a.elderId)} would like to hear from you</p>
            <span className="text-sm text-muted-foreground">{fmt(a.ts)}</span>
            <p className="w-full text-sm">They said: “{a.transcript}”</p>
            <Button size="sm" variant="soft" onClick={() => ack(a.id!)}>
              Mark as seen
            </Button>
          </div>
        ),
      )}
    </div>
  );
}

/** Per-elder Companion section: consent, favourites, recent flagged moments. */
export function ElderCompanionPanel({ elderId }: { elderId: string }) {
  const bump = useApp((s) => s.bump);
  const data = useLiveDexie(
    async () => {
      const db = getDb();
      return {
        consent: await db.consents.get(elderId),
        favorites: await db.favorites.where("elderId").equals(elderId).sortBy("createdAt"),
        flagged: await db.alerts.where("elderId").equals(elderId).count(),
      };
    },
    [elderId],
  );
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const preview = (f: Favorite) => {
    audio.current?.pause();
    if (playingId === f.id) return setPlayingId(null);
    const url = URL.createObjectURL(f.audio);
    const el = new Audio(url);
    el.onended = () => setPlayingId(null);
    audio.current = el;
    setPlayingId(f.id!);
    void el.play();
  };

  const consent = data?.consent;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-muted-foreground">Talk to a Friend (Companion)</p>
      <div className="space-y-2 rounded-xl bg-secondary/50 px-3 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {consent?.companion ? (
            <StatusBadge tone="success">Voice consent given {new Date(consent.updatedAt).toLocaleDateString()}</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">No voice consent yet — asked on first use</StatusBadge>
          )}
          <StatusBadge tone={data?.flagged ? "warning" : "neutral"}>{data?.flagged ?? 0} alerts (30 days)</StatusBadge>
          {consent?.companion && (
            <button
              className="ml-auto text-xs font-semibold text-muted-foreground underline hover:text-foreground"
              onClick={async () => {
                await setCompanionConsent(elderId, false, "caregiver");
                bump();
              }}
            >
              Withdraw consent & delete conversations
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {(data?.favorites ?? []).map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              <span className="font-semibold">{f.title}</span>
              {f.label && <span className="text-muted-foreground">· {f.label}</span>}
              <button
                className="ml-auto rounded-lg p-1.5 hover:bg-secondary"
                aria-label={playingId === f.id ? "Stop preview" : "Preview"}
                onClick={() => preview(f)}
              >
                {playingId === f.id ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                className="rounded-lg p-1.5 hover:bg-secondary"
                aria-label="Remove favourite"
                onClick={async () => {
                  await getDb().favorites.delete(f.id!);
                  bump();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data && data.favorites.length === 0 && (
            <p className="text-muted-foreground">No favourite songs or poems yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** "My Favorites" upload — same modal pattern as Add Family Memory Card. */
export function AddFavoriteModal({
  open,
  onClose,
  elders,
}: {
  open: boolean;
  onClose: () => void;
  elders: Elder[];
}) {
  const bump = useApp((s) => s.bump);
  const [elderId, setElderId] = useState("");
  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setLabel("");
    setFile(null);
    setRights(false);
    setError("");
  };

  const save = async () => {
    const target = elderId || elders[0]?.id;
    if (!target || !title.trim() || !file) return setError("Please choose an elder, a title and an audio file.");
    if (!file.type.startsWith("audio/")) return setError("Please choose an audio file (mp3, m4a, wav…).");
    if (file.size > 25 * 1024 * 1024) return setError("Please choose a file under 25 MB.");
    if (!rights) return setError("Please confirm you have the right to use this recording.");
    await getDb().favorites.add({
      elderId: target,
      title: title.trim(),
      label: label.trim(),
      audio: file,
      mime: file.type,
      createdAt: Date.now(),
    });
    bump();
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a favourite song or poem">
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-muted-foreground">Elder</span>
          <select
            value={elderId || elders[0]?.id || ""}
            onChange={(e) => setElderId(e.target.value)}
            className="w-full rounded-xl border-2 border-input bg-background px-4 py-2.5 outline-none focus:border-primary"
          >
            {elders.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Amar Sonar Bangla" />
        <Field
          label="Short label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Rabindra Sangeet — Mother's favourite"
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-muted-foreground">Audio file</span>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border-2 border-dashed border-input bg-background px-4 py-3 text-sm"
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={rights} onChange={(e) => setRights(e.target.checked)} />
          <span>I recorded this or have the right to use it. RECONNECT never searches or streams music from the internet.</span>
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={save}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
