"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { AlertTriangle, Clock3, Gauge, Hourglass, Inbox } from "lucide-react";

export type Stats = { waiting: number; pending: number; running: number; done: number; failed: number; last24: number; maxPerDay: number };
export type LogRow = { id: string; level: string; kind: string; message: string; igId: string | null; createdAt: string };

const LEVEL: Record<string, { label: string; cls: string }> = {
  INFO: { label: "Info", cls: "bg-violet-500/10 text-violet-300 ring-violet-400/20" },
  SUCCESS: { label: "Sucesso", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  WARN: { label: "Aviso", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/20" },
  ERROR: { label: "Erro", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
};
const KIND: Record<string, string> = { SCRAPE: "Scraping", TIKTOK: "TikTok", SYSTEM: "Sistema" };
const FILTERS = [
  { id: "all", label: "Tudo" },
  { id: "SCRAPE", label: "Scraping" },
  { id: "TIKTOK", label: "TikTok" },
  { id: "SYSTEM", label: "Sistema" },
  { id: "ERROR", label: "Só erros" },
];
const COLS = "md:grid md:grid-cols-[8.5rem_5.5rem_5.5rem_1fr_8rem] md:gap-4";

function Count({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString("pt-BR"));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: "easeOut" });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

export default function DashboardView({ stats: s, logs }: { stats: Stats; logs: LogRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [router]);

  const shown = useMemo(
    () => logs.filter((l) => (filter === "all" ? true : filter === "ERROR" ? l.level === "ERROR" : l.kind === filter)),
    [logs, filter],
  );

  const total = s.waiting + s.pending + s.running + s.done + s.failed;
  const closed = s.done + s.failed;
  const rate = closed ? Math.round((s.done / closed) * 100) : null;

  const segs = [
    { label: "Publicados", v: s.done, bar: "bg-violet-500", dot: "bg-violet-500" },
    { label: "Em execução", v: s.running, bar: "bg-violet-300", dot: "bg-violet-300" },
    { label: "Na fila", v: s.pending, bar: "bg-ink-600", dot: "bg-ink-600 ring-1 ring-mute/40" },
    { label: "Aguardando aprovação", v: s.waiting, bar: "bg-amber-400", dot: "bg-amber-400" },
    { label: "Falhas", v: s.failed, bar: "bg-rose-500", dot: "bg-rose-500" },
  ];

  const cards = [
    { label: "Aguardando aprovação", v: s.waiting, icon: Hourglass, tone: "text-amber-300 bg-amber-500/10", href: "/fila?status=WAITING_APPROVAL" },
    { label: "Na fila", v: s.pending, icon: Clock3, tone: "text-violet-300 bg-violet-500/10", href: "/fila?status=PENDING" },
    { label: "Falhas", v: s.failed, icon: AlertTriangle, tone: "text-rose-300 bg-rose-500/10", href: "/fila?status=FAILED" },
    { label: `Últimas 24 h (limite ${s.maxPerDay})`, v: s.last24, icon: Gauge, tone: "text-violet-200 bg-violet-400/10", href: "/configuracoes" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Visão geral</h1>

      <section className="rounded-3xl border border-line bg-ink-900/70 p-5 sm:p-7" aria-label="Resumo do funil">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-mute">Publicados no TikTok</p>
            <p className="mt-1 font-display text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl"><Count value={s.done} /></p>
          </div>
          <p className="text-sm text-mute sm:max-w-[16rem] sm:text-right">
            {rate === null ? "Aguardando a primeira publicação." : `${rate}% de sucesso entre ${closed.toLocaleString("pt-BR")} publicações concluídas.`}
          </p>
        </div>

        <div className="mt-7 flex h-3 gap-0.5 overflow-hidden rounded-full bg-ink-800" role="img" aria-label={segs.map((x) => `${x.label}: ${x.v}`).join(", ")}>
          {total > 0 && segs.map((x, i) => (
            <motion.div key={x.label} className={`h-full ${x.bar}`} initial={{ width: 0 }} animate={{ width: `${(x.v / total) * 100}%` }}
              transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }} />
          ))}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-mute">
          {segs.map((x) => (
            <li key={x.label} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${x.dot}`} aria-hidden />
              {x.label} <span className="tabular-nums text-fog">{x.v.toLocaleString("pt-BR")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores">
        {cards.map(({ label, v, icon: Icon, tone, href }) => (
          <motion.div key={label} whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
            <Link href={href} className="flex items-center gap-4 rounded-2xl border border-line bg-ink-900/50 p-4 transition-colors hover:border-violet-400/30">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden /></span>
              <div className="min-w-0">
                <p className="truncate text-sm text-mute">{label}</p>
                <p className="font-display text-3xl font-semibold tabular-nums leading-tight"><Count value={v} /></p>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

      <section id="logs" className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-ink-900/50" aria-label="Registros">
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display text-lg font-semibold">Registros recentes</h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Filtrar registros">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs ring-1 transition-colors ${filter === f.id ? "bg-violet-500/15 text-violet-200 ring-violet-400/40" : "text-mute ring-line hover:text-fog"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-line px-6 py-14 text-center">
            <Inbox className="h-8 w-8 text-ink-600" aria-hidden />
            <p className="max-w-xs text-sm text-mute">Nenhum registro neste filtro. Eventos do scraping e do bot aparecem aqui.</p>
          </div>
        ) : (
          <>
            <div className="hidden border-y border-line px-5 py-2.5 text-xs text-mute md:grid md:grid-cols-[8.5rem_5.5rem_5.5rem_1fr_8rem] md:gap-4">
              <span>Hora</span><span>Nível</span><span>Origem</span><span>Mensagem</span><span>Reel</span>
            </div>
            <ul className="divide-y divide-line/70 border-t border-line md:border-t-0">
              {shown.map((l) => {
                const lv = LEVEL[l.level] ?? LEVEL.INFO;
                return (
                  <li key={l.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-ink-800/60 sm:px-5 ${COLS}`}>
                    <time suppressHydrationWarning dateTime={l.createdAt} className="text-xs tabular-nums text-mute">
                      {new Date(l.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </time>
                    <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs ring-1 ${lv.cls}`}>{lv.label}</span>
                    <span className="text-xs text-mute">{KIND[l.kind] ?? l.kind}</span>
                    <p className="order-last basis-full break-words text-sm md:order-none md:basis-auto">{l.message}</p>
                    <span className="ml-auto truncate text-xs text-mute md:ml-0">{l.igId ?? "—"}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
