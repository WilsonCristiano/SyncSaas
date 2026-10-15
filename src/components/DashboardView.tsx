"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { AlertTriangle, Clock3, Inbox, Loader } from "lucide-react";

export type Stats = { pending: number; running: number; done: number; failed: number };
export type LogRow = { id: string; level: string; message: string; igId: string | null; createdAt: string };

const LEVEL: Record<string, { label: string; cls: string }> = {
  INFO: { label: "Info", cls: "bg-violet-500/10 text-violet-300 ring-violet-400/20" },
  SUCCESS: { label: "Sucesso", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  WARN: { label: "Aviso", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/20" },
  ERROR: { label: "Erro", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
};

const COLS = "md:grid md:grid-cols-[8.5rem_5.5rem_1fr_9rem] md:gap-4";

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

  // Atualiza os dados do servidor a cada 15 s (pausa com a aba oculta)
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [router]);

  const total = s.pending + s.running + s.done + s.failed;
  const closed = s.done + s.failed;
  const rate = closed ? Math.round((s.done / closed) * 100) : null;

  const segs = [
    { label: "Publicados", v: s.done, bar: "bg-violet-500", dot: "bg-violet-500" },
    { label: "Em execução", v: s.running, bar: "bg-violet-300", dot: "bg-violet-300" },
    { label: "Na fila", v: s.pending, bar: "bg-ink-600", dot: "bg-ink-600 ring-1 ring-mute/40" },
    { label: "Falhas", v: s.failed, bar: "bg-rose-500", dot: "bg-rose-500" },
  ];

  const small = [
    { label: "Na fila", v: s.pending, icon: Clock3, tone: "text-violet-300 bg-violet-500/10" },
    { label: "Em execução", v: s.running, icon: Loader, tone: "text-violet-200 bg-violet-400/10" },
    { label: "Falhas", v: s.failed, icon: AlertTriangle, tone: "text-rose-300 bg-rose-500/10" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Visão geral</h1>

      {/* Painel principal: o funil de publicação */}
      <section className="rounded-3xl border border-line bg-ink-900/70 p-5 sm:p-7" aria-label="Resumo do funil">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-mute">Publicados no TikTok</p>
            <p className="mt-1 font-display text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl">
              <Count value={s.done} />
            </p>
          </div>
          <p className="text-sm text-mute sm:max-w-[16rem] sm:text-right">
            {rate === null
              ? "Aguardando a primeira publicação."
              : `${rate}% de sucesso entre ${closed.toLocaleString("pt-BR")} publicações concluídas.`}
          </p>
        </div>

        <div
          className="mt-7 flex h-3 gap-0.5 overflow-hidden rounded-full bg-ink-800"
          role="img"
          aria-label={segs.map((x) => `${x.label}: ${x.v}`).join(", ")}
        >
          {total > 0 &&
            segs.map((x, i) => (
              <motion.div
                key={x.label}
                className={`h-full ${x.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${(x.v / total) * 100}%` }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Indicadores">
        {small.map(({ label, v, icon: Icon, tone }) => (
          <motion.div
            key={label}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="flex items-center gap-4 rounded-2xl border border-line bg-ink-900/50 p-4 transition-colors hover:border-violet-400/30"
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-mute">{label}</p>
              <p className="font-display text-3xl font-semibold tabular-nums leading-tight">
                <Count value={v} />
              </p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Registros */}
      <section id="logs" className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-ink-900/50" aria-label="Registros">
        <div className="flex items-baseline justify-between px-4 py-4 sm:px-5">
          <h2 className="font-display text-lg font-semibold">Registros recentes</h2>
          <p className="text-xs text-mute">Atualiza a cada 15 s</p>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-line px-6 py-14 text-center">
            <Inbox className="h-8 w-8 text-ink-600" aria-hidden />
            <p className="max-w-xs text-sm text-mute">
              Nenhum registro ainda. Eventos do webhook e do bot aparecem aqui assim que o primeiro Reel chegar.
            </p>
          </div>
        ) : (
          <>
            <div className={`hidden border-y border-line px-5 py-2.5 text-xs text-mute md:grid md:grid-cols-[8.5rem_5.5rem_1fr_9rem] md:gap-4`}>
              <span>Hora</span><span>Nível</span><span>Mensagem</span><span>Reel</span>
            </div>
            <ul className="divide-y divide-line/70 border-t border-line md:border-t-0">
              {logs.map((l) => {
                const lv = LEVEL[l.level] ?? LEVEL.INFO;
                return (
                  <li key={l.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-ink-800/60 sm:px-5 ${COLS}`}>
                    <time suppressHydrationWarning dateTime={l.createdAt} className="text-xs tabular-nums text-mute">
                      {new Date(l.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </time>
                    <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs ring-1 ${lv.cls}`}>{lv.label}</span>
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
