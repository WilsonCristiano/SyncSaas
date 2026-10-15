import SettingsForm from "@/components/SettingsForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSettings();
  return (
    <SettingsForm
      initial={{
        requireApproval: s.requireApproval, maxPerDay: s.maxPerDay, minHoursBetween: s.minHoursBetween,
        scrapeEveryHours: s.scrapeEveryHours, creditsEnabled: s.creditsEnabled,
        creditsTemplate: s.creditsTemplate, captionSuffix: s.captionSuffix,
      }}
    />
  );
}
