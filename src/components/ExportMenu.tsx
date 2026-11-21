import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportMenuProps {
  scopeLabel: string;
  onExportCsv: () => void;
  onExportPdf: () => void;
}

export function ExportMenu({ scopeLabel, onExportCsv, onExportPdf }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold ws-btn-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export Data</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Export options"
          className="absolute right-0 mt-2 w-64 ws-popover py-1.5 z-50"
        >
          <div className="px-3.5 py-2 border-b ws-border">
            <p className="text-[11px] font-medium ws-text-muted">Active Scope</p>
            <p className="text-xs font-medium ws-text truncate mt-0.5">{scopeLabel}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onExportCsv();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs ws-text-2 ws-row-hover transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 ws-positive shrink-0" />
            <div>
              <p className="font-medium ws-text">Download CSV</p>
              <p className="text-[11px] ws-text-muted">Spreadsheet-ready tabular data</p>
            </div>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onExportPdf();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs ws-text-2 ws-row-hover transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 ws-accent shrink-0" />
            <div>
              <p className="font-medium ws-text">Download PDF Report</p>
              <p className="text-[11px] ws-text-muted">Formatted briefing with tables</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
