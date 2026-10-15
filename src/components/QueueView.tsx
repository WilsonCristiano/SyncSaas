"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, ExternalLink, RotateCcw, X } from "lucide-react";
import { approveAll, approvePost, rejectPost, retryPost } from "@/app/actions";
import { PageHeader, btnGhost, btnPrimary, card, fmtDate } from "./ui";

export type PostRow = { id: string; igId: string; author: string | null; caption: string; status: string; error: string | null; attempts: number; sourceUrl: string | null; createdAt: string; postedAt: string | null };

export const STATUS: Record<string, { label: string; cls: string }> = {
  WAITING_APPROVAL: { label: "Aguardando aprovação", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/20" },
  PENDING: { label: "Pendente", cls: "bg-violet-500/10 text-violet-300 ring-violet-400/20" },
  RUNNING: { label: "Publicando", cls: "bg-violet-300/10 text-violet-200 ring-violet-300/20" },
  DONE: { label: "Publicado", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
  FAILED: { label: "Falhou", cls: "bg-rose-500/10 text-rose-300 ring-rose-400/20" },
  REJECTED: { label: "Rejeitado", cls: "bg-ink-700 text-mute ring-line" },
};
const TABS = ["", "WAITING_APPROVAL", "PENDING", "RUNNING", "DONE", "FAILED", "REJECTED"];

export default function QueueView({ posts, counts, current }: { posts: PostRow[]; counts: Record<string, number>; current: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const act = (fn: () => Promise<{ info?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.info ?? null);
      router.refresh();
    });

  return (
    <div>
      <PageHeader title="Fila de vídeos" sub="Estado de cada Reel, do scraping à publicação no TikTok.">
        {(counts.WAITING_APPROVAL ?? 0) > 0 && (
          <button className={btnPrimary} disabled={pending} onClick={() => act(approveAll)}>
            <Check className="h-4 w-4" aria-hidden /> Aprovar todos ({counts.WAITING_APPROVAL})
          </button>
        )}
      </PageHeader>

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Filtrar por estado">
        {TABS.map((t) => {
          const on = t === current;
          const n = t ? counts[t] ?? 0 : total;
          return (
            <Link key={t || "all"} href={t ? `/fila?status=${t}` : "/fila"} role="tab" aria-selected={on}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ring-1 transition-colors ${on ? "bg-violet-500/15 text-violet-200 ring-violet-400/40" : "text-mute ring-line hover:text-fog"}`}>
              {t ? STATUS[t].label : "Todos"} <span className="tabular-nums opacity-70">{n}</span>
            </Link>
          );
        })}
      </div>

      {msg && <p className="mb-4 text-sm text-emerald-300" role="status">{msg}</p>}

      {posts.length === 0 ? (
        <p className="py-16 text-center text-sm text-mute">Nenhum vídeo neste estado.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p, i) => {
            const st = STATUS[p.status] ?? STATUS.PENDING;
            return (
              <motion.li key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}
                className={`${card} p-4`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${st.cls}`}>{st.label}</span>
                  <span className="text-sm font-medium">{p.author ? `@${p.author}` : "Autor desconhecido"}</span>
                  <span suppressHydrationWarning className="ml-auto text-xs tabular-nums text-mute">
                    {p.postedAt ? `Publicado ${fmtDate(p.postedAt)}` : `Importado ${fmtDate(p.createdAt)}`}
                  </span>
                </div>
                <p className="mt-2.5 line-clamp-2 break-words text-sm text-mute">{p.caption || "Sem legenda"}</p>
                {p.error && <p className="mt-2 break-words text-xs text-rose-300">Tentativa {p.attempts}: {p.error}</p>}

                <div className="mt-3.5 flex flex-wrap gap-2">
                  {p.status === "WAITING_APPROVAL" && (
                    <button className={btnPrimary} disabled={pending} onClick={() => act(() => approvePost(p.id))}><Check className="h-4 w-4" aria-hidden /> Aprovar</button>
                  )}
                  {(p.status === "WAITING_APPROVAL" || p.status === "PENDING") && (
                    <button className={btnGhost} disabled={pending} onClick={() => act(() => rejectPost(p.id))}><X className="h-4 w-4" aria-hidden /> Rejeitar</button>
                  )}
                  {p.status === "FAILED" && (
                    <button className={btnGhost} disabled={pending} onClick={() => act(() => retryPost(p.id))}><RotateCcw className="h-4 w-4" aria-hidden /> Tentar de novo</button>
                  )}
                  {p.sourceUrl && (
                    <a className={btnGhost} href={p.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" aria-hidden /> Original</a>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
