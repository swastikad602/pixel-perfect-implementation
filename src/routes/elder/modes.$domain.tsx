import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ElderShell } from "@/components/rc/ElderShell";
import { AudioIcon } from "@/components/rc/ui";
import { DOMAIN_MODES, MODE_EMOJI, MODE_LABEL } from "@/lib/mockData";
import type { Domain } from "@/lib/types";
import { useApp } from "@/store/app";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/elder/modes/$domain")({
  component: Modes,
  head: () => ({
    meta: [
      { title: "Choose a game — RECONNECT" },
      { name: "description", content: "Pick which game to play inside this activity area." },
      { property: "og:title", content: "Choose a game — RECONNECT" },
      { property: "og:description", content: "Each game keeps its own comfortable level." },
    ],
  }),
});

function Modes() {
  const { domain } = useParams({ from: "/elder/modes/$domain" }) as { domain: Domain };
  const navigate = useNavigate();
  const lang = useApp((s) => s.lang);
  const modes = DOMAIN_MODES[domain] ?? [];

  return (
    <ElderShell title={t("chooseGame", lang)} onBack={() => navigate({ to: "/elder/play" })}>
      <div className="grid gap-5 sm:grid-cols-2">
        {modes.map((m) => (
          <div key={m} className="relative">
            <button
              onClick={() => navigate({ to: "/elder/game/$domain/$mode", params: { domain, mode: m } })}
              className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl border-4 border-primary/25 bg-card p-6 transition-all hover:border-primary active:scale-[0.99]"
            >
              <span className="text-6xl">{MODE_EMOJI[m]}</span>
              <span className="text-center font-serif text-2xl font-bold">{MODE_LABEL[m][lang]}</span>
            </button>
            <AudioIcon text={MODE_LABEL[m][lang]} className="absolute right-4 top-4" />
          </div>
        ))}
      </div>
    </ElderShell>
  );
}
