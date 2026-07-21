// src/components/dashboard/SellaAI.jsx
// Sella AI — full-context AI Business Partner.
// Renders as a MOVABLE floating action button that lives on every dashboard tab
// (mounted once in DashboardLayout). Premium only. Chat memory persists across tab
// switches and page refreshes via Firestore-backed sessions + a localStorage cursor.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles, X, Send, History, Settings2, Plus, Check, Loader2,
  ExternalLink, Trash2, Pencil, ArrowLeft, Gauge,
} from "lucide-react";
import { auth } from "../../firebase/auth";

const LS_SESSION = (sid) => `sellaai_session_${sid}`;
const LS_FABPOS = "sellaai_fabpos";

async function callSella(payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const token = await user.getIdToken();
  const res = await fetch("/api/sella-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { data, status: res.status });
  return data;
}

export default function SellaAI({ store }) {
  const storeId = store?.id;
  const isPremium = store?.hasPremiumFeatures ?? store?.plan === "premium";

  const [open, setOpen] = useState(false);
  const [view, setView] = useState("chat"); // chat | history | settings
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState(null); // { type, args } awaiting confirm
  const [confirming, setConfirming] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [usage, setUsage] = useState({ used: 0, limit: 50, remaining: 50 });
  const [assistantName, setAssistantName] = useState(store?.sellaAiName || "Sella AI");
  const [renameValue, setRenameValue] = useState(store?.sellaAiName || "Sella AI");
  const [error, setError] = useState("");

  const scrollRef = useRef(null);
  const dragState = useRef({ dragging: false, moved: false, offX: 0, offY: 0 });
  const [fabPos, setFabPos] = useState(null); // {x, y} or null (default anchored)

  // ---- restore FAB position + session cursor ----
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_FABPOS) || "null");
      if (p && typeof p.x === "number") setFabPos(p);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!storeId) return;
    const saved = localStorage.getItem(LS_SESSION(storeId));
    if (saved) setSessionId(saved);
  }, [storeId]);

  // ---- load usage + restore session transcript when opened ----
  const refreshUsage = useCallback(async () => {
    try {
      const d = await callSella({ storeId, action: "usage" });
      setUsage({ used: d.used, limit: d.limit, remaining: d.remaining });
      if (d.assistantName) { setAssistantName(d.assistantName); setRenameValue(d.assistantName); }
    } catch { /* non-blocking */ }
  }, [storeId]);

  useEffect(() => {
    if (!open || !isPremium) return;
    refreshUsage();
    if (sessionId && messages.length === 0) {
      callSella({ storeId, action: "session", sessionId })
        .then((d) => setMessages(d.messages || []))
        .catch(() => {});
    }
  }, [open, isPremium]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, pending]);

  // ---- drag handling for the FAB ----
  const onPointerDown = (e) => {
    if (open) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      dragging: true, moved: false,
      offX: e.clientX - rect.left, offY: e.clientY - rect.top,
    };
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const ds = dragState.current;
    if (!ds.dragging) return;
    ds.moved = true;
    const size = 56;
    let x = e.clientX - ds.offX;
    let y = e.clientY - ds.offY;
    x = Math.max(8, Math.min(window.innerWidth - size - 8, x));
    y = Math.max(8, Math.min(window.innerHeight - size - 8, y));
    setFabPos({ x, y });
  };
  const onPointerUp = (e) => {
    const ds = dragState.current;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (ds.dragging && ds.moved && fabPos) {
      localStorage.setItem(LS_FABPOS, JSON.stringify(fabPos));
    }
    if (ds.dragging && !ds.moved) setOpen(true); // a tap, not a drag
    dragState.current.dragging = false;
  };

  // ---- send a message ----
  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError("");
    const sid = sessionId || Date.now().toString();
    if (!sessionId) { setSessionId(sid); localStorage.setItem(LS_SESSION(storeId), sid); }

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setPending(null);
    setSending(true);
    try {
      const d = await callSella({ storeId, action: "send", message: text, sessionId: sid });
      setMessages((m) => [...m, {
        role: "assistant", content: d.reply,
        ...(d.sources?.length ? { sources: d.sources } : {}),
        ...(d.pendingAction ? { pendingAction: d.pendingAction } : {}),
      }]);
      if (d.pendingAction) setPending({ ...d.pendingAction, sessionId: sid });
      if (d.usage) setUsage(d.usage);
    } catch (err) {
      if (err.status === 429) {
        setError(err.data?.error || "Daily limit reached.");
        if (err.data?.limit) setUsage({ used: err.data.used, limit: err.data.limit, remaining: 0 });
      } else {
        setError(err.data?.error || err.message || "Something went wrong.");
      }
    } finally {
      setSending(false);
    }
  };

  // ---- confirm / cancel a pending write ----
  const confirmAction = async () => {
    if (!pending || confirming) return;
    setConfirming(true);
    try {
      const d = await callSella({
        storeId, action: "confirm", pendingAction: { type: pending.type, args: pending.args }, sessionId: pending.sessionId,
      });
      setMessages((m) => [...m, { role: "assistant", content: d.result?.message || "Done.", kind: "action-result", ok: d.result?.ok }]);
      setPending(null);
    } catch (err) {
      setError(err.data?.error || "Could not complete that action.");
    } finally {
      setConfirming(false);
    }
  };
  const cancelAction = () => {
    setMessages((m) => [...m, { role: "assistant", content: "No problem — I won't make that change.", kind: "action-result", ok: false }]);
    setPending(null);
  };

  // ---- sessions / history ----
  const openHistory = async () => {
    setView("history");
    try { const d = await callSella({ storeId, action: "sessions" }); setSessions(d.sessions || []); }
    catch { setSessions([]); }
  };
  const loadSession = async (sid) => {
    setSessionId(sid);
    localStorage.setItem(LS_SESSION(storeId), sid);
    setPending(null);
    try { const d = await callSella({ storeId, action: "session", sessionId: sid }); setMessages(d.messages || []); }
    catch { setMessages([]); }
    setView("chat");
  };
  const deleteSession = async (sid) => {
    try { await callSella({ storeId, action: "delete-session", sessionId: sid }); } catch { /* */ }
    setSessions((s) => s.filter((x) => x.id !== sid));
    if (sid === sessionId) newChat();
  };
  const newChat = () => {
    const sid = Date.now().toString();
    setSessionId(sid);
    localStorage.setItem(LS_SESSION(storeId), sid);
    setMessages([]);
    setPending(null);
    setView("chat");
  };

  const saveName = async () => {
    const name = renameValue.trim().slice(0, 40) || "Sella AI";
    try { const d = await callSella({ storeId, action: "rename", name }); setAssistantName(d.assistantName); }
    catch { /* */ }
  };

  const pct = useMemo(() => Math.min(100, Math.round((usage.used / usage.limit) * 100)), [usage]);

  if (!isPremium || !storeId) return null;

  const fabStyle = fabPos
    ? { left: fabPos.x, top: fabPos.y, right: "auto", bottom: "auto" }
    : { right: 20, bottom: 20 };

  return (
    <>
      {/* Floating action button (movable) */}
      {!open && (
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={fabStyle}
          className="fixed z-[60] w-14 h-14 rounded-2xl bg-green-500 hover:bg-green-400 text-white shadow-xl shadow-green-500/30 flex items-center justify-center touch-none transition-colors active:scale-95"
          title={`Ask ${assistantName}`}
          aria-label={`Open ${assistantName}`}
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 z-[70] sm:inset-auto sm:right-5 sm:bottom-5 flex sm:block items-end justify-center">
          {/* mobile backdrop */}
          <div className="absolute inset-0 bg-black/40 sm:hidden" onClick={() => setOpen(false)} />

          <div className="relative w-full sm:w-[400px] h-[85vh] sm:h-[600px] max-h-[85vh] bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-950 text-white flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {view !== "chat" && (
                  <button onClick={() => setView("chat")} className="p-1 -ml-1 rounded-lg hover:bg-white/10">
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight truncate">{assistantName}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    {view === "settings" ? "Settings" : view === "history" ? "Chat history" : "Your AI Business Partner"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={newChat} title="New chat" className="p-1.5 rounded-lg hover:bg-white/10"><Plus size={16} /></button>
                <button onClick={openHistory} title="History" className="p-1.5 rounded-lg hover:bg-white/10"><History size={16} /></button>
                <button onClick={() => setView("settings")} title="Settings" className="p-1.5 rounded-lg hover:bg-white/10"><Settings2 size={16} /></button>
                <button onClick={() => setOpen(false)} title="Close" className="p-1.5 rounded-lg hover:bg-white/10"><X size={16} /></button>
              </div>
            </div>

            {/* Usage strip */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
              <Gauge size={13} className="text-gray-400" />
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 tabular-nums">{usage.remaining}/{usage.limit} left today</span>
            </div>

            {/* Body */}
            {view === "chat" && (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center px-6 py-8">
                      <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                        <Sparkles size={22} className="text-green-500" />
                      </div>
                      <p className="text-sm font-bold text-gray-800">Hi, I'm {assistantName} 👋</p>
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                        I can see your whole store — orders, products, ledger, customers and more.
                        Ask me anything, or tell me to log a sale, add a product, or run the numbers.
                      </p>
                      <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                        {["How are sales this week?", "What's my best seller?", "Log a ₦5,000 sale"].map((s) => (
                          <button key={s} onClick={() => setInput(s)} className="text-[11px] px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors">{s}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                        m.role === "user"
                          ? "bg-green-500 text-white rounded-br-md"
                          : m.kind === "action-result"
                            ? (m.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-gray-100 text-gray-600")
                            : "bg-gray-100 text-gray-800 rounded-bl-md"
                      }`}>
                        {m.kind === "action-result" && m.ok && <Check size={13} className="inline mr-1 -mt-0.5" />}
                        {m.content}
                        {m.sources?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {m.sources.map((s, j) => (
                              <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/70 text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-700">
                                <ExternalLink size={9} /> {(s.title || s.url).slice(0, 28)}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending write confirmation */}
                  {pending && (
                    <div className="mx-1 rounded-2xl border-2 border-green-200 bg-green-50/60 p-3">
                      <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide mb-1">Confirm this change</p>
                      <p className="text-[13px] text-gray-700 mb-3">{describePending(pending)}</p>
                      <div className="flex gap-2">
                        <button onClick={confirmAction} disabled={confirming} className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-400 disabled:bg-green-300 text-white text-xs font-bold flex items-center justify-center gap-1">
                          {confirming ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Confirm
                        </button>
                        <button onClick={cancelAction} disabled={confirming} className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  )}

                  {error && <div className="mx-1 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-600">{error}</div>}
                </div>

                {/* Composer */}
                <div className="px-3 py-3 border-t border-gray-100 flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      rows={1}
                      placeholder={`Message ${assistantName}...`}
                      className="flex-1 resize-none max-h-28 px-3.5 py-2.5 rounded-2xl bg-gray-100 text-[13px] text-gray-800 outline-none focus:ring-2 focus:ring-green-400/40 placeholder:text-gray-400"
                    />
                    <button onClick={send} disabled={!input.trim() || sending} className="w-10 h-10 rounded-2xl bg-green-500 hover:bg-green-400 disabled:bg-gray-200 disabled:text-gray-400 text-white flex items-center justify-center flex-shrink-0 transition-colors">
                      <Send size={17} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* History view */}
            {view === "history" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {sessions.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No previous chats yet.</p>}
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 group">
                    <button onClick={() => loadSession(s.id)} className={`flex-1 text-left px-3 py-2.5 rounded-xl text-[13px] transition-colors truncate ${s.id === sessionId ? "bg-green-50 text-green-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                      {s.title || "Chat"}
                    </button>
                    <button onClick={() => deleteSession(s.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Settings view */}
            {view === "settings" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Assistant name</label>
                  <div className="flex gap-2 mt-1.5">
                    <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={40} className="flex-1 px-3 py-2 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-green-400/40" placeholder="Sella AI" />
                    <button onClick={saveName} className="px-3 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white text-xs font-bold flex items-center gap-1"><Pencil size={12} /> Save</button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Give your AI partner a name your team will recognise.</p>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Daily usage</span>
                    <span className="text-xs font-bold text-gray-700">{usage.used} / {usage.limit}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    You have <span className="font-semibold text-gray-600">{usage.remaining}</span> requests left today.
                    Your limit resets at midnight (WAT). Confirming an action does not use a request.
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50/60 border border-green-100 p-4">
                  <p className="text-[12px] text-gray-600 leading-relaxed">
                    <span className="font-bold text-green-700">{assistantName}</span> can read your entire dashboard and make changes on your request —
                    but it always asks you to confirm before saving anything.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Client-side mirror of the server's describeAction (kept simple).
function describePending(p) {
  const a = p?.args || {};
  const money = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;
  switch (p?.type) {
    case "add_ledger_entry": return `Log a ${money(a.amount)} sale to ${a.customerName} (${a.itemName}) in your Ledger.`;
    case "add_product": return `Add product "${a.name}" priced ${money(a.price)}.`;
    case "add_service": return `Add service "${a.name}" priced ${money(a.price)}.`;
    case "create_discount": return `Create promo code ${String(a.code || "").toUpperCase()} (${a.type === "flat" ? money(a.value) + " off" : a.value + "% off"}).`;
    case "update_order_status": return `Change order ${a.orderId} status to "${a.newStatus}".`;
    case "update_delivery_pickup": return `Update pickup address to ${[a.streetAddress, a.city, a.state].filter(Boolean).join(", ")}.`;
    case "update_store_settings": return `Update store settings: ${Object.keys(a).join(", ")}.`;
    default: return "Make the requested change to your store.";
  }
}
