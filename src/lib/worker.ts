import { prisma } from "./prisma";

/** Aciona o GitHub Actions (repository_dispatch). eventType: "new-posts" | "scrape". */
export async function triggerWorker(eventType: "new-posts" | "scrape" = "new-posts"): Promise<boolean> {
  const url = process.env.WORKER_TRIGGER_URL;
  if (!url) return false;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.WORKER_TRIGGER_TOKEN ?? ""}`,
      },
      body: JSON.stringify({ event_type: eventType }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return true;
  } catch (e) {
    await prisma.log.create({ data: { level: "WARN", kind: "SYSTEM", message: `Falha ao acionar worker: ${(e as Error).message}` } });
    return false;
  }
}
