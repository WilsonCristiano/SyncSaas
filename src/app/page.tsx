import { prisma } from "@/lib/prisma";
import DashboardView from "@/components/DashboardView";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [groups, logs] = await Promise.all([
    prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.log.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { post: { select: { igId: true } } },
    }),
  ]);
  const n = (s: string) => groups.find((g) => g.status === s)?._count._all ?? 0;

  return (
    <DashboardView
      stats={{ pending: n("PENDING"), running: n("RUNNING"), done: n("DONE"), failed: n("FAILED") }}
      logs={logs.map((l) => ({
        id: l.id,
        level: l.level,
        message: l.message,
        igId: l.post?.igId ?? null,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
