import { BookOpen } from 'lucide-react';

interface SourceFootnoteProps {
  sourceText: string;
  vintage?: string;
  onOpenSources: () => void;
}

export function SourceFootnote({
  sourceText,
  vintage = '2026 Reporting Series',
  onOpenSources,
}: SourceFootnoteProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 ws-footnote text-[11px] ws-text-muted">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
        <span className="font-medium ws-text-2">Source:</span>
        <span>{sourceText}</span>
        <span aria-hidden="true" className="opacity-50">·</span>
        <span>{vintage}</span>
      </div>
      <button
        type="button"
        onClick={onOpenSources}
        className="inline-flex items-center gap-1 text-[11px] font-medium ws-accent-link hover:underline whitespace-nowrap shrink-0 cursor-pointer"
      >
        <BookOpen className="w-3 h-3" />
        <span>Sources &amp; Methodology</span>
      </button>
    </div>
  );
}
