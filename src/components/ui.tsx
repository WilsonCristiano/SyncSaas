"use client";
import { motion } from "framer-motion";

// text-base no mobile evita o zoom automático do iOS Safari ao focar campos
export const card = "rounded-2xl border border-line bg-ink-900/50";
export const input =
  "w-full rounded-lg border border-line bg-ink-950/70 px-3.5 py-2.5 text-base text-fog placeholder:text-mute/70 transition-colors focus:border-violet-400/60 focus:outline-none sm:text-sm";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-400 active:scale-[.98] disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm text-fog transition hover:border-violet-400/40 hover:bg-ink-800 active:scale-[.98] disabled:opacity-50";

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-violet-500" : "bg-ink-600"}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 34 }}
        className={`absolute top-1 h-5 w-5 rounded-full bg-white ${checked ? "right-1" : "left-1"}`}
      />
    </button>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 max-w-xl text-sm text-mute">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca";
