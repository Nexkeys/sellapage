// src/components/dashboard/sella/ReviewCards.jsx
// The cards Sella shows before and during bulk work:
//   ImportReview - every row from a file, editable, untickable, before adding
//   BulkReview   - every item's current and new value, before a bulk edit
//   JobCard      - live progress of a background import
// The server re-validates everything these send back, so they exist for the
// vendor's benefit, not as a trust boundary.

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

const naira = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;

function Buttons({ label, disabled, confirming, onConfirm, onCancel }) {
  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={onConfirm}
        disabled={confirming || disabled}
        className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
      >
        {confirming ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />} {label}
      </button>
      <button onClick={onCancel} disabled={confirming} className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors">
        Cancel
      </button>
    </div>
  );
}

const TARGET_FIELDS = {
  products: [["name", "Name"], ["price", "Price"], ["stock", "Stock"]],
  services: [["name", "Name"], ["price", "Price"], ["duration", "Duration"]],
  ledger: [["customerName", "Customer"], ["itemName", "Item"], ["amount", "Amount"]],
};

export function ImportReview({ pending, confirming, onConfirm, onCancel }) {
  const target = pending.args.target;
  const fields = TARGET_FIELDS[target] || TARGET_FIELDS.products;
  const [rows, setRows] = useState(() => pending.args.rows.map((r, i) => ({ ...r, _key: i, _on: true })));
  const [writeDescriptions, setWriteDescriptions] = useState(pending.args.writeDescriptions !== false);
  const [showAll, setShowAll] = useState(false);
  const chosen = rows.filter((r) => r._on);
  const visible = showAll ? rows : rows.slice(0, 30);
  const edit = (key, field, value) => setRows((rs) => rs.map((r) => (r._key === key ? { ...r, [field]: value } : r)));

  return (
    <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4">
      <p className="text-[10.5px] font-bold text-green-700 uppercase tracking-wider mb-1">Review before adding</p>
      <p className="text-[13px] text-gray-800 leading-relaxed">{pending.summary}</p>
      {(pending.args.rejectedCount > 0 || pending.args.overLimit > 0) && (
        <p className="text-[11.5px] text-amber-700 mt-1.5 leading-relaxed">
          {pending.args.rejectedCount > 0 && <>{pending.args.rejectedCount} row{pending.args.rejectedCount === 1 ? " was" : "s were"} left out ({pending.args.rejected?.[0]?.reason || "missing details"}). </>}
          {pending.args.overLimit > 0 && <>Only the first 500 rows can be added at once.</>}
        </p>
      )}
      <div className="mt-3 rounded-xl border border-gray-200 bg-white max-h-72 overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-2 py-2 w-8">
                <input type="checkbox" checked={chosen.length === rows.length} onChange={(e) => setRows((rs) => rs.map((r) => ({ ...r, _on: e.target.checked })))} aria-label="Select all" className="accent-green-600" />
              </th>
              {fields.map(([, label]) => <th key={label} className="px-1.5 py-2 text-left font-semibold">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r._key} className={`border-t border-gray-100 ${r._on ? "" : "opacity-40"}`}>
                <td className="px-2 py-1 text-center">
                  <input type="checkbox" checked={r._on} onChange={(e) => edit(r._key, "_on", e.target.checked)} aria-label="Include row" className="accent-green-600" />
                </td>
                {fields.map(([f]) => (
                  <td key={f} className="px-1 py-0.5">
                    <input
                      value={r[f] ?? ""}
                      onChange={(e) => edit(r._key, f, e.target.value)}
                      className={`w-full bg-transparent rounded px-1.5 py-1 text-gray-800 outline-none focus:bg-green-50 ${["price", "amount", "stock"].includes(f) ? "min-w-[4.5rem]" : "min-w-[7rem]"}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 30 && !showAll && (
        <button onClick={() => setShowAll(true)} className="mt-1.5 text-[11.5px] font-semibold text-green-700 hover:underline">Show all {rows.length} rows</button>
      )}
      {rows.some((r) => r.imageUrl) && <p className="text-[11.5px] text-gray-500 mt-1.5">Photos you sent will be attached to their items.</p>}
      {target !== "ledger" && (
        <label className="flex items-center gap-2 mt-3 text-[12.5px] text-gray-700 cursor-pointer">
          <input type="checkbox" checked={writeDescriptions} onChange={(e) => setWriteDescriptions(e.target.checked)} className="accent-green-600" />
          Write descriptions for items that have none
        </label>
      )}
      <Buttons
        label={`Add ${chosen.length}`}
        disabled={!chosen.length}
        confirming={confirming}
        onCancel={onCancel}
        onConfirm={() => onConfirm({
          ...pending.args,
          rows: chosen.map((r) => {
            const { _key, _on, ...rest } = r;
            return rest;
          }),
          writeDescriptions,
        })}
      />
    </div>
  );
}

const show = (field, v) => {
  if (field === "isActive") return v === true || v === "true" ? "Visible" : "Hidden";
  if (field === "price") return naira(v);
  return String(v ?? "");
};

export function BulkReview({ pending, confirming, onConfirm, onCancel }) {
  const { field } = pending.args;
  const editable = field !== "isActive";
  const [rows, setRows] = useState(() => pending.args.rows.map((r) => ({ ...r, _on: true })));
  const chosen = rows.filter((r) => r._on);
  const set = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4">
      <p className="text-[10.5px] font-bold text-green-700 uppercase tracking-wider mb-1">Review this change</p>
      <p className="text-[13px] text-gray-800 leading-relaxed">{pending.summary}</p>
      {pending.args.overLimit > 0 && <p className="text-[11.5px] text-amber-700 mt-1.5">Only the first 500 matching items are included.</p>}
      <div className="mt-3 rounded-xl border border-gray-200 bg-white max-h-72 overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-2 py-2 w-8">
                <input type="checkbox" checked={chosen.length === rows.length} onChange={(e) => setRows((rs) => rs.map((r) => ({ ...r, _on: e.target.checked })))} aria-label="Select all" className="accent-green-600" />
              </th>
              <th className="px-1.5 py-2 text-left font-semibold">Item</th>
              <th className="px-1.5 py-2 text-left font-semibold">Now</th>
              <th className="px-1.5 py-2 text-left font-semibold">New</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-gray-100 ${r._on ? "" : "opacity-40"}`}>
                <td className="px-2 py-1 text-center">
                  <input type="checkbox" checked={r._on} onChange={(e) => set(r.id, { _on: e.target.checked })} aria-label="Include item" className="accent-green-600" />
                </td>
                <td className="px-1.5 py-1 text-gray-800 max-w-[12rem] truncate">{r.name}</td>
                <td className="px-1.5 py-1 text-gray-400 line-through whitespace-nowrap">{show(field, r.from)}</td>
                <td className="px-1 py-0.5">
                  {editable ? (
                    <input value={r.to ?? ""} onChange={(e) => set(r.id, { to: e.target.value })} className="w-full min-w-[5rem] bg-transparent rounded px-1.5 py-1 font-semibold text-green-700 outline-none focus:bg-green-50" />
                  ) : (
                    <span className="px-1.5 font-semibold text-green-700">{show(field, r.to)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Buttons
        label={`Update ${chosen.length}`}
        disabled={!chosen.length}
        confirming={confirming}
        onCancel={onCancel}
        onConfirm={() => onConfirm({ ...pending.args, rows: chosen.map(({ id, name, from, to }) => ({ id, name, from, to })) })}
      />
    </div>
  );
}

export function JobCard({ job }) {
  const total = job?.total || 0;
  const done = job?.done || 0;
  const finished = job?.status === "done";
  const pct = finished ? 100 : total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[12.5px] font-semibold text-gray-800 inline-flex items-center gap-1.5">
          {finished ? <Check size={14} className="text-green-600" /> : <Loader2 size={14} className="animate-spin text-green-600" />}
          {finished ? "Import finished" : job ? `Adding ${done} of ${total}` : "Starting…"}
        </p>
        <span className="text-[11px] text-gray-400 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {finished && job.message && <p className="text-[12.5px] text-gray-600 mt-2 leading-relaxed">{job.message}</p>}
      {!finished && <p className="text-[11px] text-gray-400 mt-2">You can close this. It keeps going, and you will get a notification when it is done.</p>}
    </div>
  );
}
