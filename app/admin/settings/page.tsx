import { requireAdmin } from "@/lib/admin";
import SettingsClient from "@/components/admin/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("site_settings").select("*").maybeSingle();
  return <SettingsClient initial={(data as any) || {}} />;
}
