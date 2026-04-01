import { ecosystemBranding } from "@/lib/ecosystem";

export default function GlobalFooter() {
  return (
    <footer className="border-t border-black/10 bg-[#f7f1e7]/95 px-4 py-4 text-center text-xs text-zinc-600 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-1 sm:flex-row sm:flex-wrap">
        <span>{ecosystemBranding.footer.copyrightText}</span>
        <span className="hidden sm:inline">•</span>
        <span>
          {ecosystemBranding.footer.madeWithText}{" "}
          <a
            href={ecosystemBranding.company.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#9d4e31] underline-offset-4 hover:underline"
          >
            {ecosystemBranding.company.name}
          </a>
        </span>
      </div>
    </footer>
  );
}
