import { prisma } from "./prisma";

export const DEFAULT_SETTINGS = {
  requireApproval: false,
  maxPerDay: 3,
  minHoursBetween: 4,
  scrapeEveryHours: 6,
  creditsEnabled: true,
  creditsTemplate: "Créditos: @{author}",
  captionSuffix: "",
};

export async function getSettings() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}
