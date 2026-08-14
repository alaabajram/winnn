import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Gate every admin page. Returns the signed-in admin's user row. */
export async function requireAdmin() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth || !auth.user) redirect("/login?next=/admin");

  const { data: row } = await sb.from("admins").select("id,role").maybeSingle();
  if (!row) redirect("/admin/denied");
  return { sb, user: auth.user, admin: row as any };
}
