"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseUsername } from "@/lib/instagram";
import { triggerWorker } from "@/lib/worker";

type R = { ok: boolean; error?: string; info?: string };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(n) || 0)));
const refresh = () => ["/", "/fila", "/fontes", "/configuracoes"].forEach((p) => revalidatePath(p));

// ---- Fontes ----
export async function addSource(input: string): Promise<R> {
  const username = parseUsername(input);
  if (!username) return { ok: false, error: "Perfil inválido. Use @utilizador ou o link do perfil." };
  if (await prisma.source.findUnique({ where: { username } })) return { ok: false, error: `@${username} já está na lista.` };
  await prisma.source.create({ data: { username } });
  await prisma.log.create({ data: { level: "INFO", kind: "SCRAPE", message: `Fonte adicionada: @${username}` } });
  refresh();
  return { ok: true };
}

export async function toggleSource(id: string, active: boolean): Promise<R> {
  await prisma.source.update({ where: { id }, data: { active } });
  refresh();
  return { ok: true };
}

export async function removeSource(id: string): Promise<R> {
  const s = await prisma.source.delete({ where: { id } }); // posts já importados ficam (source_id -> null)
  await prisma.log.create({ data: { level: "INFO", kind: "SCRAPE", message: `Fonte removida: @${s.username}` } });
  refresh();
  return { ok: true };
}

export async function runScrapeNow(): Promise<R> {
  const ok = await triggerWorker("scrape");
  return ok ? { ok: true, info: "Scraping solicitado. Os resultados aparecem em 1 a 3 minutos." } : { ok: false, error: "Não foi possível acionar o worker. Veja os registos." };
}

// ---- Fila / aprovação ----
export async function approvePost(id: string): Promise<R> {
  await prisma.post.updateMany({ where: { id, status: "WAITING_APPROVAL" }, data: { status: "PENDING", attempts: 0 } });
  await triggerWorker("new-posts");
  refresh();
  return { ok: true };
}

export async function approveAll(): Promise<R> {
  const { count } = await prisma.post.updateMany({ where: { status: "WAITING_APPROVAL" }, data: { status: "PENDING", attempts: 0 } });
  if (count) await triggerWorker("new-posts");
  refresh();
  return { ok: true, info: `${count} vídeo(s) aprovado(s).` };
}

export async function rejectPost(id: string): Promise<R> {
  await prisma.post.updateMany({ where: { id, status: { in: ["WAITING_APPROVAL", "PENDING"] } }, data: { status: "REJECTED" } });
  refresh();
  return { ok: true };
}

export async function retryPost(id: string): Promise<R> {
  await prisma.post.updateMany({ where: { id, status: "FAILED" }, data: { status: "PENDING", attempts: 0, error: null } });
  await triggerWorker("new-posts");
  refresh();
  return { ok: true };
}

// ---- Configurações ----
export async function saveSettings(d: {
  requireApproval: boolean; maxPerDay: number; minHoursBetween: number; scrapeEveryHours: number;
  creditsEnabled: boolean; creditsTemplate: string; captionSuffix: string;
}): Promise<R> {
  const data = {
    requireApproval: !!d.requireApproval,
    maxPerDay: clamp(d.maxPerDay, 1, 50),
    minHoursBetween: clamp(d.minHoursBetween, 0, 48),
    scrapeEveryHours: clamp(d.scrapeEveryHours, 1, 168),
    creditsEnabled: !!d.creditsEnabled,
    creditsTemplate: String(d.creditsTemplate ?? "").slice(0, 200) || "Créditos: @{author}",
    captionSuffix: String(d.captionSuffix ?? "").slice(0, 1000),
  };
  await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  refresh();
  return { ok: true, info: "Configurações guardadas." };
}
