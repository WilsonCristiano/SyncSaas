import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ApifyClient } from "apify-client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const safeEq = (a: string, b: string) => {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
};

// Vercel não roda Playwright: apenas enfileira no banco e acorda o worker remoto
// (GitHub Actions via repository_dispatch). Falha aqui NÃO derruba o webhook.
async function triggerWorker() {
  const url = process.env.WORKER_TRIGGER_URL;
  if (!url) return;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.WORKER_TRIGGER_TOKEN ?? ""}`,
      },
      body: JSON.stringify({ event_type: "new-posts" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch (e) {
    await prisma.log.create({ data: { level: "WARN", message: `Falha ao acionar worker: ${(e as Error).message}` } });
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET ?? "";
  const given = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-webhook-secret") ?? "";
  if (!secret || !safeEq(given, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (body?.eventType !== "ACTOR.RUN.SUCCEEDED") return NextResponse.json({ ignored: true });

  const runId: string | undefined = body.resource?.id;
  const datasetId: string | undefined = body.resource?.defaultDatasetId;
  if (!runId || !datasetId) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  // Idempotência: retries do Apify para o mesmo run não reprocessam
  if (await prisma.post.findFirst({ where: { apifyRunId: runId }, select: { id: true } })) {
    return NextResponse.json({ duplicate: true });
  }

  const { items } = await new ApifyClient({ token: process.env.APIFY_TOKEN }).dataset(datasetId).listItems({ limit: 100, clean: true });

  const rows = (items as Record<string, any>[])
    .map((it) => ({
      igId: String(it.shortCode ?? it.id ?? ""),
      videoUrl: String(it.videoUrl ?? ""),
      caption: String(it.caption ?? ""),
      sourceUrl: it.url ? String(it.url) : null,
      apifyRunId: runId,
    }))
    .filter((r) => r.igId && r.videoUrl);

  // skipDuplicates + ig_id UNIQUE: Reel já visto nunca volta para a fila (sem loops)
  const { count } = await prisma.post.createMany({ data: rows, skipDuplicates: true });
  await prisma.log.create({ data: { level: "INFO", message: `Apify run ${runId}: ${count} novo(s) de ${items.length}` } });

  if (count > 0) await triggerWorker();
  return NextResponse.json({ created: count });
}
