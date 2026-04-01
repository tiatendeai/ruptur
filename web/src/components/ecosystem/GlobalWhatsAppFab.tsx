"use client";

import { usePathname } from "next/navigation";
import { buildEcosystemWhatsAppHref } from "@/lib/ecosystem";

export default function GlobalWhatsAppFab() {
  const pathname = usePathname();
  const href = buildEcosystemWhatsAppHref(pathname);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp com contexto automático da página"
      className="fixed bottom-5 right-5 z-[999] inline-flex items-center gap-2 rounded-full border border-[#25d366]/20 bg-[#25d366] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(37,211,102,0.32)] transition hover:-translate-y-0.5 hover:brightness-105"
    >
      <span className="text-base">💬</span>
      <span>Precisa de ajuda?</span>
    </a>
  );
}
