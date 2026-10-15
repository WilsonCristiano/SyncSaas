"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, AtSign, Plus, RefreshCw, Trash2 } from "lucide-react";
import { addSource, removeSource, runScrapeNow, toggleSource } from "@/app/actions";
import { PageHeader, Switch, btnGhost, btnPrimary, card, fmtDate, input } from "./ui";

export type SourceRow = { id: string; username: string; active: boolean; lastScrapedAt: string | null; lastError: string | null; posts: number };

export default function SourcesView({ sources }: { sources: SourceRow[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string; info?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.error || r.info ? { ok: r.ok, text: (r.error ?? r.info)! } : null);
      if (r.ok) router.refresh();
    });

  return (
    <div>
      <PageHeader title="Fontes" sub="Perfis do Instagram monitorizados. O bot lê os Reels novos destes perfis e envia para a fila.">
        <button className={btnGhost} disabled={pending || sources.length === 0} onClick={() => run(runScrapeNow)}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Executar scraping agora
        </button>
      </PageHeader>

      <form
        className={`${card} flex flex-col gap-3 p-4 sm:flex-row sm:p-5`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          run(async () => {
            const r = await addSource(value);
            if (r.ok) setValue("");
            return r;
          });
        }}
      >
        <input
          className={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="@utilizador ou https://instagram.com/utilizador"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="url"
          aria-label="Perfil do Instagram"
        />
        <button className={`${btnPrimary} sm:w-auto`} disabled={pending || !value.trim()}>
          <Plus className="h-4 w-4" aria-hidden /> Adicionar
        </button>
      </form>

      <AnimatePresence>
        {msg && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status"
            className={`mt-3 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>
            {msg.text}
          </motion.p>
        )}
      </AnimatePresence>

      <ul className="mt-6 space-y-3">
        <AnimatePresence initial={false}>
          {sources.map((s) => (
            <motion.li key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
              className={`${card} flex flex-col gap-4 p-4 sm:flex-row sm:items-center`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${s.active ? "bg-violet-500/10 text-violet-300" : "bg-ink-800 text-mute"}`}>
                  <AtSign className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <a href={`https://instagram.com/${s.username}`} target="_blank" rel="noreferrer" className="block truncate font-medium transition-colors hover:text-violet-300">
                    @{s.username}
                  </a>
                  <p className="text-xs text-mute">
                    {s.posts} Reels importados. Última leitura: <span suppressHydrationWarning>{fmtDate(s.lastScrapedAt)}</span>
                  </p>
                  {s.lastError && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-rose-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="break-words">{s.lastError}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <label className="flex items-center gap-2.5 text-sm text-mute">
                  {s.active ? "Ativa" : "Pausada"}
                  <Switch checked={s.active} label={`Ativar @${s.username}`} disabled={pending} onChange={(v) => run(() => toggleSource(s.id, v))} />
                </label>
                {confirm === s.id ? (
                  <button className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-400/30 active:scale-95"
                    onClick={() => { setConfirm(null); run(() => removeSource(s.id)); }}>
                    Confirmar remoção
                  </button>
                ) : (
                  <button aria-label={`Remover @${s.username}`} className="grid h-10 w-10 place-items-center rounded-lg text-mute transition hover:bg-rose-500/10 hover:text-rose-300 active:scale-95"
                    onClick={() => { setConfirm(s.id); setTimeout(() => setConfirm((c) => (c === s.id ? null : c)), 4000); }}>
                    <Trash2 className="h-[18px] w-[18px]" aria-hidden />
                  </button>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {sources.length === 0 && (
        <p className="mt-10 text-center text-sm text-mute">Nenhuma fonte ainda. Adicione o primeiro perfil acima.</p>
      )}
    </div>
  );
}
