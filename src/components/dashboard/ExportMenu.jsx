// src/components/dashboard/ExportMenu.jsx
// "Export" button for a dashboard tab: Excel, PDF or CSV of that tab's data.
// Same endpoint and same columns as Sella's exports (see src/utils/exportData.js),
// so a file from the tab and a file from Sella are identical.

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { downloadExport } from "../../utils/exportData";

const OPTIONS = [
  { format: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { format: "pdf", label: "PDF", icon: FileText },
  { format: "csv", label: "CSV", icon: FileDown },
];

export default function ExportMenu({ storeId, tab, className = "" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const run = async (format) => {
    setBusy(format);
    setError("");
    try {
      await downloadExport({ storeId, tab, format, via: "tab" });
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!storeId) return null;

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        Export
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-48 rounded-xl border border-gray-200 bg-white shadow-lg p-1">
          {OPTIONS.map(({ format, label, icon: Icon }) => (
            <button
              key={format}
              type="button"
              onClick={() => run(format)}
              disabled={busy !== null}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === format ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} className="text-gray-400" />}
              {label}
            </button>
          ))}
          {error && <p className="px-3 py-1.5 text-[11px] text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
