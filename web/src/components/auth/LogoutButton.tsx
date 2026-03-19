"use client";

import { useRouter } from "next/navigation";

import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      const supabase = getBrowserSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="rounded-full border border-black/10 bg-white/80 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-zinc-700 transition hover:bg-white"
    >
      Sair
    </button>
  );
}
