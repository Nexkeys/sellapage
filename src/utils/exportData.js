// src/utils/exportData.js
// Downloads a store export (CSV, Excel or PDF) from /api/export-data.
// Shared by the Export buttons on each dashboard tab and by Sella's download
// cards, so both produce the identical file.

import { auth } from "../firebase/auth";

export const EXPORT_FORMAT_LABELS = { xlsx: "Excel", pdf: "PDF", csv: "CSV" };

/**
 * @param {{storeId: string, tab: string, format: 'csv'|'xlsx'|'pdf', from?: string, to?: string, via?: 'tab'|'sella'}} opts
 * @returns {Promise<{filename: string, rows: number}>}
 */
export async function downloadExport({ storeId, tab, format, from = "", to = "", via = "tab" }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const token = await user.getIdToken();
  const res = await fetch("/api/export-data", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ storeId, tab, format, from, to, via }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Download failed. Please try again.");
  }
  const blob = await res.blob();
  const match = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "");
  const filename = match?.[1] || `${tab}.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { filename, rows: Number(res.headers.get("X-Export-Rows") || 0) };
}
