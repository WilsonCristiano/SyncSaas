"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { AtSign, Layers, LayoutGrid, ListVideo, Menu, ScrollText, SlidersHorizontal, X } from "lucide-react";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutGrid },
  { href: "/fila", label: "Fila", icon: ListVideo },
  { href: "/fontes", label: "Fontes", icon: AtSign },
  { href: "/configuracoes", label: "Configurações", icon: SlidersHorizontal },
  { href: "/#logs", label: "Registros", icon: ScrollText },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30">
        <Layers className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">ReelSync</span>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="mt-8 flex flex-col gap-1" aria-label="Principal">
      {NAV.map(({ href, label, icon: Icon }) => {
        const on = href === path;
        return (
        <motion.a
          key={href}
          href={href}
          onClick={onNavigate}
          whileHover={{ x: 3 }}
          aria-current={on ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            on ? "bg-violet-500/10 text-violet-200" : "text-mute hover:bg-ink-800 hover:text-fog"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </motion.a>
        );
      })}
    </nav>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh lg:pl-64">
        {/* Desktop */}
        <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-ink-900/80 px-5 py-6 backdrop-blur lg:flex">
          <Brand />
          <NavList />
        </aside>

        {/* Mobile: barra superior + gaveta (respeita safe-area do iOS) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink-950/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur lg:hidden">
          <Brand />
          <button
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line text-fog transition active:scale-95"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <AnimatePresence>
          {open && (
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
          )}
          {open && (
            <motion.aside
              key="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-line bg-ink-900 px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  aria-label="Fechar menu"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-lg text-mute transition hover:text-fog active:scale-95"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <NavList onNavigate={() => setOpen(false)} />
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-6 sm:px-6 lg:px-10 lg:pt-10">
          {children}
        </main>
      </div>
    </MotionConfig>
  );
}
