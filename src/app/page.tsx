import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import DashboardView from "@/components/DashboardView";

export const dynamic = "force-dynamic";

export default async function Page() {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [groups, logs, last24, settings] = await Promise.all([
    prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.log.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { post: { select: { igId: true } } } }),
    prisma.post.count({ where: { status: "DONE", postedAt: { gte: since } } }),
    getSettings(),
  ]);
  const n = (s: string) => groups.find((g) => g.status === s)?._count._all ?? 0;

  return (
    <DashboardView
      stats={{ waiting: n("WAITING_APPROVAL"), pending: n("PENDING"), running: n("RUNNING"), done: n("DONE"), failed: n("FAILED"), last24, maxPerDay: settings.maxPerDay }}
      logs={logs.map((l) => ({
        id: l.id, level: l.level, kind: l.kind, message: l.message,
        igId: l.post?.igId ?? null, createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
