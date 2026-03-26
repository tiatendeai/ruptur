"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const MOBILE_COMPACT_MAX_WIDTH = 400;
const MOBILE_MAX_WIDTH = 767;

function getResponsiveTitle(width: number) {
  if (width <= MOBILE_COMPACT_MAX_WIDTH) {
    return "<🛟R />";
  }

  if (width <= MOBILE_MAX_WIDTH) {
    return "<🛟Rup />";
  }

  return "<🛟Ruptur />";
}

export default function ResponsiveTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const applyTitle = () => {
      document.title = getResponsiveTitle(window.innerWidth);
    };

    applyTitle();
    window.addEventListener("resize", applyTitle);
    window.addEventListener("orientationchange", applyTitle);

    return () => {
      window.removeEventListener("resize", applyTitle);
      window.removeEventListener("orientationchange", applyTitle);
    };
  }, [pathname]);

  return null;
}
