import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ElderShell } from "@/components/rc/ElderShell";
import { AudioIcon } from "@/components/rc/ui";
import { DOMAINS, DOMAIN_EMOJI, DOMAIN_LABEL, DOMAIN_MODES } from "@/lib/mockData";
import { useApp } from "@/store/app";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/elder/play")({
  component: Play,
  head: () => ({
    meta: [
      { title: "Choose an activity — RECONNECT" },
      { name: "description", content: "Four gentle activities: memory, attention, patterns and daily routine." },
      { property: "og:title", content: "Choose an activity — RECONNECT" },
      { property: "og:description", content: "Pick a calm activity. The level adjusts quietly to your comfort." },
    ],
  }),
});

function Play() {
  const navigate = useNavigate();
  const lang = useApp((s) => s.lang);

  return (
    <ElderShell title={t("chooseActivity", lang)} onBack={() => navigate({ to: "/elder" })}>
      <div className="grid gap-5 sm:grid-cols-2">
        {DOMAINS.map((d) => (
          <div key={d} className="relative">
            <button
              onClick={() => {
                const modes = DOMAIN_MODES[d];
                // Domains with more than one game show a game picker first.
                if (modes.length > 1) navigate({ to: "/elder/modes/$domain", params: { domain: d } });
                else
                  navigate({
                    to: "/elder/game/$domain/$mode",
                    params: { domain: d, mode: modes[0]! },
                  });
              }}
              className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl border-4 border-primary/25 bg-card p-6 transition-all hover:border-primary active:scale-[0.99]"
            >
              <span className="text-6xl">{DOMAIN_EMOJI[d]}</span>
              <span className="font-serif text-2xl font-bold">{DOMAIN_LABEL[d]}</span>
            </button>
            <AudioIcon text={DOMAIN_LABEL[d]} className="absolute right-4 top-4" />
          </div>
        ))}
      </div>
    </ElderShell>
  );
}
