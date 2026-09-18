import { create } from "zustand";
import type { Lang, Role } from "@/lib/types";

interface AppState {
  role: Role | null;
  userName: string;
  elderId: string | null;
  lang: Lang;
  /** Dev-only switch that forces the offline experience without disconnecting. */
  simulateOffline: boolean;
  /** Bumped after every write so views re-read from IndexedDB. */
  rev: number;
  signIn: (p: { role: Role; userName: string; elderId?: string | null }) => void;
  signOut: () => void;
  setLang: (l: Lang) => void;
  setSimulateOffline: (v: boolean) => void;
  bump: () => void;
}

export const useApp = create<AppState>((set) => ({
  role: null,
  userName: "",
  elderId: null,
  lang: "en",
  simulateOffline: false,
  rev: 0,
  signIn: ({ role, userName, elderId = null }) => set({ role, userName, elderId }),
  signOut: () => set({ role: null, userName: "", elderId: null }),
  setLang: (lang) => set({ lang }),
  setSimulateOffline: (simulateOffline) => set({ simulateOffline }),
  bump: () => set((s) => ({ rev: s.rev + 1 })),
}));
