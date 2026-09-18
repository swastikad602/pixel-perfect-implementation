import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useApp } from "@/store/app";
import type { Role } from "@/lib/types";
import { Button, DisclaimerFooter, SyncIndicator } from "./ui";

export function LanguageToggle() {
  const { lang, setLang } = useApp();
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-border">
      {(["en", "bn"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1.5 text-xs font-bold ${
            lang === l ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          {l === "en" ? "English" : "বাংলা"}
        </button>
      ))}
    </div>
  );
}

export function Shell({
  role,
  title,
  subtitle,
  children,
  showDisclaimer = true,
  banner,
}: {
  role: Role;
  title: string;
  subtitle?: string;
  children: ReactNode;
  showDisclaimer?: boolean;
  banner?: ReactNode;
}) {
  const navigate = useNavigate();
  const current = useApp((s) => s.role);
  const signOut = useApp((s) => s.signOut);

  useEffect(() => {
    if (current !== role) navigate({ to: "/" });
  }, [current, role, navigate]);

  if (current !== role) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="font-serif text-xl font-bold tracking-tight text-primary">RECONNECT</span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase text-secondary-foreground">
            {role}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <SyncIndicator />
            <LanguageToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      {banner}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-serif text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {showDisclaimer && <DisclaimerFooter />}
      </main>
    </div>
  );
}
