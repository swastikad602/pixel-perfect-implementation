import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Volume2, WifiOff, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { speak, ttsAvailable } from "@/lib/tts";
import { useApp } from "@/store/app";
import { useOnline } from "@/hooks/useDexie";

/* ---------------- Button ---------------- */
type Variant = "primary" | "soft" | "outline" | "ghost" | "accent" | "elder";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  soft: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border-2 border-border bg-card text-foreground hover:bg-secondary/60",
  ghost: "text-foreground hover:bg-secondary/60",
  accent: "bg-accent text-accent-foreground hover:bg-accent/90",
  elder:
    "bg-card text-foreground border-4 border-primary/25 hover:border-primary shadow-sm hover:shadow-md",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-6 py-4 text-lg min-h-16",
  xl: "px-8 py-8 text-2xl min-h-24",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Card ---------------- */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("font-serif text-lg font-semibold", className)}>{children}</h3>;
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- StatusBadge ---------------- */
type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/25 text-warning-foreground",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-primary/10 text-primary",
};

export function StatusBadge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", TONES[tone])}>
      {children}
    </span>
  );
}

/* ---------------- ProgressBar ---------------- */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}

/* ---------------- AudioIcon ---------------- */
export function AudioIcon({ text, className }: { text: string; className?: string }) {
  const lang = useApp((s) => s.lang);
  if (!ttsAvailable()) return null;
  return (
    <button
      type="button"
      onClick={() => speak(text, lang)}
      aria-label="Read aloud"
      className={cn(
        "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20",
        className,
      )}
    >
      <Volume2 className="h-6 w-6" />
    </button>
  );
}

/* ---------------- ChatBubble ---------------- */
export function ChatBubble({ from, text }: { from: "user" | "bot"; text: string }) {
  return (
    <div className={cn("flex", from === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          from === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
        )}
      >
        {text}
      </div>
    </div>
  );
}

/* ---------------- SyncIndicator ---------------- */
export function SyncIndicator() {
  const online = useOnline();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        online ? "bg-success/15 text-success" : "bg-warning/25 text-warning-foreground",
      )}
    >
      {online ? <CheckCircle2 className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      {online ? "All changes synced" : "Offline — saved locally"}
    </span>
  );
}

/* ---------------- Disclaimer footer ---------------- */
export function DisclaimerFooter() {
  return (
    <footer className="mt-10 border-t border-border py-6 text-center text-sm text-muted-foreground">
      RECONNECT supports engagement and routines. It is not a diagnostic or treatment system.
    </footer>
  );
}

export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border-2 border-input bg-background px-4 py-2.5 text-base outline-none focus:border-primary"
      />
    </label>
  );
}
