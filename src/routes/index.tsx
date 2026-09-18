import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Delete, HeartHandshake } from "lucide-react";
import { Button, Card, Field } from "@/components/rc/ui";
import { LanguageToggle } from "@/components/rc/Shell";
import { SEED_ACCOUNTS } from "@/lib/mockData";
import { ensureSeed, getDb } from "@/lib/db";
import { useApp } from "@/store/app";
import type { Elder } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: SignIn,
  head: () => ({
    meta: [
      { title: "Sign in — RECONNECT" },
      {
        name: "description",
        content: "Sign in to RECONNECT as an elder, caregiver, doctor or health administrator.",
      },
      { property: "og:title", content: "Sign in — RECONNECT" },
      {
        property: "og:description",
        content: "Offline-first daily support for elders living with dementia and the people who care for them.",
      },
    ],
  }),
});

// Mock authentication only — no real auth provider is wired up in this build.
function SignIn() {
  const navigate = useNavigate();
  const signIn = useApp((s) => s.signIn);
  const [tab, setTab] = useState<"elder" | "staff">("elder");
  const [elders, setElders] = useState<Elder[]>([]);
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("caregiver@reconnect.app");
  const [password, setPassword] = useState("demo1234");
  const [message, setMessage] = useState("");

  useEffect(() => {
    ensureSeed()
      .then(() => getDb().elders.toArray())
      .then(setElders)
      .catch(() => {});
  }, []);

  const submitPin = async (value: string) => {
    const elder = elders.find((e) => e.pin === value);
    if (!elder) {
      setMessage("That PIN didn't match. Please try again.");
      setPin("");
      return;
    }
    useApp.getState().setLang(elder.language);
    signIn({ role: "elder", userName: elder.name, elderId: elder.id });
    navigate({ to: "/elder" });
  };

  const press = (d: string) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setMessage("");
    if (next.length === 4) void submitPin(next);
  };

  const staffSignIn = () => {
    const acc = SEED_ACCOUNTS.find((a) => a.email === email.trim() && a.password === password);
    if (!acc) {
      setMessage("Email or password is not recognised.");
      return;
    }
    signIn({ role: acc.role, userName: acc.name });
    navigate({ to: acc.role === "caregiver" ? "/caregiver" : acc.role === "doctor" ? "/doctor" : "/government" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif text-2xl font-bold text-primary">
            <HeartHandshake className="h-7 w-7" /> RECONNECT
          </div>
          <LanguageToggle />
        </div>
        <p className="text-muted-foreground">
          Gentle daily activities, routines and family memories — built to work with or without a connection.
        </p>

        <div className="inline-flex w-full overflow-hidden rounded-xl border border-border">
          {(["elder", "staff"] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                setTab(k);
                setMessage("");
              }}
              className={`flex-1 py-3 text-sm font-bold ${
                tab === k ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              {k === "elder" ? "I am an elder" : "Caregiver / Doctor / Government"}
            </button>
          ))}
        </div>

        {tab === "elder" ? (
          <Card className="text-center">
            <h2 className="font-serif text-2xl font-semibold">Enter your 4 numbers</h2>
            <div className="my-6 flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-6 w-6 rounded-full border-2 ${
                    pin.length > i ? "border-primary bg-primary" : "border-border"
                  }`}
                />
              ))}
            </div>
            <div className="mx-auto grid max-w-xs grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <Button key={d} variant="elder" size="lg" className="text-2xl" onClick={() => press(d)}>
                  {d}
                </Button>
              ))}
              <div />
              <Button variant="elder" size="lg" className="text-2xl" onClick={() => press("0")}>
                0
              </Button>
              <Button variant="soft" size="lg" onClick={() => setPin(pin.slice(0, -1))} aria-label="Delete">
                <Delete className="h-6 w-6" />
              </Button>
            </div>
            {message && <p className="mt-4 text-base text-muted-foreground">{message}</p>}
            <p className="mt-6 text-sm text-muted-foreground">Demo PINs: 1234, 2345, 3456</p>
          </Card>
        ) : (
          <Card className="space-y-4">
            <Field label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {message && <p className="text-sm text-destructive">{message}</p>}
            <Button className="w-full" size="lg" onClick={staffSignIn}>
              Sign in
            </Button>
            <div className="space-y-1 text-xs text-muted-foreground">
              {SEED_ACCOUNTS.map((a) => (
                <p key={a.email}>
                  {a.role}: {a.email} / demo1234
                </p>
              ))}
            </div>
          </Card>
        )}

        <p className="text-center text-sm text-muted-foreground">
          RECONNECT supports engagement and routines. It is not a diagnostic or treatment system.
        </p>
      </div>
    </div>
  );
}
