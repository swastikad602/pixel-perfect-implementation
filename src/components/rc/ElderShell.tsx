import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/store/app";
import { AudioIcon, Button, DisclaimerFooter, SyncIndicator } from "./ui";
import { LanguageToggle } from "./Shell";
import { t } from "@/lib/i18n";

export function ElderShell({
  title,
  children,
  onBack,
}: {
  title?: string;
  children: ReactNode;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const role = useApp((s) => s.role);
  const lang = useApp((s) => s.lang);

  useEffect(() => {
    if (role !== "elder") navigate({ to: "/" });
  }, [role, navigate]);

  if (role !== "elder") return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
          {onBack ? (
            <Button variant="soft" size="md" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" /> {t("back", lang)}
            </Button>
          ) : (
            <span className="font-serif text-xl font-bold text-primary">RECONNECT</span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <SyncIndicator />
            <LanguageToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {title && (
          <div className="mb-8 flex items-center justify-center gap-3">
            <h1 className="text-center font-serif text-4xl font-bold">{title}</h1>
            <AudioIcon text={title} />
          </div>
        )}
        {children}
        <DisclaimerFooter />
      </main>
    </div>
  );
}
