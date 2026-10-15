import type { PostStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import QueueView from "@/components/QueueView";

export const dynamic = "force-dynamic";
const VALID = ["WAITING_APPROVAL", "PENDING", "RUNNING", "DONE", "FAILED", "REJECTED"];

export default async function Page({ searchParams }: { searchParams: { status?: string } }) {
  const current = VALID.includes(searchParams.status ?? "") ? (searchParams.status as PostStatus) : "";
  const [groups, posts] = await Promise.all([
    prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.post.findMany({ where: current ? { status: current } : undefined, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return (
    <QueueView
      current={current}
      counts={Object.fromEntries(groups.map((g) => [g.status, g._count._all]))}
      posts={posts.map((p) => ({
        id: p.id, igId: p.igId, author: p.author, caption: p.caption, status: p.status, error: p.error,
        attempts: p.attempts, sourceUrl: p.sourceUrl,
        createdAt: p.createdAt.toISOString(), postedAt: p.postedAt?.toISOString() ?? null,
      }))}
    />
  );
}
