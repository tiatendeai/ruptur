import { NextResponse, type NextRequest } from "next/server";

const SHOWCASE_HOSTS = new Set([
  "ruptur.cloud",
  "www.ruptur.cloud",
  "web.ruptur.cloud",
  "showcase.ruptur.cloud",
  "site.ruptur.cloud",
  "lp.ruptur.cloud",
]);

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/connectome") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const pathname = url.pathname;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (host === "app.ruptur.cloud" && pathname === "/") {
    url.pathname = "/inbox";
    return NextResponse.redirect(url);
  }

  if (host === "studio.ruptur.cloud" && pathname === "/") {
    url.pathname = "/studio";
    return NextResponse.redirect(url);
  }

  if (SHOWCASE_HOSTS.has(host) && pathname === "/inbox") {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
