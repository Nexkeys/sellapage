// src/components/dashboard/RemindersTab.jsx
// Reminders the vendor set by asking Sella ("remind me at 2pm to check my
// products"). This tab is where they turn one off or delete it.
//
// Creation deliberately lives in Sella, not here: the whole point of the
// feature is that setting a reminder costs one sentence in conversation. What
// this tab must guarantee is the opposite direction - that a vendor is never
// dependent on the assistant to stop something the assistant started.

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Trash2, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { auth } from "../../firebase/auth";

async function callReminders(payload) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

const REPEAT_LABEL = { none: "Once", daily: "Every day", weekly: "Every week" };

export default function RemindersTab({ storeId, assistantName = "Sella" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError("");
    try {
      const d = await callReminders({ storeId, action: "list" });
      setRows(d.reminders || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (r) => {
    setBusyId(r.id);
    setError("");
    try {
      await callReminders({ storeId, action: "toggle", id: r.id, enabled: !r.enabled });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r) => {
    setBusyId(r.id);
    setError("");
    try {
      await callReminders({ storeId, action: "delete", id: r.id });
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const active = rows.filter((r) => r.nextDueAt != null);
  const done = rows.filter((r) => r.nextDueAt == null);

  const Row = ({ r }) => (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 transition-colors">
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          r.nextDueAt != null ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
        }`}
      >
        {r.nextDueAt != null ? <Bell size={17} /> : <BellOff size={17} />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 break-words">{r.message}</p>
        <p className="text-xs text-gray-500 mt-1">
          {r.dueAtLabel}
          <span className="mx-1.5 text-gray-300">|</span>
          {REPEAT_LABEL[r.repeat] || "Once"}
          {r.sentCount > 0 && (
            <>
              <span className="mx-1.5 text-gray-300">|</span>
              Sent {r.sentCount} {r.sentCount === 1 ? "time" : "times"}
            </>
          )}
        </p>
        {r.viaAi && (
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <Sparkles size={11} /> Set by {assistantName}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => toggle(r)}
          disabled={busyId === r.id}
          title={r.enabled ? "Turn off" : "Turn on"}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          {busyId === r.id ? <Loader2 size={16} className="animate-spin" /> : r.enabled ? <Bell size={16} /> : <BellOff size={16} />}
        </button>
        <button
          onClick={() => remove(r)}
          disabled={busyId === r.id}
          title="Delete"
          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-gray-900 text-xl">Reminders</h2>
          <p className="text-sm text-gray-500 mt-1">
            Ask {assistantName} to remind you about anything, for example &quot;remind me at 2pm to check my products&quot;.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 transition-colors flex-shrink-0"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading && rows.length === 0 && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 border border-dashed border-gray-300">
          <span className="w-12 h-12 rounded-2xl bg-white border border-gray-200 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Bell size={22} />
          </span>
          <p className="text-sm font-semibold text-gray-900">No reminders yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Open {assistantName} and say when you want to be reminded. It will show up here so you can turn it off any time.
          </p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active</p>
          {active.map((r) => <Row key={r.id} r={r} />)}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Finished and off</p>
          {done.map((r) => <Row key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}
