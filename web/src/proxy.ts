import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isPublicPath, isStaticAsset } from "@/lib/auth";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/config";

const SHOWCASE_HOSTS = new Set([
  "ruptur.cloud",
  "www.ruptur.cloud",
  "web.ruptur.cloud",
  "showcase.ruptur.cloud",
  "site.ruptur.cloud",
  "lp.ruptur.cloud",
]);

function copyCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie.name, cookie.value, cookie);
  }
}

async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (!isSupabaseConfigured()) {
    return { response, user: null as { id: string } | null };
  }

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const pathname = url.pathname;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const { response, user } = await refreshSession(request);

  if (host === "app.ruptur.cloud" && pathname === "/") {
    url.pathname = user ? "/inbox" : "/login";
    const redirect = NextResponse.redirect(url);
    copyCookies(response, redirect);
    return redirect;
  }

  if (host === "studio.ruptur.cloud" && pathname === "/") {
    url.pathname = "/studio";
    const redirect = NextResponse.redirect(url);
    copyCookies(response, redirect);
    return redirect;
  }

  if (SHOWCASE_HOSTS.has(host) && pathname === "/inbox") {
    url.pathname = "/";
    const redirect = NextResponse.redirect(url);
    copyCookies(response, redirect);
    return redirect;
  }

  if (pathname.startsWith("/login") && user) {
    url.pathname = "/inbox";
    const redirect = NextResponse.redirect(url);
    copyCookies(response, redirect);
    return redirect;
  }

  if (!isPublicPath(pathname) && !user) {
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    copyCookies(response, redirect);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!api).*)"],
};
