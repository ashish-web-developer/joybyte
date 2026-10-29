import { Layers3, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 shadow-[0_1px_8px_rgba(15,23,42,0.03)] backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:min-h-[72px] sm:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600"
          aria-label="AssetKit home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md shadow-teal-900/15 transition-transform group-hover:-rotate-3 group-hover:scale-105">
            <Layers3 size={19} strokeWidth={2.2} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            assetkit<span className="text-teal-600">.</span>
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-3 text-xs sm:gap-6 sm:text-sm"
        >
          <a
            href="#how-it-works"
            className="rounded-lg px-2 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:px-0"
          >
            How it works
          </a>
          <Link
            href="/games/loopbreak"
            className="rounded-lg px-2 py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:px-0"
          >
            Loopbreak
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:inline-flex">
            <ShieldCheck size={14} className="text-emerald-600" aria-hidden="true" />
            No signup required
          </span>
        </nav>
      </div>
    </header>
  );
}
