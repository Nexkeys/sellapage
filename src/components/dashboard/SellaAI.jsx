// src/components/dashboard/SellaAI.jsx
// Sella AI - full-context AI Business Partner. Premium only.
//
// A movable floating button on every dashboard tab (mounted once in
// DashboardLayout) opens the Sella WORKSPACE: a full assistant layout with a
// sidebar (new chat, search, memory, saved prompts, settings, chat history
// grouped by day) and a main panel (greeting, composer, conversation).
//
// Brand: Sellapage green on a light, calm surface. Every rendered control is
// functional; there are no placeholder buttons.
//
// What the vendor can do here: chat; switch to Deeper Research (Deep mode);
// search the web for one message; attach files and photos; talk instead of
// type; have replies read aloud; review imports and bulk edits before they
// run; watch background imports; download exports; manage what Sella
// remembers; save prompts; export the chat.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark, X, Plus, Check, Loader2, ExternalLink, Trash2, ImagePlus, Search, Brain, Settings2,
  Paperclip, FileText, FileSpreadsheet, Download, Mic, Square, ArrowUp, Globe, Lightbulb, Image as ImageIcon,
  PieChart, ChevronDown, PanelLeftClose, PanelLeftOpen, Menu, MoreHorizontal, Volume2, VolumeX, Copy, Coins, HelpCircle,
} from "lucide-react";
import { auth } from "../../firebase/auth";
import { uploadSingleImage } from "../../firebase/products";
import SellaLogo from "../SellaLogo";
import { downloadExport } from "../../utils/exportData";
import { canRecord, startRecording, MAX_RECORD_SECONDS, canSpeak, speak, stopSpeaking, playAudio } from "../../utils/sellaVoice";
import { GREETINGS, LOCALES, voiceSample } from "./sella/languages";
import SellaTermsModal from "./SellaTermsModal";
import { ImportReview, BulkReview, JobCard } from "./sella/ReviewCards";
import { MemoryPanel, PromptsPanel, SettingsPanel } from "./sella/SellaPanels";
import { ImageResults, VideoResult } from "./sella/ImageTools";

const LS_SESSION = (sid) => `sellaai_session_${sid}`;
const LS_MODE = "sellaai_mode";
const LS_SIDEBAR = "sellaai_sidebar";

// Mirrors the server limits in src/api-handlers/_lib/sella-files.js.
const MAX_FILES = 5;
const MAX_DOC_BYTES = 3 * 1024 * 1024;
const DOC_ACCEPT = ".pdf,.xlsx,.csv,.tsv,.docx,.txt,.md";

const SUGGESTIONS = [
  { icon: PieChart, title: "Summarise my week", sub: "Sales, orders and what to restock, in five points.", prompt: "Summarise my last 7 days: sales, orders, best sellers and what I should restock. Keep it to 5 points." },
  { icon: Lightbulb, title: "Creative brainstorm", sub: "Captions and promo ideas for my best seller.", prompt: "Write 3 Instagram captions and 2 WhatsApp status ideas to promote my best-selling product this week." },
  { icon: Globe, title: "Check the market", sub: "Compare my prices with what others charge.", prompt: "Check current market prices in Nigeria for my top 3 products and tell me if my prices are too high or too low.", web: true },
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

const readAsBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result || ""));
  r.onerror = () => reject(new Error(`Could not read ${file.name}`));
  r.readAsDataURL(file);
});

const isImageFile = (f) => /^image\//.test(f.type);
const fileIcon = (name = "") => (/\.(xlsx|csv|tsv)$/i.test(name) ? FileSpreadsheet : FileText);
const fmtCredits = (n) => (n == null ? "" : Math.floor(Number(n)).toLocaleString("en-NG"));
const money = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// The greeting mark: Sella's logo on a soft brand glow.
function Orb({ size = 120, className = "" }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <div className="absolute inset-[6%] rounded-full bg-gradient-to-br from-green-200 via-emerald-300 to-green-500 blur-2xl opacity-60 animate-pulse" />
      <div className="absolute inset-[10%] rounded-full bg-white shadow-[0_18px_40px_-18px_rgba(5,150,105,0.55)] ring-1 ring-green-100" />
      <SellaLogo size={Math.round(size * 0.62)} className="relative" />
    </div>
  );
}

// Sella's avatar beside each reply.
function SmallOrb() {
  return (
    <span className="relative w-8 h-8 flex-shrink-0 rounded-full bg-white ring-1 ring-green-100 shadow-sm flex items-center justify-center" aria-hidden="true">
      <SellaLogo size={24} />
    </span>
  );
}

// open / onClose: the workspace is opened from the "Sella AI" item in the
// dashboard sidebar (DashboardLayout). It used to float over every screen as a
// draggable button; nothing floats over the dashboard any more.
export default function SellaAI({ store, open = false, onClose = () => {} }) {
  const storeId = store?.id;
  const isPremium = store?.hasPremiumFeatures ?? store?.plan === "premium";

  const [view, setView] = useState("chat"); // chat | memory | prompts | settings
  const [termsTab, setTermsTab] = useState(null); // null | "terms" | "privacy"
  const [staffAccess, setStaffAccess] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  const [savingStaff, setSavingStaff] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  // Other screens open Sella with a request already typed, e.g. Import
  // Products on the Products tab: window.dispatchEvent(new CustomEvent(
  // "sella:open", { detail: { prompt } })). Nothing is sent until the vendor
  // presses send.
  useEffect(() => {
    const onOpen = (e) => {
      // DashboardLayout listens for the same event and opens the workspace;
      // this side only fills in the request.
      setView("chat");
      if (e.detail?.prompt) setInput(e.detail.prompt);
    };
    window.addEventListener("sella:open", onOpen);
    return () => window.removeEventListener("sella:open", onOpen);
  }, []);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState(null); // { type, args, summary } awaiting confirm
  const [confirming, setConfirming] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [credits, setCredits] = useState(null);
  const [assistantName, setAssistantName] = useState(store?.sellaAiName || "Sella AI");
  const [renameValue, setRenameValue] = useState(store?.sellaAiName || "Sella AI");
  const [profile, setProfile] = useState({ greetingName: "", businessName: store?.businessName || "", logoUrl: store?.logoUrl || "", email: "" });
  // This person's language and voice (saved per person on the server), and
  // whether replies are read by the server's Nigerian voices or the device.
  const [prefs, setPrefsState] = useState({ language: "en", voice: "female", speechProvider: "device" });
  const [error, setError] = useState("");
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(LS_MODE) === "deep" ? "deep" : "auto"; } catch { return "auto"; }
  });
  const [webSearch, setWebSearch] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ id, file, name, isImage, preview }]
  const [downloading, setDownloading] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [modeMenu, setModeMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [sidebarMobile, setSidebarMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(LS_SIDEBAR) === "collapsed"; } catch { return false; }
  });
  const [recording, setRecording] = useState(null); // { seconds } while listening
  const [transcribing, setTranscribing] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const recRef = useRef(null);
  const finishMicRef = useRef(null);
  const pollers = useRef({}); // jobId -> true while polling
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  // ---- session cursor ----
  useEffect(() => {
    if (!storeId) return;
    const saved = localStorage.getItem(LS_SESSION(storeId));
    if (saved) setSessionId(saved);
  }, [storeId]);

  const persist = (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } };
  const setModePersist = (m) => { setMode(m); persist(LS_MODE, m); setModeMenu(false); };
  const toggleSidebar = () => setSidebarCollapsed((c) => { persist(LS_SIDEBAR, c ? "open" : "collapsed"); return !c; });

  // ---- data loading ----
  const refreshUsage = useCallback(async () => {
    try {
      const d = await callSella({ storeId, action: "usage" });
      if (d.credits) setCredits(d.credits);
      if (d.assistantName) { setAssistantName(d.assistantName); setRenameValue(d.assistantName); }
      if (typeof d.sellaStaffAccess === "boolean") setStaffAccess(d.sellaStaffAccess);
      if (typeof d.isOwner === "boolean") setIsOwner(d.isOwner);
      setProfile((p) => ({
        greetingName: d.greetingName ?? p.greetingName,
        businessName: d.businessName || p.businessName,
        logoUrl: d.logoUrl || p.logoUrl,
        email: d.email || p.email,
      }));
      if (d.language) setPrefsState({ language: d.language, voice: d.voice || "female", speechProvider: d.speechProvider || "device" });
    } catch { /* non-blocking */ }
  }, [storeId]);

  const loadSessions = useCallback(async () => {
    try { const d = await callSella({ storeId, action: "sessions" }); setSessions(d.sessions || []); }
    catch { /* keep what we have */ }
  }, [storeId]);

  const loadPrompts = useCallback(async () => {
    try { const d = await callSella({ storeId, action: "prompts" }); setPrompts(d.prompts || []); }
    catch { /* non-blocking */ }
  }, [storeId]);

  useEffect(() => {
    if (!open || !isPremium) return;
    refreshUsage();
    loadSessions();
    loadPrompts();
    if (sessionId && messages.length === 0) {
      callSella({ storeId, action: "session", sessionId })
        .then((d) => setMessages(d.messages || []))
        .catch(() => {});
    }
  }, [open, isPremium]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, pending]);

  // Lock the page behind the workspace, and give Ctrl/Cmd+K to the chat search.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSidebarCollapsed(false);
        setSidebarMobile(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") { setModeMenu(false); setMoreMenu(false); setPromptsOpen(false); setSidebarMobile(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  // Stop the mic and any read-aloud when the workspace closes.
  useEffect(() => {
    if (open) return;
    recRef.current?.cancel();
    recRef.current = null;
    setRecording(null);
    stopSpeaking();
    setSpeakingIdx(null);
  }, [open]);

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

  // ---- attachments ----
  const addFiles = (list) => {
    setError("");
    const next = [...attachments];
    for (const file of Array.from(list || [])) {
      if (next.length >= MAX_FILES) { setError(`You can send up to ${MAX_FILES} files at a time.`); break; }
      const image = isImageFile(file);
      if (!image && /\.(xls|doc)$/i.test(file.name)) { setError(`${file.name} is an old Office format. Save it as .xlsx, .csv or .docx first.`); continue; }
      if (!image && file.size > MAX_DOC_BYTES) { setError(`${file.name} is over 3MB. Split it or export fewer pages, then try again.`); continue; }
      next.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        file, name: file.name, isImage: image,
        preview: image ? URL.createObjectURL(file) : null,
      });
    }
    setAttachments(next);
  };
  const removeAttachment = (id) => setAttachments((a) => {
    const hit = a.find((x) => x.id === id);
    if (hit?.preview && hit.file) URL.revokeObjectURL(hit.preview);
    return a.filter((x) => x.id !== id);
  });

  // Photos go to Cloudinary first (the server only accepts https image URLs);
  // documents travel as base64 in the request and are parsed server-side.
  const prepareAttachments = async (list) => Promise.all(list.map(async (a) => {
    // An image already online (one Sella made, being edited) is sent as is.
    if (a.isImage && a.url && !a.file) return { kind: "image", url: a.url, name: a.name };
    if (a.isImage) return { kind: "image", url: await uploadSingleImage(a.file, "sellapage/sella"), name: a.name };
    return { kind: "file", name: a.name, mime: a.file.type, dataBase64: await readAsBase64(a.file) };
  }));

  // ---- voice input ----
  const startMic = async () => {
    setError("");
    stopSpeaking();
    try {
      const handle = await startRecording({
        onTick: (s) => {
          setRecording({ seconds: s });
          if (s >= MAX_RECORD_SECONDS) finishMicRef.current?.();
        },
      });
      recRef.current = handle;
      setRecording({ seconds: 0 });
    } catch (e) {
      setError(e.message);
    }
  };
  const finishMic = async () => {
    const handle = recRef.current;
    if (!handle) return;
    recRef.current = null;
    setRecording(null);
    setTranscribing(true);
    try {
      const { base64, seconds, silent } = await handle.stop();
      if (seconds < 0.6) return;
      if (silent) { setError("I didn't hear anything. Check your microphone and try again."); return; }
      const d = await callSella({ storeId, action: "transcribe", audioBase64: base64, format: "wav" });
      if (d.text) {
        setInput((v) => (v.trim() ? `${v.trim()} ${d.text}` : d.text));
        setTimeout(() => inputRef.current?.focus(), 30);
      } else {
        setError("I didn't catch anything. Try again a little closer to the mic.");
      }
      refreshUsage();
    } catch (e) {
      setError(e.data?.error || e.message);
    } finally {
      setTranscribing(false);
    }
  };
  // Kept in a ref so the recorder's timer can stop at the time limit without
  // holding a stale copy of this function.
  useEffect(() => { finishMicRef.current = finishMic; });
  const cancelMic = async () => {
    const handle = recRef.current;
    recRef.current = null;
    setRecording(null);
    await handle?.cancel();
  };

  // "Edit" under a Sella image: put that image in the message box so the
  // vendor can say what to change.
  const editImage = (url) => {
    setAttachments((a) => (a.some((x) => x.url === url) || a.length >= MAX_FILES
      ? a
      : [...a, { id: `url_${Date.now()}`, name: "Image to edit", isImage: true, url, preview: url }]));
    setInput((v) => v || "Change this image: ");
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const noteAttached = (msg) => setMessages((ms) => [...ms, { role: "assistant", kind: "action-result", ok: true, content: msg }]);

  // Reads text aloud. Nigerian server voices when switched on (they are the
  // only way Yoruba, Igbo and Hausa can be spoken properly), else the device's
  // voice closest to the chosen language and gender.
  const readAloud = async (text, onEnd) => {
    if (prefs.speechProvider === "spitch") {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/sella-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ storeId, action: "speak", text }),
        });
        if (res.ok) { playAudio(await res.blob(), { onEnd }); refreshUsage(); return; }
        const d = await res.json().catch(() => ({}));
        // 404 means the server voice is off after all: fall through to the device.
        if (res.status !== 404) { setError(d.error || "I could not read that aloud."); onEnd(); return; }
      } catch { /* network: fall back to the device voice */ }
    }
    speak(text, { onEnd, lang: LOCALES[prefs.language] || "en-NG", gender: prefs.voice });
  };
  const toggleSpeak = (i, text) => {
    if (speakingIdx === i) { stopSpeaking(); setSpeakingIdx(null); return; }
    setSpeakingIdx(i);
    readAloud(text, () => setSpeakingIdx((cur) => (cur === i ? null : cur)));
  };
  const savePrefs = async (next) => {
    const merged = { ...prefs, ...next };
    setPrefsState(merged);
    try {
      const d = await callSella({ storeId, action: "set-preferences", language: merged.language, voice: merged.voice });
      setPrefsState({ language: d.language, voice: d.voice, speechProvider: d.speechProvider || merged.speechProvider });
    } catch (e) { setError(e.data?.error || e.message); }
  };
  const copyText = async (i, text) => {
    try { await navigator.clipboard.writeText(text); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1500); } catch { /* ignore */ }
  };

  // ---- background job progress (imports) ----
  const pollJob = useCallback(async (jobId) => {
    if (pollers.current[jobId]) return;
    pollers.current[jobId] = true;
    try {
      // Each poll also ADVANCES the job on the server for up to ~40s, so this
      // loop is what makes an import move quickly while the vendor watches.
      for (let i = 0; i < 200 && mounted.current; i++) {
        let job;
        try { job = (await callSella({ storeId, action: "job", jobId })).job; }
        catch { await new Promise((r) => setTimeout(r, 4000)); continue; }
        setMessages((m) => m.map((x) => (x.kind === "job" && x.jobId === jobId ? { ...x, job } : x)));
        if (!job || job.status === "done" || job.status === "failed") { refreshUsage(); break; }
        // A video is only being CHECKED (the provider does the work), so it is
        // polled gently; an import is advanced by each poll, so quickly.
        await new Promise((r) => setTimeout(r, job.type === "video" ? 5000 : 1500));
      }
    } finally {
      delete pollers.current[jobId];
    }
  }, [storeId, refreshUsage]);

  // ---- send a message (streamed via SSE) ----
  const send = async (override, opts = {}) => {
    const text = String(override ?? input).trim();
    const files = override != null ? [] : attachments;
    if ((!text && !files.length) || sending) return;
    const useMode = opts.mode || mode;
    const useWeb = opts.web ?? webSearch;
    setError("");
    setPromptsOpen(false);
    setView("chat");
    const sid = sessionId || String(Date.now());
    if (!sessionId) { setSessionId(sid); persist(LS_SESSION(storeId), sid); }

    const localAtt = files.map((a) => ({ kind: a.isImage ? "image" : "file", name: a.name, url: a.preview || undefined }));
    setMessages((m) => [...m,
      { role: "user", content: text, ...(localAtt.length ? { attachments: localAtt } : {}) },
      { role: "assistant", content: "", streaming: true, deep: useMode === "deep" },
    ]);
    setInput("");
    setAttachments([]);
    setWebSearch(false); // web search is per message, so it never costs more by accident
    setPending(null);
    setSending(true);

    try {
      const prepared = files.length ? await prepareAttachments(files) : [];
      // Swap the local preview for the uploaded URL so the transcript survives a refresh.
      if (prepared.some((p) => p.kind === "image")) {
        setMessages((m) => m.map((x, i) => (i === m.length - 2 && x.role === "user"
          ? { ...x, attachments: prepared.map((p) => ({ kind: p.kind, name: p.name, url: p.url })) }
          : x)));
      }

      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again.");
      const token = await user.getIdToken();
      const res = await fetch("/api/sella-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeId, action: "send", message: text, sessionId: sid, mode: useMode, webSearch: useWeb, attachments: prepared }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        dropStreamingPlaceholder();
        if (data.credits) setCredits(data.credits);
        setError(res.status === 413
          ? "Those files are too large to send together. Send fewer, or smaller files."
          : data.error || "Something went wrong.");
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
          if (event === "token") patchLast((last) => ({ ...last, thinking: null, status: null, content: (last.content || "") + (data.t || "") }));
          else if (event === "status") patchLast({ status: data });
          else if (event === "images") patchLast((last) => ({ ...last, status: null, images: [...(last.images || []), ...(data.images || [])] }));
          else if (event === "thinking") patchLast({ thinking: data.seconds || 0 });
          else if (event === "thought") patchLast({ thinking: null, thoughtSeconds: data.seconds || 0 });
          else if (event === "file") patchLast((last) => ({ ...last, files: [...(last.files || []), data.file] }));
          else if (event === "memory") patchLast((last) => ({ ...last, memory: [...(last.memory || []), data.saved ? { saved: data.saved.text } : { forgotten: data.forgotten }] }));
          else if (event === "sources") patchLast({ sources: data.sources });
          else if (event === "pending") { setPending({ ...data.pendingAction, sessionId: sid }); patchLast({ pendingAction: data.pendingAction }); }
          else if (event === "usage") { if (data.credits) setCredits(data.credits); }
          else if (event === "error") streamError = data.error || "Something went wrong.";
        }
      }

      if (streamError) { dropStreamingPlaceholder(); setError(streamError); }
      else patchLast({ streaming: false, thinking: null });
      loadSessions();
    } catch (err) {
      dropStreamingPlaceholder();
      setError(err.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  // ---- confirm / cancel a pending write ----
  const confirmAction = async (argsOverride) => {
    if (!pending || confirming) return;
    setConfirming(true);
    try {
      const d = await callSella({
        storeId, action: "confirm",
        pendingAction: { type: pending.type, args: argsOverride || pending.args },
        sessionId: pending.sessionId,
      });
      setMessages((m) => [...m, {
        role: "assistant", content: d.result?.message || "Done.", kind: "action-result", ok: d.result?.ok,
        ...(d.result?.imageTarget ? { imageTarget: d.result.imageTarget } : {}),
      }, ...(d.result?.jobId ? [{ role: "assistant", kind: "job", jobId: d.result.jobId, job: null, content: "" }] : [])]);
      setPending(null);
      if (d.result?.jobId) pollJob(d.result.jobId);
    } catch (err) {
      setError(err.data?.error || "Could not complete that action.");
    } finally {
      setConfirming(false);
    }
  };
  const cancelAction = () => {
    setMessages((m) => [...m, { role: "assistant", content: "No problem, I won't make that change.", kind: "action-result", ok: false }]);
    setPending(null);
  };

  // ---- upload an image for an AI-created product/service, straight into its doc ----
  const [uploadingFor, setUploadingFor] = useState(null);
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

  const download = async (file, key) => {
    setDownloading(key);
    setError("");
    try { await downloadExport({ storeId, tab: file.tab, format: file.format, from: file.from, to: file.to, via: "sella" }); }
    catch (err) { setError(err.message); }
    finally { setDownloading(null); }
  };

  // The conversation as a plain text file, for keeping or sharing.
  const exportChat = () => {
    const lines = messages
      .filter((m) => m.kind !== "job" && (m.content || m.attachments?.length))
      .map((m) => {
        const who = m.role === "user" ? "You" : assistantName;
        const att = m.attachments?.length ? `\n[Attached: ${m.attachments.map((a) => a.name || a.kind).join(", ")}]` : "";
        return `${who}:\n${m.content || ""}${att}`;
      });
    const blob = new Blob([`${assistantName} chat, ${new Date().toLocaleString("en-NG")}\n\n${lines.join("\n\n")}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assistantName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setMoreMenu(false);
  };

  // ---- sessions ----
  const loadSession = async (sid) => {
    setSessionId(sid);
    persist(LS_SESSION(storeId), sid);
    setPending(null);
    setView("chat");
    setSidebarMobile(false);
    try { const d = await callSella({ storeId, action: "session", sessionId: sid }); setMessages(d.messages || []); }
    catch { setMessages([]); }
  };
  const newChat = () => {
    const sid = String(Date.now());
    setSessionId(sid);
    persist(LS_SESSION(storeId), sid);
    setMessages([]);
    setPending(null);
    setView("chat");
    setSidebarMobile(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const deleteSession = async (sid) => {
    try { await callSella({ storeId, action: "delete-session", sessionId: sid }); } catch { /* */ }
    setSessions((s) => s.filter((x) => x.id !== sid));
    if (sid === sessionId) newChat();
  };

  const saveName = async () => {
    const name = renameValue.trim().slice(0, 40) || "Sella AI";
    try { const d = await callSella({ storeId, action: "rename", name }); setAssistantName(d.assistantName); }
    catch { /* */ }
  };

  const toggleStaffAccess = async (next) => {
    setSavingStaff(true);
    // Optimistic, but reconciled against the server response: this controls who
    // may send store data to third-party models, so the UI must never show a
    // state the server did not confirm.
    setStaffAccess(next);
    try {
      const d = await callSella({ storeId, action: "staff-access", enabled: next });
      setStaffAccess(d.sellaStaffAccess === true);
    } catch {
      setStaffAccess(!next);
    } finally {
      setSavingStaff(false);
    }
  };

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? sessions.filter((s) => String(s.title || "").toLowerCase().includes(q)) : sessions;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const day = 86400000;
    const buckets = [["Today", []], ["Yesterday", []], ["Previous 7 days", []], ["Older", []]];
    for (const s of list) {
      const t = new Date(s.updatedAt || 0).getTime();
      const b = t >= today ? 0 : t >= today - day ? 1 : t >= today - 7 * day ? 2 : 3;
      buckets[b][1].push(s);
    }
    return buckets.filter(([, v]) => v.length);
  }, [sessions, search]);

  if (!isPremium || !storeId) return null;

  const hasDraft = input.trim() || attachments.length;
  const initial = (profile.businessName || assistantName || "S").trim().charAt(0).toUpperCase();

  // ------------------------------------------------------------------ pieces
  const composer = (
    <div
      className="rounded-[22px] border border-green-100 bg-gradient-to-b from-white to-green-50/50 shadow-[0_8px_30px_-12px_rgba(22,163,74,0.25)]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
    >
      <div className="rounded-[21px] bg-white">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {attachments.map((a) => {
              const I = fileIcon(a.name);
              return (
                <span key={a.id} className="relative inline-flex items-center gap-1.5 pl-1.5 pr-7 py-1 rounded-xl bg-gray-50 border border-gray-200 text-[11.5px] text-gray-700 max-w-[200px]">
                  {a.preview
                    ? <img src={a.preview} alt="" className="w-7 h-7 rounded-lg object-cover" />
                    : <span className="w-7 h-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><I size={14} /></span>}
                  <span className="truncate">{a.name}</span>
                  <button onClick={() => removeAttachment(a.id)} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-700" aria-label={`Remove ${a.name}`}><X size={12} /></button>
                </span>
              );
            })}
          </div>
        )}

        {recording ? (
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[13px] font-medium text-gray-700">Listening {mmss(recording.seconds)}</span>
            <span className="text-[11.5px] text-gray-400">up to {MAX_RECORD_SECONDS / 60 >= 1 ? `${Math.floor(MAX_RECORD_SECONDS / 60)}m ${MAX_RECORD_SECONDS % 60}s` : `${MAX_RECORD_SECONDS}s`}</span>
            <div className="ml-auto flex gap-2">
              <button onClick={cancelMic} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
              <button onClick={finishMic} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-[12px] font-bold inline-flex items-center gap-1"><Check size={13} /> Done</button>
            </div>
          </div>
        ) : (
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            onPaste={(e) => { const f = Array.from(e.clipboardData?.files || []); if (f.length) { e.preventDefault(); addFiles(f); } }}
            rows={2}
            placeholder={transcribing ? "Turning your voice into text…" : attachments.length ? "Say what to do with these…" : "Ask me anything…"}
            disabled={transcribing}
            className="w-full resize-none max-h-40 bg-transparent px-4 pt-3.5 pb-1 text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
          />
        )}

        <div className="flex items-center gap-1.5 px-3 pb-3 pt-1">
          <button
            role="switch"
            aria-checked={mode === "deep"}
            onClick={() => setModePersist(mode === "deep" ? "auto" : "deep")}
            title="Deeper Research thinks longer and more carefully, for hard questions. It uses more credits."
            className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
              mode === "deep" ? "bg-green-50 border-green-300 text-green-700" : "bg-white border-gray-200 text-gray-500 hover:text-gray-800"
            }`}
          >
            <Brain size={14} /> <span className="sm:hidden">Deep</span><span className="hidden sm:inline whitespace-nowrap">Deeper Research</span>
          </button>
          <button onClick={() => imageInputRef.current?.click()} disabled={attachments.length >= MAX_FILES} title="Add photos" aria-label="Add photos" className="p-2 rounded-lg text-gray-500 hover:text-green-700 hover:bg-green-50 disabled:opacity-40">
            <ImageIcon size={16} />
          </button>
          <div className="relative">
            <button onClick={() => setPromptsOpen((o) => !o)} title="Saved prompts" aria-label="Saved prompts" className={`p-2 rounded-lg hover:bg-green-50 ${promptsOpen ? "text-green-700 bg-green-50" : "text-gray-500 hover:text-green-700"}`}>
              <Lightbulb size={16} />
            </button>
            {promptsOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-xl p-1.5 z-30">
                <p className="px-2.5 pt-1.5 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Saved prompts</p>
                {prompts.length === 0 && <p className="px-2.5 py-2 text-[12.5px] text-gray-500">None yet.</p>}
                {prompts.slice(0, 6).map((p) => (
                  <button key={p.id} onClick={() => { setInput(p.text); setPromptsOpen(false); inputRef.current?.focus(); }} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-50">
                    <p className="text-[12.5px] font-semibold text-gray-800 truncate">{p.title}</p>
                    <p className="text-[11.5px] text-gray-500 truncate">{p.text}</p>
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1 flex">
                  {input.trim() && (
                    <button
                      onClick={async () => {
                        try { const d = await callSella({ storeId, action: "prompt-save", text: input }); setPrompts((ps) => [d.prompt, ...ps]); }
                        catch (e) { setError(e.data?.error || e.message); }
                        setPromptsOpen(false);
                      }}
                      className="flex-1 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-green-700 hover:bg-green-50 text-left"
                    >
                      Save what I typed
                    </button>
                  )}
                  <button onClick={() => { setView("prompts"); setPromptsOpen(false); }} className="flex-1 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-gray-600 hover:bg-gray-50 text-left">Manage</button>
                </div>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              role="switch"
              aria-checked={webSearch}
              onClick={() => setWebSearch((w) => !w)}
              title={webSearch ? "Web search is on for your next message" : "Search the web for your next message"}
              aria-label="Search the web"
              className={`p-2 rounded-lg transition-colors ${webSearch ? "bg-green-50 text-green-700" : "text-gray-500 hover:text-green-700 hover:bg-green-50"}`}
            >
              <Globe size={16} />
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= MAX_FILES} title="Attach a file" aria-label="Attach a file" className="p-2 rounded-lg text-gray-500 hover:text-green-700 hover:bg-green-50 disabled:opacity-40">
              <Paperclip size={16} />
            </button>
            {hasDraft && !recording ? (
              <button
                onClick={() => send()}
                disabled={sending || transcribing}
                aria-label="Send"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white flex items-center justify-center shadow-md shadow-green-500/30 disabled:opacity-50 hover:scale-[1.04] transition-transform"
              >
                {sending ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}
              </button>
            ) : (
              <button
                onClick={recording ? finishMic : startMic}
                disabled={!canRecord() || transcribing || sending}
                title={canRecord() ? (recording ? "Stop and use this" : "Speak to type") : "Voice is not supported in this browser"}
                aria-label={recording ? "Stop recording" : "Speak"}
                className={`w-10 h-10 rounded-full text-white flex items-center justify-center shadow-md transition-transform hover:scale-[1.04] disabled:opacity-50 ${
                  recording ? "bg-red-500 shadow-red-500/30" : "bg-gradient-to-br from-green-300 via-green-500 to-green-600 shadow-green-500/30 ring-4 ring-green-100"
                }`}
              >
                {transcribing ? <Loader2 size={17} className="animate-spin" /> : recording ? <Square size={14} fill="currentColor" /> : <Mic size={17} />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        <button onClick={() => setView("prompts")} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 hover:text-green-700">
          <Bookmark size={14} className="text-green-600" /> Saved prompts
        </button>
        <button onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= MAX_FILES} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-600 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40">
          <Paperclip size={13} /> Attach file
        </button>
      </div>
      <input ref={fileInputRef} type="file" multiple accept={`image/*,${DOC_ACCEPT}`} className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
    </div>
  );

  const reviewCard = pending && (
    pending.type === "import_records" && Array.isArray(pending.args?.rows)
      ? <ImportReview pending={pending} confirming={confirming} onConfirm={confirmAction} onCancel={cancelAction} />
      : pending.type === "bulk_update" && Array.isArray(pending.args?.rows)
        ? <BulkReview pending={pending} confirming={confirming} onConfirm={confirmAction} onCancel={cancelAction} />
        : (
          <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4">
            <p className="text-[10.5px] font-bold text-green-700 uppercase tracking-wider mb-1.5">Confirm this change</p>
            <p className="text-[13.5px] text-gray-800 mb-3 leading-relaxed">{pending.summary || describePending(pending)}</p>
            <div className="flex gap-2">
              <button onClick={() => confirmAction()} disabled={confirming} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                {confirming ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />} Confirm
              </button>
              <button onClick={cancelAction} disabled={confirming} className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )
  );

  const navItem = (id, Icon, label) => (
    <button
      onClick={() => { setView(id); setSidebarMobile(false); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-colors ${view === id ? "bg-white text-green-700 shadow-sm ring-1 ring-black/5" : "text-gray-700 hover:bg-white/70"}`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  const sidebar = (
    <aside className={`${sidebarMobile ? "flex" : "hidden"} ${sidebarCollapsed ? "md:hidden" : "md:flex"} absolute md:relative inset-y-0 left-0 z-40 md:z-auto w-[272px] flex-shrink-0 flex-col bg-[#f5f8f6] md:bg-transparent p-3 md:pr-2 shadow-2xl md:shadow-none`}>
      <div className="flex items-center justify-between px-1.5 pt-1 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-white ring-1 ring-green-100 shadow-sm flex items-center justify-center"><SellaLogo size={30} /></span>
          <span className="text-[17px] font-bold text-gray-900 truncate">{assistantName}</span>
        </div>
        <button onClick={() => { setSidebarMobile(false); if (window.innerWidth >= 768) toggleSidebar(); }} className="p-1.5 rounded-lg text-gray-500 hover:bg-white" aria-label="Hide sidebar">
          <PanelLeftClose size={17} />
        </button>
      </div>

      <button onClick={newChat} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-[13.5px] font-semibold transition-colors">
        <Plus size={16} /> New chat
      </button>

      <div className="relative mt-2.5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats"
          className="w-full pl-9 pr-12 py-2.5 rounded-xl bg-white border border-gray-200 text-[13px] outline-none focus:border-green-400"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">Ctrl K</kbd>
      </div>

      <nav className="mt-3 space-y-0.5">
        {navItem("memory", Brain, "Memory")}
        {navItem("prompts", Bookmark, "Saved prompts")}
        {navItem("settings", Settings2, "Settings")}
      </nav>

      <div className="border-t border-gray-200/80 my-3" />

      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3">
        {groups.length === 0 && <p className="px-2 text-[12.5px] text-gray-400">{search ? "No chats match that." : "Your chats will appear here."}</p>}
        {groups.map(([label, list]) => (
          <div key={label}>
            <p className="px-2 mb-1 text-[11px] font-medium text-gray-400">{label}</p>
            {list.map((s) => (
              <div key={s.id} className="group flex items-center">
                <button
                  onClick={() => loadSession(s.id)}
                  className={`flex-1 min-w-0 text-left px-2 py-1.5 rounded-lg text-[13px] truncate transition-colors ${s.id === sessionId && view === "chat" ? "bg-white text-green-700 font-semibold ring-1 ring-black/5" : "text-gray-700 hover:bg-white/70"}`}
                >
                  {s.title || "Chat"}
                </button>
                <button onClick={() => deleteSession(s.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" aria-label="Delete chat">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-black/5 p-2.5">
        {profile.logoUrl
          ? <img src={profile.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
          : <span className="w-9 h-9 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center">{initial}</span>}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-gray-900 truncate">{profile.businessName || "Your store"}</p>
          {profile.email && <p className="text-[11.5px] text-gray-500 truncate">{profile.email}</p>}
        </div>
        <button onClick={() => onClose()} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" aria-label={`Close ${assistantName}`} title="Close">
          <X size={16} />
        </button>
      </div>
    </aside>
  );

  const messageList = (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {messages.map((m, i) => {
        if (m.kind === "job") return <JobCard key={i} job={m.job} />;
        if (m.role === "user") {
          return (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%]">
                {m.attachments?.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5 mb-1.5">
                    {m.attachments.map((a, j) => (a.kind === "image" && a.url
                      ? <img key={j} src={a.url} alt={a.name || ""} className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                      : (
                        <span key={j} className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700">
                          {(() => { const I = fileIcon(a.name); return <I size={13} className="text-green-600" />; })()}
                          <span className="truncate max-w-[180px]">{a.name || "File"}</span>
                        </span>
                      )))}
                  </div>
                )}
                {m.content && <div className="rounded-2xl rounded-br-md bg-green-600 text-white px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words">{m.content}</div>}
              </div>
            </div>
          );
        }
        if (m.kind === "action-result") {
          return (
            <div key={i} className={`rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${m.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
              {m.ok && <Check size={14} className="inline mr-1 -mt-0.5" />}{m.content}
              {m.imageTarget && (
                <div className="mt-2.5">
                  <label className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white border border-green-200 text-green-700 ${uploadingFor !== null ? "opacity-60" : "cursor-pointer hover:bg-green-50"}`}>
                    {uploadingFor === i ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                    {uploadingFor === i ? "Uploading…" : "Upload photo"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingFor !== null}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImageFor(i, m.imageTarget, f); e.target.value = ""; }} />
                  </label>
                </div>
              )}
              {m.imageUploaded && (
                <div className="mt-2.5 flex items-center gap-2">
                  <img src={m.imageUploaded} alt="" className="w-12 h-12 rounded-lg object-cover border border-green-200" />
                  <span className="text-[12px] text-green-700 inline-flex items-center gap-1"><Check size={12} /> Photo added</span>
                </div>
              )}
            </div>
          );
        }
        const waiting = m.streaming && !m.content && !m.images?.length;
        const statusLine = m.status && (
          <p className="text-[13px] text-green-700 inline-flex items-center gap-2 py-1"><ImageIcon size={15} className="animate-pulse" /> {m.status.text}{m.status.seconds ? ` ${m.status.seconds}s` : "…"}</p>
        );
        return (
          <div key={i} className="flex gap-3">
            <SmallOrb />
            <div className="min-w-0 flex-1 pt-0.5">
              {waiting ? (
                statusLine || (m.thinking != null || m.deep ? (
                  <p className="text-[13px] text-green-700 inline-flex items-center gap-2"><Brain size={15} className="animate-pulse" /> Thinking{m.thinking ? ` ${m.thinking}s` : "…"}</p>
                ) : (
                  <div className="flex gap-1 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500/70 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500/70 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500/70 animate-bounce" />
                  </div>
                ))
              ) : (
                <>
                  {m.thoughtSeconds > 0 && <p className="text-[11.5px] text-green-700/80 mb-1 flex items-center gap-1"><Brain size={12} /> Thought for {m.thoughtSeconds}s</p>}
                  <div className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words">{m.content}</div>
                  {m.streaming && statusLine}
                  {m.videos?.length > 0 && m.videos.map((v) => <VideoResult key={v.url} url={v.url} shape={v.shape} />)}
                  {m.images?.length > 0 && (
                    <ImageResults images={m.images} storeId={storeId} callSella={callSella} onEdit={editImage} onAttached={noteAttached} />
                  )}
                  {m.memory?.length > 0 && (
                    <button onClick={() => setView("memory")} className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 hover:bg-green-100">
                      <Brain size={12} /> {m.memory.some((x) => x.saved) ? "Memory updated" : "Forgot something"}
                    </button>
                  )}
                  {m.files?.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5 items-start">
                      {m.files.map((f, j) => {
                        const key = `${i}_${j}`;
                        return (
                          <button key={key} onClick={() => download(f, key)} disabled={downloading !== null} className="inline-flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-xl bg-green-50 text-green-800 border border-green-200 hover:bg-green-100 disabled:opacity-60 text-left">
                            {downloading === key ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download {f.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {m.sources?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.sources.map((s, j) => (
                        <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-700">
                          <ExternalLink size={10} /> {(s.title || s.url).slice(0, 32)}
                        </a>
                      ))}
                    </div>
                  )}
                  {!m.streaming && m.content && (
                    <div className="mt-1.5 flex gap-0.5 text-gray-400">
                      {(canSpeak() || prefs.speechProvider === "spitch") && (
                        <button onClick={() => toggleSpeak(i, m.content)} className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-700" aria-label={speakingIdx === i ? "Stop reading" : "Read aloud"} title={speakingIdx === i ? "Stop reading" : "Read aloud"}>
                          {speakingIdx === i ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                      )}
                      <button onClick={() => copyText(i, m.content)} className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-700" aria-label="Copy" title="Copy">
                        {copiedIdx === i ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
      {reviewCard}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-[13px] text-red-700">{error}</div>}
    </div>
  );

  const disclaimer = (
    <p className="text-[11px] text-gray-400 text-center leading-relaxed">
      By using {assistantName} you agree to our{" "}
      <button onClick={() => setTermsTab("terms")} className="text-gray-500 hover:text-green-700 underline underline-offset-2">Terms of Service</button>
      {" & "}
      <button onClick={() => setTermsTab("privacy")} className="text-gray-500 hover:text-green-700 underline underline-offset-2">Privacy Policy</button>
      . {assistantName} is AI and can make mistakes, so it always asks you to confirm before changing anything.
    </p>
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center sm:p-4 lg:p-8">
          {/* soft brand backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-100/90 via-white/80 to-emerald-200/80 backdrop-blur-md" onClick={() => onClose()} />

          <div className="relative flex w-full h-full sm:h-[min(900px,94vh)] max-w-[1280px] sm:rounded-[30px] bg-white/60 sm:p-2.5 sm:ring-1 ring-black/5 shadow-2xl overflow-hidden">
            {sidebarMobile && <div className="md:hidden absolute inset-0 z-30 bg-black/20" onClick={() => setSidebarMobile(false)} />}
            {sidebar}

            <main className="relative flex-1 min-w-0 flex flex-col bg-white sm:rounded-[24px] sm:ring-1 ring-black/5 overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center gap-2 px-3 sm:px-5 py-3 flex-shrink-0">
                <button onClick={() => setSidebarMobile(true)} className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Open menu"><Menu size={18} /></button>
                {sidebarCollapsed && (
                  <button onClick={toggleSidebar} className="hidden md:inline-flex p-2 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Show sidebar"><PanelLeftOpen size={18} /></button>
                )}
                <div className="relative">
                  <button onClick={() => setModeMenu((o) => !o)} className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-[13.5px] font-semibold text-gray-800 hover:bg-gray-50">
                    <SellaLogo size={24} />
                    <span className="max-w-[9rem] truncate">{assistantName}</span>
                    {mode === "deep" && <span className="text-[10.5px] font-bold text-green-700 bg-green-50 rounded px-1.5 py-0.5">Deep</span>}
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  {modeMenu && (
                    <div className="absolute left-0 top-full mt-1.5 w-72 rounded-2xl border border-gray-200 bg-white shadow-xl p-1.5 z-30">
                      {[
                        ["auto", SellaLogo, "Standard", "Fast, for everyday questions and tasks."],
                        ["deep", Brain, "Deeper Research", "Thinks longer for hard questions. Uses more credits."],
                      ].map(([id, Icon, label, sub]) => (
                        <button key={id} onClick={() => setModePersist(id)} className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-50 text-left">
                          <Icon size={16} className="text-green-600 mt-0.5" />
                          <span className="flex-1">
                            <span className="block text-[13px] font-semibold text-gray-900">{label}</span>
                            <span className="block text-[11.5px] text-gray-500">{sub}</span>
                          </span>
                          {mode === id && <Check size={15} className="text-green-600 mt-0.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                  <button onClick={() => setView("settings")} className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-50 text-green-800 text-[12px] font-semibold hover:bg-green-100" title="Monthly credits">
                    <Coins size={13} /> {credits ? `${fmtCredits(credits.remaining)} credits` : "Credits"}
                  </button>
                  <div className="relative">
                    <button onClick={() => setMoreMenu((o) => !o)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="More"><MoreHorizontal size={18} /></button>
                    {moreMenu && (
                      <div className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl border border-gray-200 bg-white shadow-xl p-1.5 z-30 text-[13px]">
                        <button onClick={() => { newChat(); setMoreMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50">New chat</button>
                        <button onClick={() => { setView("memory"); setMoreMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50">Memory</button>
                        <button onClick={() => { setView("settings"); setMoreMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50">Rename assistant</button>
                        <button onClick={() => { setTermsTab("terms"); setMoreMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50">Terms and privacy</button>
                        {sessionId && messages.length > 0 && (
                          <button onClick={() => { deleteSession(sessionId); setMoreMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600">Delete this chat</button>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={exportChat} disabled={!messages.length} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                    <Download size={14} /> Export chat
                  </button>
                  <button onClick={() => onClose()} className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-[13px] font-semibold inline-flex items-center gap-1.5" aria-label={`Close ${assistantName}`}>
                    <X size={14} /> <span className="hidden sm:inline">Close</span>
                  </button>
                </div>
              </div>

              {/* Body */}
              {view === "chat" && (messages.length === 0 && !pending ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="min-h-full flex flex-col items-center justify-center px-4 sm:px-8 py-8">
                    <Orb size={128} className="mb-6" />
                    <p className="text-[26px] sm:text-[30px] font-semibold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                      {(GREETINGS[prefs.language] || GREETINGS.en).hello}{profile.greetingName ? `, ${profile.greetingName}` : ""}
                    </p>
                    <h2 className="text-[26px] sm:text-[32px] font-bold text-gray-900 tracking-tight text-center">{(GREETINGS[prefs.language] || GREETINGS.en).ask}</h2>
                    <div className="w-full max-w-2xl mt-7">{composer}</div>
                    {error && <div className="w-full max-w-2xl mt-3 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-[13px] text-red-700">{error}</div>}
                    <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                      {SUGGESTIONS.map((s) => (
                        <button key={s.title} onClick={() => send(s.prompt, { web: s.web === true })} className="text-left p-4 rounded-2xl bg-white border border-gray-200 hover:border-green-300 hover:shadow-md hover:shadow-green-500/10 transition-all">
                          <s.icon size={19} className="text-gray-700" />
                          <p className="mt-3 text-[13.5px] font-semibold text-gray-900">{s.title}</p>
                          <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{s.sub}</p>
                        </button>
                      ))}
                    </div>
                    <div className="w-full max-w-2xl mt-6">{disclaimer}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div ref={scrollRef} className="flex-1 overflow-y-auto">{messageList}</div>
                  <div className="flex-shrink-0 px-3 sm:px-6 pb-3 pt-1">
                    <div className="max-w-3xl mx-auto">
                      {composer}
                      <div className="mt-2">{disclaimer}</div>
                    </div>
                  </div>
                </>
              ))}

              {view === "memory" && <MemoryPanel storeId={storeId} callSella={callSella} assistantName={assistantName} />}
              {view === "prompts" && (
                <PromptsPanel
                  storeId={storeId}
                  callSella={callSella}
                  prompts={prompts}
                  setPrompts={setPrompts}
                  initialText={input}
                  onUse={(text) => { setInput(text); setView("chat"); setTimeout(() => inputRef.current?.focus(), 50); }}
                />
              )}
              {view === "settings" && (
                <SettingsPanel
                  assistantName={assistantName}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  saveName={saveName}
                  credits={credits}
                  isOwner={isOwner}
                  staffAccess={staffAccess}
                  savingStaff={savingStaff}
                  toggleStaffAccess={toggleStaffAccess}
                  openTerms={() => setTermsTab("privacy")}
                  prefs={prefs}
                  savePrefs={savePrefs}
                  playSample={(onEnd) => readAloud(voiceSample(prefs.language, prefs.voice, assistantName), onEnd)}
                />
              )}

              {view !== "chat" && (
                <div className="flex-shrink-0 px-5 pb-3">
                  <button onClick={() => setView("chat")} className="text-[12.5px] font-semibold text-green-700 hover:underline">Back to chat</button>
                </div>
              )}

              <button onClick={() => setTermsTab("terms")} className="hidden lg:flex absolute right-5 bottom-5 w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-500 items-center justify-center hover:text-green-700 hover:border-green-300" aria-label="Help, terms and privacy" title="Terms and privacy">
                <HelpCircle size={16} />
              </button>

              <SellaTermsModal
                key={termsTab || "closed"}
                open={!!termsTab}
                initialTab={termsTab || "terms"}
                assistantName={assistantName}
                onClose={() => setTermsTab(null)}
              />
            </main>
          </div>
        </div>
      )}
    </>
  );
}

// Fallback only, for a pending action from an older server build. The server now
// sends pendingAction.summary, which is the source of truth.
function describePending(p) {
  const a = p?.args || {};
  switch (p?.type) {
    case "add_ledger_entry": return `Log a ${money(a.amount)} sale to ${a.customerName} (${a.itemName}) in your Ledger.`;
    case "add_product": return `Add product "${a.name}" priced ${money(a.price)}.`;
    case "add_service": return `Add service "${a.name}" priced ${money(a.price)}.`;
    case "create_discount": return `Create promo code ${String(a.code || "").toUpperCase()} (${a.type === "flat" ? money(a.value) + " off" : a.value + "% off"}).`;
    case "update_order_status": return `Change order ${a.orderId} status to "${a.newStatus}".`;
    case "update_delivery_pickup": return `Update pickup address to ${[a.streetAddress, a.city, a.state].filter(Boolean).join(", ")}.`;
    case "update_store_settings": return `Update store settings: ${Object.keys(a).join(", ")}.`;
    case "update_tab_record": return `Update ${a.tab || "record"}: ${Object.entries(a.changes || {}).map(([k, v]) => `${k} → ${v}`).join(", ")}.`;
    default: return "Make the requested change to your store.";
  }
}
