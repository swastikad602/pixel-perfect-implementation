import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ElderShell } from "@/components/rc/ElderShell";
import { AudioIcon, Card } from "@/components/rc/ui";
import { getDb } from "@/lib/db";
import { useDexie } from "@/hooks/useDexie";
import { useApp } from "@/store/app";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/elder/people")({
  component: People,
  head: () => ({
    meta: [
      { title: "My People — RECONNECT" },
      { name: "description", content: "Family memory cards with names, relationships and a note read aloud." },
      { property: "og:title", content: "My People — RECONNECT" },
      { property: "og:description", content: "Familiar faces, names and relationships, spoken aloud on request." },
    ],
  }),
});

function People() {
  const navigate = useNavigate();
  const lang = useApp((s) => s.lang);
  const elderId = useApp((s) => s.elderId);
  const cards = useDexie(
    async () => (elderId ? getDb().memoryCards.where("elderId").equals(elderId).toArray() : []),
    [elderId],
  );

  return (
    <ElderShell title={t("myPeople", lang)} onBack={() => navigate({ to: "/elder" })}>
      <div className="grid gap-5 sm:grid-cols-2">
        {(cards ?? []).map((c) => (
          <Card key={c.id} className="flex items-center gap-4">
            <span className="text-6xl">{c.emoji || "🙂"}</span>
            <div className="min-w-0">
              <p className="font-serif text-2xl font-bold">{c.name}</p>
              <p className="text-lg text-muted-foreground">{c.relationship}</p>
              {c.note && <p className="mt-1 text-base">{c.note}</p>}
            </div>
            <AudioIcon className="ml-auto" text={`${c.name}, your ${c.relationship}. ${c.note}`} />
          </Card>
        ))}
        {cards && cards.length === 0 && (
          <p className="text-lg text-muted-foreground">Your caregiver can add family cards here.</p>
        )}
      </div>
    </ElderShell>
  );
}
