// src/components/dashboard/sella/BillingPanel.jsx
// Sella billing (owner only): balance, the three credit packs, this month's
// usage, and the purchase history with downloadable receipts.
//
// Buying sends the vendor to Paystack. When they come back, the dashboard URL
// carries ?sellaCredits=1&reference=...; SellaAI opens this panel with that
// reference and it is VERIFIED here with the server (which asks Paystack),
// so the vendor sees exactly what happened: added, still processing, declined
// with the bank's reason, or not completed. The Paystack webhook adds the
// credits too, so closing the tab never loses them.

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Download, Loader2, Check, AlertTriangle, Clock, Receipt, FileSpreadsheet, RefreshCw } from "lucide-react";
import { auth } from "../../../firebase/auth";

const naira = (n) => `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
const fmt = (n) => Math.floor(Number(n || 0)).toLocaleString("en-NG");
const day = (ms) => (ms ? new Date(ms).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : "");

const KIND_LABELS = {
  chat: "Chat", deep: "Deeper Research", files: "Files and photos", image: "Images", video: "Videos",
  voice: "Voice input", speech: "Read aloud", import: "Import descriptions",
};

async function api(payload, { raw = false } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const token = await user.getIdToken();
  const res = await fetch("/api/sella-credits", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (raw) {
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Download failed."); }
    return res;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong."), { data, status: res.status });
  return data;
}

async function saveResponse(res, fallbackName) {
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const STATUS = {
  paid: { label: "Paid", cls: "bg-green-50 text-green-700 ring-green-200" },
  pending: { label: "Not completed", cls: "bg-gray-50 text-gray-500 ring-gray-200" },
  failed: { label: "Failed", cls: "bg-red-50 text-red-700 ring-red-200" },
  abandoned: { label: "Not completed", cls: "bg-gray-50 text-gray-500 ring-gray-200" },
  rejected: { label: "Under review", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
};

export function BillingPanel({ storeId, assistantName, returnReference, onReturnHandled, onCredits }) {
  const [packs, setPacks] = useState([]);
  const [canBuy, setCanBuy] = useState(false);
  const [credits, setCredits] = useState(null);
  const [purchases, setPurchases] = useState(null);
  const [buying, setBuying] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState(null); // { status, message }
  const polling = useRef(false);

  const load = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([api({ storeId, action: "packs" }), api({ storeId, action: "history" })]);
      setPacks(p.packs || []);
      setCanBuy(p.canBuy === true);
      setCredits(h.credits || p.credits || null);
      setPurchases(h.purchases || []);
      if (h.credits) onCredits?.(h.credits);
    } catch (e) {
      setError(e.message);
      setPurchases([]);
    }
  }, [storeId, onCredits]);

  useEffect(() => { load(); }, [load]);

  // Returning from Paystack: confirm with the server, and keep checking while
  // the bank is still processing (up to about two minutes).
  useEffect(() => {
    if (!returnReference || polling.current) return;
    polling.current = true;
    let live = true;
    (async () => {
      setOutcome({ status: "checking", message: "Confirming your payment with Paystack…" });
      for (let i = 0; i < 24 && live; i++) {
        let r;
        try { r = await api({ storeId, action: "verify", reference: returnReference }); }
        catch (e) { r = { status: "pending", message: e.message }; }
        if (!live) return;
        setOutcome({ status: r.status, message: r.message });
        if (r.credits) { setCredits(r.credits); onCredits?.(r.credits); }
        if (!["processing", "pending"].includes(r.status)) break;
        await new Promise((res) => setTimeout(res, 5000));
      }
      if (live) { load(); onReturnHandled?.(); }
    })();
    return () => { live = false; };
  }, [returnReference, storeId, load, onReturnHandled, onCredits]);

  const buy = async (packId) => {
    setBuying(packId);
    setError("");
    try {
      const d = await api({ storeId, action: "buy", packId });
      window.location.assign(d.authorizationUrl);
    } catch (e) {
      setError(e.message);
      setBuying(null);
    }
  };

  const download = async (key, payload, fallback) => {
    setDownloading(key);
    setError("");
    try { await saveResponse(await api(payload, { raw: true }), fallback); }
    catch (e) { setError(e.message); }
    finally { setDownloading(null); }
  };

  const byKind = Object.entries(credits?.byKind || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const kindTotal = byKind.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><CreditCard size={19} /></span>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Billing and credits</h2>
            <p className="text-[13px] text-gray-500">Buy extra credits for {assistantName}, and download your receipts.</p>
          </div>
        </div>

        {outcome && (
          <div className={`rounded-2xl border px-4 py-3.5 text-[13.5px] leading-relaxed flex gap-3 ${
            outcome.status === "paid" ? "bg-green-50 border-green-200 text-green-800"
              : ["failed", "rejected"].includes(outcome.status) ? "bg-red-50 border-red-200 text-red-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            {outcome.status === "paid" ? <Check size={18} className="flex-shrink-0 mt-0.5" />
              : ["failed", "rejected"].includes(outcome.status) ? <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                : outcome.status === "checking" ? <Loader2 size={18} className="flex-shrink-0 mt-0.5 animate-spin" />
                  : <Clock size={18} className="flex-shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold">
                {outcome.status === "paid" ? "Payment successful" : outcome.status === "failed" ? "Payment failed"
                  : outcome.status === "abandoned" ? "Payment not completed" : outcome.status === "rejected" ? "Payment needs review" : "Checking your payment"}
              </p>
              <p className="mt-0.5">{outcome.message}</p>
            </div>
          </div>
        )}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-[13px] text-red-700">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Credits left</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{credits ? fmt(credits.remaining) : "…"}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Monthly included</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{credits ? fmt(credits.includedLeft) : "…"}</p>
            <p className="text-[11.5px] text-gray-500 mt-0.5">of {credits ? fmt(credits.included) : "…"}, resets {credits?.resetsAt ? day(new Date(credits.resetsAt).getTime()) : ""}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bought credits</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{credits ? fmt(credits.topup) : "…"}</p>
            {credits?.topupNextExpiry && <p className="text-[11.5px] text-gray-500 mt-0.5">{fmt(credits.topupNextExpiry.credits)} expire {day(new Date(credits.topupNextExpiry.at).getTime())}</p>}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Buy credits</p>
          {!canBuy && packs.length > 0 && (
            <p className="mb-2 text-[12.5px] text-amber-700">Credit packs are available on the Premium plan.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {packs.map((p) => (
              <div key={p.packId} className={`rounded-2xl border bg-white p-4 flex flex-col ${p.packId === "plus" ? "border-green-400 ring-1 ring-green-200" : "border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold text-gray-900">{p.name}</p>
                  {p.packId === "plus" && <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 rounded-md px-1.5 py-0.5">Best value</span>}
                </div>
                <p className="text-[26px] font-bold text-gray-900 mt-1 tabular-nums">{fmt(p.credits)} <span className="text-[13px] font-semibold text-gray-500">credits</span></p>
                <p className="text-[12px] text-gray-500">{naira(p.perCredit)} per credit</p>
                <dl className="mt-3 space-y-1 text-[12px] text-gray-600">
                  <div className="flex justify-between"><dt>Credits</dt><dd className="tabular-nums">{naira(p.price)}</dd></div>
                  <div className="flex justify-between"><dt>VAT (7.5%)</dt><dd className="tabular-nums">{naira(p.vat)}</dd></div>
                  <div className="flex justify-between"><dt>Paystack processing</dt><dd className="tabular-nums">{naira(p.processing)}</dd></div>
                  <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold text-gray-900"><dt>Total</dt><dd className="tabular-nums">{naira(p.total)}</dd></div>
                </dl>
                <button
                  onClick={() => buy(p.packId)}
                  disabled={!canBuy || buying !== null}
                  className="mt-4 w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5"
                >
                  {buying === p.packId ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} Buy for {naira(p.total)}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-gray-500 mt-2.5 leading-relaxed">
            Paid securely with Paystack. Bought credits last 12 months and are used after your monthly included credits run out.
            Credits are non-refundable.
          </p>
        </div>

        {byKind.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Used this month</p>
            <div className="space-y-2">
              {byKind.map(([k, v]) => (
                <div key={k} className="text-[12.5px]">
                  <div className="flex justify-between text-gray-700"><span>{KIND_LABELS[k] || k}</span><span className="tabular-nums">{fmt(v)} credits</span></div>
                  <div className="h-1.5 mt-1 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.max((v / kindTotal) * 100, 2)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Receipt size={12} /> Billing history</p>
            <div className="flex items-center gap-1">
              <button onClick={load} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Refresh" title="Refresh"><RefreshCw size={14} /></button>
              <button
                onClick={() => download("csv", { storeId, action: "export" }, "sella-credit-purchases.csv")}
                disabled={!purchases?.length || downloading !== null}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                {downloading === "csv" ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Download all
              </button>
            </div>
          </div>
          {purchases === null ? (
            <div className="py-10 flex justify-center text-gray-400"><Loader2 size={18} className="animate-spin" /></div>
          ) : purchases.length === 0 ? (
            <p className="px-4 pb-6 text-[13px] text-gray-400">No credit purchases yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {purchases.map((p) => {
                const st = STATUS[p.status] || STATUS.pending;
                return (
                  <li key={p.reference} className="px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900">{fmt(p.credits)} credits <span className="font-normal text-gray-500">({p.packName})</span></p>
                      <p className="text-[11.5px] text-gray-500">
                        {day(p.paidAt || p.createdAt)} | {naira(p.total)}
                        {p.status === "paid" && p.expiresAt ? ` | valid until ${day(p.expiresAt)}` : ""}
                        {p.status === "failed" && p.failureReason ? ` | ${p.failureReason}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10.5px] font-bold rounded-md px-1.5 py-0.5 ring-1 ${st.cls}`}>{st.label}</span>
                    {p.status === "paid" && (
                      <button
                        onClick={() => download(p.reference, { storeId, action: "receipt", reference: p.reference }, "sella-receipt.pdf")}
                        disabled={downloading !== null}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 text-[12px] font-semibold hover:bg-green-100 disabled:opacity-50"
                      >
                        {downloading === p.reference ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Receipt
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
