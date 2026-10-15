import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ApifyClient } from "apify-client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { triggerWorker } from "@/lib/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const safeEq = (a: string, b: string) => {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
};

// Opcional: o scraping principal agora é feito pelo bot a partir da tabela sources.
// Este webhook continua válido para Tasks do Apify que você mantenha à parte.
export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET ?? "";
  const given = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-webhook-secret") ?? "";
  if (!secret || !safeEq(given, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (body?.eventType !== "ACTOR.RUN.SUCCEEDED") return NextResponse.json({ ignored: true });

  const runId: string | undefined = body.resource?.id;
  const datasetId: string | undefined = body.resource?.defaultDatasetId;
  if (!runId || !datasetId) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  if (await prisma.post.findFirst({ where: { apifyRunId: runId }, select: { id: true } })) {
    return NextResponse.json({ duplicate: true });
  }

  const [{ items }, settings, sources] = await Promise.all([
    new ApifyClient({ token: process.env.APIFY_TOKEN }).dataset(datasetId).listItems({ limit: 100, clean: true }),
    getSettings(),
    prisma.source.findMany({ select: { id: true, username: true } }),
  ]);
  const byName = new Map(sources.map((s) => [s.username.toLowerCase(), s.id]));
  const status = settings.requireApproval ? "WAITING_APPROVAL" : "PENDING";

  const rows = (items as Record<string, any>[])
    .map((it) => {
      const author = String(it.ownerUsername ?? it.owner?.username ?? "").toLowerCase() || null;
      return {
        igId: String(it.shortCode ?? it.id ?? ""),
        videoUrl: String(it.videoUrl ?? ""),
        caption: String(it.caption ?? ""),
        sourceUrl: it.url ? String(it.url) : null,
        author,
        sourceId: author ? byName.get(author) ?? null : null,
        status: status as "WAITING_APPROVAL" | "PENDING",
        apifyRunId: runId,
      };
    })
    .filter((r) => r.igId && r.videoUrl);

  const { count } = await prisma.post.createMany({ data: rows, skipDuplicates: true });
  await prisma.log.create({ data: { level: "INFO", kind: "SCRAPE", message: `Apify run ${runId}: ${count} novo(s) de ${items.length} (${status})` } });

  if (count > 0 && status === "PENDING") await triggerWorker("new-posts");
  return NextResponse.json({ created: count });
}
