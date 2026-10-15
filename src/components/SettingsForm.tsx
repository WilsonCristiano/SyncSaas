"use client";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { saveSettings } from "@/app/actions";
import { PageHeader, Switch, btnPrimary, card, input } from "./ui";

export type SettingsData = {
  requireApproval: boolean; maxPerDay: number; minHoursBetween: number; scrapeEveryHours: number;
  creditsEnabled: boolean; creditsTemplate: string; captionSuffix: string;
};

function Row({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-mute">{hint}</p>
      </div>
      {children}
    </div>
  );
}

export default function SettingsForm({ initial }: { initial: SettingsData }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) => setS((p) => ({ ...p, [k]: v }));
  const num = (k: "maxPerDay" | "minHoursBetween" | "scrapeEveryHours", min: number, max: number) => (
    <input type="number" inputMode="numeric" min={min} max={max} value={s[k]} onChange={(e) => set(k, Number(e.target.value))}
      className={`${input} w-20 text-center tabular-nums`} aria-label={k} />
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setMsg((await saveSettings(s)).info ?? null));
      }}
    >
      <PageHeader title="Configurações" sub="Regras globais do bot. As mudanças valem a partir da próxima execução." />

      <div className="space-y-5">
        <section className={`${card} divide-y divide-line`} aria-label="Aprovação">
          <Row title="Aprovação manual" hint="Novos vídeos ficam aguardando e só são publicados depois de você aprovar em Fila.">
            <Switch checked={s.requireApproval} onChange={(v) => set("requireApproval", v)} label="Aprovação manual" />
          </Row>
        </section>

        <section className={`${card} divide-y divide-line`} aria-label="Proteção anti-spam">
          <Row title="Máximo de posts por 24 horas" hint="Excedentes esperam na fila e saem nos dias seguintes.">{num("maxPerDay", 1, 50)}</Row>
          <Row title="Intervalo mínimo entre posts (horas)" hint="0 desativa o intervalo.">{num("minHoursBetween", 0, 48)}</Row>
          <Row title="Ler as fontes a cada (horas)" hint="Controla o consumo de créditos do Apify.">{num("scrapeEveryHours", 1, 168)}</Row>
        </section>

        <section className={`${card} space-y-4 p-4 sm:p-5`} aria-label="Legenda">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium">Créditos do autor original</p>
              <p className="mt-0.5 text-xs text-mute">Use {"{author}"} onde o @ do autor deve aparecer.</p>
            </div>
            <Switch checked={s.creditsEnabled} onChange={(v) => set("creditsEnabled", v)} label="Créditos" />
          </div>
          <input className={input} value={s.creditsTemplate} onChange={(e) => set("creditsTemplate", e.target.value)}
            disabled={!s.creditsEnabled} placeholder="Créditos: @{author}" aria-label="Modelo de créditos" />

          <div>
            <label htmlFor="suffix" className="text-sm font-medium">Bloco fixo no fim da legenda</label>
            <p className="mb-2 mt-0.5 text-xs text-mute">Texto e hashtags colados depois dos créditos, em todas as publicações.</p>
            <textarea id="suffix" rows={4} maxLength={1000} className={`${input} resize-y`} value={s.captionSuffix}
              onChange={(e) => set("captionSuffix", e.target.value)} placeholder="Siga para mais! #exemplo #marca" />
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button className={btnPrimary} disabled={pending}><Save className="h-4 w-4" aria-hidden /> Guardar</button>
          {msg && <p className="text-sm text-emerald-300" role="status">{msg}</p>}
        </div>
      </div>
    </form>
  );
}
