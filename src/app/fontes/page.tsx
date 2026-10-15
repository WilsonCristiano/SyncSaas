import { prisma } from "@/lib/prisma";
import SourcesView from "@/components/SourcesView";

export const dynamic = "force-dynamic";

export default async function Page() {
  const sources = await prisma.source.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { posts: true } } } });
  return (
    <SourcesView
      sources={sources.map((s) => ({
        id: s.id, username: s.username, active: s.active, lastError: s.lastError, posts: s._count.posts,
        lastScrapedAt: s.lastScrapedAt?.toISOString() ?? null,
      }))}
    />
  );
}
