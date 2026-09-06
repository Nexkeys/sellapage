// src/components/dashboard/SellaAI.jsx
// Sella AI - full-context AI Business Partner.
// Renders as a MOVABLE floating action button that lives on every dashboard tab
// (mounted once in DashboardLayout). Premium only. Chat memory persists across tab
// switches and page refreshes via Firestore-backed sessions + a localStorage cursor.
//
// Design: a dark, premium, brand-green AI console - deliberately NOT a white support
// widget. Every rendered control is functional; there are no placeholder buttons.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles, X, Send, History, Settings2, Plus, Check, Loader2,
  ExternalLink, Trash2, Pencil, ArrowLeft, TrendingUp, Star, Globe, Receipt, ImagePlus,
} from "lucide-react";
import { auth } from "../../firebase/auth";
import { uploadSingleImage } from "../../firebase/products";
import { clampFabPosition, FAB_SIZE } from '../../utils/fabPosition';

const LS_SESSION = (sid) => `sellaai_session_${sid}`;
const LS_FABPOS = "sellaai_fabpos";

const CAPABILITIES = [
  { icon: TrendingUp, label: "Sales this week", sub: "Read the numbers", prompt: "How are my sales doing this week?" },
  { icon: Star, label: "Best seller", sub: "Spot the winners", prompt: "What's my best-selling item right now?" },
  { icon: Globe, label: "Market research", sub: "Live web pricing", prompt: "What's a good market price for my products in Nigeria right now?" },
  { icon: Receipt, label: "Log a sale", sub: "I'll ask to confirm", prompt: "Log a ₦5,000 sale" },
];

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
      // Clamped on restore: a position saved on a wide desktop would otherwise
      // put this button far off the right edge of a phone screen.
      if (p && typeof p.x === "number") setFabPos(clampFabPosition(p));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const onResize = () => setFabPos((prev) => (prev ? clampFabPosition(prev) : prev));
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
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
    const size = FAB_SIZE;
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

  // Update the last (assistant) message immutably.
  const patchLast = (patch) => setMessages((m) => {
    const copy = [...m];
    for (let i = copy.length - 1; i >= 0; i--) {
      if (copy[i].role === "assistant") { copy[i] = typeof patch === "function" ? patch(copy[i]) : { ...copy[i], ...patch }; break; }
    }
    return copy;
  });
  const dropStreamingPlaceholder = () =>
    setMessages((m) => m.filter((x, i) => !(i === m.length - 1 && x.streaming && !x.content)));

  // ---- send a message (streamed via SSE; optional override lets capability cards fire a prompt) ----
  const send = async (override) => {
    const text = String(override ?? input).trim();
    if (!text || sending) return;
    setError("");
    const sid = sessionId || Date.now().toString();
    if (!sessionId) { setSessionId(sid); localStorage.setItem(LS_SESSION(storeId), sid); }

    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setPending(null);
    setSending(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again.");
      const token = await user.getIdToken();
      const res = await fetch("/api/sella-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeId, action: "send", message: text, sessionId: sid }),
      });

      // Non-stream error (auth / quota / premium) comes back as JSON.
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        dropStreamingPlaceholder();
        if (res.status === 429) {
          setError(data.error || "Daily limit reached.");
          if (data.limit) setUsage({ used: data.used, limit: data.limit, remaining: 0 });
        } else {
          setError(data.error || "Something went wrong.");
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          let event = "message", dataStr = "";
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;
          let data; try { data = JSON.parse(dataStr); } catch { continue; }
          if (event === "token") {
            patchLast((last) => ({ ...last, content: (last.content || "") + (data.t || "") }));
          } else if (event === "sources") {
            patchLast({ sources: data.sources });
          } else if (event === "pending") {
            setPending({ ...data.pendingAction, sessionId: sid });
            patchLast({ pendingAction: data.pendingAction });
          } else if (event === "usage") {
            setUsage(data);
          } else if (event === "error") {
            streamError = data.error || "Something went wrong.";
          }
        }
      }

      if (streamError) { dropStreamingPlaceholder(); setError(streamError); }
      else patchLast({ streaming: false });
    } catch (err) {
      dropStreamingPlaceholder();
      setError(err.message || "Something went wrong.");
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
      setMessages((m) => [...m, {
        role: "assistant", content: d.result?.message || "Done.", kind: "action-result", ok: d.result?.ok,
        ...(d.result?.imageTarget ? { imageTarget: d.result.imageTarget } : {}),
      }]);
      setPending(null);
    } catch (err) {
      setError(err.data?.error || "Could not complete that action.");
    } finally {
      setConfirming(false);
    }
  };

  // ---- upload an image for an AI-created product/service, straight into its doc ----
  const [uploadingFor, setUploadingFor] = useState(null); // message index being uploaded
  const uploadImageFor = async (msgIndex, target, file) => {
    if (!file || uploadingFor !== null) return;
    setUploadingFor(msgIndex);
    setError("");
    try {
      const folder = target.collection === "services" ? "sellapage/services" : "sellapage/products";
      const url = await uploadSingleImage(file, folder);
      await callSella({ storeId, action: "attach-image", target: { collection: target.collection, id: target.id }, imageUrl: url });
      setMessages((m) => m.map((x, i) => (i === msgIndex ? { ...x, imageUploaded: url, imageTarget: undefined } : x)));
    } catch (err) {
      setError(err?.data?.error || err?.message || "Image upload failed. Try again.");
    } finally {
      setUploadingFor(null);
    }
  };
  const cancelAction = () => {
    setMessages((m) => [...m, { role: "assistant", content: "No problem - I won't make that change.", kind: "action-result", ok: false }]);
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
  const meterColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-green-500";

  if (!isPremium || !storeId) return null;

  const fabStyle = fabPos
    ? { left: fabPos.x, top: fabPos.y, right: "auto", bottom: "auto" }
    : { right: 20, bottom: 20 };

  const subtitle = view === "settings" ? "Settings" : view === "history" ? "Chat history" : "AI Business Partner";

  return (
    <>
      {/* Floating action button (movable) - an AI orb, not a help bubble */}
      {!open && (
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={fabStyle}
          className="fixed z-[60] w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-green-400 to-green-600 text-white shadow-xl shadow-green-500/40 ring-1 ring-white/20 flex items-center justify-center touch-none transition-transform active:scale-95 hover:scale-[1.03]"
          title={`Ask ${assistantName}`}
          aria-label={`Open ${assistantName}`}
        >
          <span className="absolute inset-0 rounded-2xl bg-green-400/40 blur-md -z-10" />
          <Sparkles size={26} strokeWidth={2} />
        </button>
      )}

      {/* Chat console */}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-end sm:justify-end sm:p-5">
          {/* mobile backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm sm:hidden" onClick={() => setOpen(false)} />

          <div className="relative w-full sm:w-[420px] h-[90vh] sm:h-[640px] sm:max-h-[86vh] bg-gray-950 text-gray-100 sm:rounded-[26px] rounded-t-[26px] shadow-2xl ring-1 ring-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* ambient brand glow */}
            <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-green-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 w-64 h-64 rounded-full bg-emerald-600/10 blur-3xl" />

            {/* Header */}
            <div className="relative flex items-center justify-between px-4 py-3.5 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {view !== "chat" && (
                  <button onClick={() => setView("chat")} className="p-1 -ml-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                    <ArrowLeft size={17} />
                  </button>
                )}
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
                  <Sparkles size={17} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 ring-2 ring-gray-950" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold leading-tight truncate">{assistantName}</p>
                  <p className="text-[11px] text-green-400/80 leading-tight font-medium">{subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={newChat} title="New chat" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><Plus size={17} /></button>
                <button onClick={openHistory} title="History" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><History size={16} /></button>
                <button onClick={() => setView("settings")} title="Settings" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><Settings2 size={16} /></button>
                <button onClick={() => setOpen(false)} title="Close" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><X size={17} /></button>
              </div>
            </div>

            {/* Usage meter - slim + tasteful */}
            <div className="relative px-4 py-2 flex items-center gap-2.5 flex-shrink-0 border-b border-white/5">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${meterColor} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10.5px] font-semibold text-gray-400 tabular-nums whitespace-nowrap">
                {usage.remaining}/{usage.limit} today
              </span>
            </div>

            {/* Body */}
            {view === "chat" && (
              <>
                <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-3.5 py-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="px-2 pt-4 pb-2">
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4 ring-1 ring-white/20">
                        <span className="absolute inset-0 rounded-2xl bg-green-400/40 blur-lg -z-10" />
                        <Sparkles size={26} />
                      </div>
                      <h3 className="text-xl font-bold tracking-tight">Hi, I'm {assistantName}.</h3>
                      <p className="text-[13px] text-gray-400 mt-1.5 leading-relaxed">
                        I can see your whole store - orders, products, ledger, customers and more - do live
                        market research, and make changes on your say-so. What are we working on?
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-5">
                        {CAPABILITIES.map((c) => (
                          <button
                            key={c.label}
                            onClick={() => send(c.prompt)}
                            className="group text-left p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-green-500/40 transition-colors"
                          >
                            <span className="w-8 h-8 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center mb-2 group-hover:bg-green-500/25 transition-colors">
                              <c.icon size={16} />
                            </span>
                            <p className="text-[12.5px] font-semibold text-gray-100 leading-tight">{c.label}</p>
                            <p className="text-[10.5px] text-gray-500 mt-0.5">{c.sub}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                        m.role === "user"
                          ? "bg-gradient-to-br from-green-500 to-green-600 text-white rounded-br-md shadow-sm shadow-green-900/30"
                          : m.kind === "action-result"
                            ? (m.ok ? "bg-green-500/15 text-green-200 border border-green-500/30" : "bg-white/5 text-gray-400 border border-white/10")
                            : "bg-white/[0.06] text-gray-100 border border-white/10 rounded-bl-md"
                      }`}>
                        {m.role === "assistant" && m.streaming && !m.content ? (
                          <div className="flex gap-1 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400/70 animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400/70 animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400/70 animate-bounce" />
                          </div>
                        ) : (
                          <>
                            {m.kind === "action-result" && m.ok && <Check size={13} className="inline mr-1 -mt-0.5" />}
                            {m.content}
                            {m.sources?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {m.sources.map((s, j) => (
                                  <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-black/30 text-gray-300 border border-white/10 hover:border-green-400/50 hover:text-green-300 transition-colors">
                                    <ExternalLink size={9} /> {(s.title || s.url).slice(0, 28)}
                                  </a>
                                ))}
                              </div>
                            )}
                            {m.imageTarget && (
                              <div className="mt-2.5">
                                <label className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 transition-colors ${uploadingFor !== null ? "opacity-60 cursor-default" : "hover:bg-green-500/30 cursor-pointer"}`}>
                                  {uploadingFor === i ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                                  {uploadingFor === i ? "Uploading…" : "Upload photo"}
                                  <input type="file" accept="image/*" className="hidden" disabled={uploadingFor !== null}
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImageFor(i, m.imageTarget, f); e.target.value = ""; }} />
                                </label>
                              </div>
                            )}
                            {m.imageUploaded && (
                              <div className="mt-2.5 flex items-center gap-2">
                                <img src={m.imageUploaded} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                                <span className="text-[11px] text-green-300 inline-flex items-center gap-1"><Check size={12} /> Photo added</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pending write confirmation */}
                  {pending && (
                    <div className="mx-0.5 rounded-2xl border border-green-500/40 bg-green-500/10 p-3.5">
                      <p className="text-[10.5px] font-bold text-green-400 uppercase tracking-wider mb-1.5">Confirm this change</p>
                      <p className="text-[13px] text-gray-100 mb-3 leading-relaxed">{describePending(pending)}</p>
                      <div className="flex gap-2">
                        <button onClick={confirmAction} disabled={confirming} className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                          {confirming ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />} Confirm
                        </button>
                        <button onClick={cancelAction} disabled={confirming} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10 transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}

                  {error && <div className="mx-0.5 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-[12px] text-red-300">{error}</div>}
                </div>

                {/* Composer */}
                <div className="relative px-3.5 py-3 border-t border-white/10 flex-shrink-0">
                  <div className="flex items-end gap-2 rounded-2xl bg-white/[0.06] border border-white/10 focus-within:border-green-500/50 focus-within:bg-white/[0.09] transition-colors px-2 py-1.5">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      rows={1}
                      placeholder={`Message ${assistantName}…`}
                      className="flex-1 resize-none max-h-28 bg-transparent px-2 py-1.5 text-[13px] text-gray-100 outline-none placeholder:text-gray-500"
                    />
                    <button onClick={() => send()} disabled={!input.trim() || sending} className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 disabled:opacity-40 disabled:from-gray-600 disabled:to-gray-600 text-white flex items-center justify-center flex-shrink-0 transition-colors">
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-600 text-center mt-1.5">{assistantName} can make changes - it always asks you to confirm first.</p>
                </div>
              </>
            )}

            {/* History view */}
            {view === "history" && (
              <div className="relative flex-1 overflow-y-auto p-3 space-y-1.5">
                {sessions.length === 0 && <p className="text-center text-sm text-gray-500 py-12">No previous chats yet.</p>}
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 group">
                    <button onClick={() => loadSession(s.id)} className={`flex-1 text-left px-3 py-2.5 rounded-xl text-[13px] transition-colors truncate ${s.id === sessionId ? "bg-green-500/15 text-green-300 font-semibold border border-green-500/30" : "text-gray-300 hover:bg-white/5 border border-transparent"}`}>
                      {s.title || "Chat"}
                    </button>
                    <button onClick={() => deleteSession(s.id)} className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Settings view */}
            {view === "settings" && (
              <div className="relative flex-1 overflow-y-auto p-4 space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Assistant name</label>
                  <div className="flex gap-2 mt-2">
                    <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={40} className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-gray-100 outline-none focus:border-green-500/50 placeholder:text-gray-500" placeholder="Sella AI" />
                    <button onClick={saveName} className="px-3.5 py-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"><Pencil size={12} /> Save</button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">Give your AI partner a name you and your team will recognise.</p>
                </div>

                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Daily usage</span>
                    <span className="text-xs font-bold text-gray-100 tabular-nums">{usage.used} / {usage.limit}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${meterColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2.5 leading-relaxed">
                    You have <span className="font-semibold text-gray-200">{usage.remaining}</span> requests left today.
                    Your limit resets at midnight (WAT). Confirming an action does not use a request.
                  </p>
                </div>

                <div className="rounded-2xl bg-green-500/10 border border-green-500/25 p-4">
                  <p className="text-[12px] text-gray-300 leading-relaxed">
                    <span className="font-bold text-green-400">{assistantName}</span> can read your entire dashboard and make changes on your request -
                    but it always shows you a confirmation before saving anything.
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
