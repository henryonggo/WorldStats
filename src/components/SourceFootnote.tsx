import { BookOpen } from 'lucide-react';

interface SourceFootnoteProps {
  sourceText: string;
  vintage?: string;
  onOpenSources: () => void;
}

export function SourceFootnote({
  sourceText,
  vintage = '2024–2025 Curated Baseline',
  onOpenSources,
}: SourceFootnoteProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-[#0C1220] border-t border-slate-800/80 text-[11px] text-slate-400">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
        <span className="font-medium text-slate-300">Source:</span>
        <span>{sourceText}</span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="text-slate-500">{vintage}</span>
      </div>
      <button
        type="button"
        onClick={onOpenSources}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
      >
        <BookOpen className="w-3 h-3" />
        <span>Sources &amp; Methodology</span>
      </button>
    </div>
  );
}
