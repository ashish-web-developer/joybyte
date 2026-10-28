// icons
import { Layers3, ShieldCheck } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a
          href="#"
          className="flex items-center gap-2.5"
          aria-label="AssetKit home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-200">
            <Layers3 size={19} />
          </span>
          <span className="text-lg font-bold tracking-tight">
            assetkit<span className="text-teal-600">.</span>
          </span>
        </a>
        <div className="hidden items-center gap-6 text-sm text-slate-500 sm:flex">
          <a href="#how-it-works" className="transition hover:text-slate-900">
            How it works
          </a>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">
            <ShieldCheck size={14} className="text-emerald-600" /> No signup
            required
          </span>
        </div>
      </div>
    </header>
  );
}
