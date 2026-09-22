import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Gamepad2, ListChecks, Users, LifeBuoy, MessageCircleHeart } from "lucide-react";
import { ElderShell } from "@/components/rc/ElderShell";
import { AudioIcon } from "@/components/rc/ui";
import { useApp } from "@/store/app";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/elder/")({
  component: ElderHome,
  head: () => ({
    meta: [
      { title: "Home — RECONNECT" },
      { name: "description", content: "Your calm home screen: play, routine, people and help." },
      { property: "og:title", content: "Home — RECONNECT" },
      { property: "og:description", content: "Play, My Routine, My People and Help in four large buttons." },
    ],
  }),
});

function ElderHome() {
  const navigate = useNavigate();
  const lang = useApp((s) => s.lang);
  const name = useApp((s) => s.userName);

  const tiles = [
    { key: "play", icon: Gamepad2, to: "/elder/play" as const },
    { key: "myRoutine", icon: ListChecks, to: "/elder/routine" as const },
    { key: "myPeople", icon: Users, to: "/elder/people" as const },
    { key: "help", icon: LifeBuoy, to: "/elder/help" as const },
    { key: "companion", icon: MessageCircleHeart, to: "/elder/companion" as const },
  ];

  return (
    <ElderShell title={`${t("hello", lang)}, ${name.split(" ")[0]}`}>
      <div className="grid gap-5 sm:grid-cols-2">
        {tiles.map(({ key, icon: Icon, to }) => (
          <div key={key} className={key === "companion" ? "relative sm:col-span-2" : "relative"}>
            <button
              onClick={() => navigate({ to })}
              className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-3xl border-4 border-primary/25 bg-card p-6 shadow-sm transition-all hover:border-primary hover:shadow-md active:scale-[0.99]"
            >
              <Icon className="h-14 w-14 text-primary" />
              <span className="font-serif text-3xl font-bold">{t(key, lang)}</span>
            </button>
            <AudioIcon text={t(key, lang)} className="absolute right-4 top-4" />
          </div>
        ))}
      </div>
    </ElderShell>
  );
}
