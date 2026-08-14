"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignOut() {
  const router = useRouter();
  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-label text-label-bold text-error transition-colors hover:bg-error-container hover:text-on-error-container"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      <span className="material-symbols-outlined text-[20px]">logout</span>
      Secure logout
    </button>
  );
}
