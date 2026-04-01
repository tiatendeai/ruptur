"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { buildEcosystemBrowserTitle } from "@/lib/ecosystem";

export default function ResponsiveTitle() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = buildEcosystemBrowserTitle(pathname);
  }, [pathname]);

  return null;
}
