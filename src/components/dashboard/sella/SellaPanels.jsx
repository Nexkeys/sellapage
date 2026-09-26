// src/components/dashboard/sella/SellaPanels.jsx
// The non-chat views of the Sella workspace: Memory, Saved prompts, Settings.

import { useEffect, useState } from "react";
import { Brain, Trash2, Pencil, Check, X, Loader2, Plus, Bookmark, Users, ShieldAlert, Coins, Languages, Volume2, Square } from "lucide-react";
import { LANGUAGE_OPTIONS } from "./languages";
import { stopSpeaking } from "../../../utils/sellaVoice";

const fmtCredits = (n) => (n == null ? "" : Math.floor(Number(n)).toLocaleString("en-NG"));

function PanelShell({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><Icon size={19} /></span>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        {subtitle && <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Memory
export function MemoryPanel({ storeId, callSella, assistantName }) {
  const [items, setItems] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null); // { id, text }
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    callSella({ storeId, action: "memories" })
      .then((d) => { if (live) { setItems(d.memories || []); setCanEdit(d.canEdit === true); } })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [storeId, callSella]);

  const run = async (key, payload) => {
    setBusy(key);
    setError("");
    try {
      const d = await callSella({ storeId, ...payload });
      setItems(d.memories || []);
      return true;
    } catch (e) {
      setError(e.data?.error || e.message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <PanelShell
      icon={Brain}
      title="Memory"
      subtitle={`What ${assistantName} remembers about your business across every chat. It saves things you tell it to remember, and uses them in its answers. You can edit or delete anything here.`}
    >
      {canEdit && (
        <div className="flex gap-2 mb-4">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={300}
            placeholder="Add something to remember, e.g. My supplier is in Onitsha"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15"
          />
          <button
            disabled={!draft.trim() || busy === "add"}
            onClick={async () => { if (await run("add", { action: "memory-add", text: draft })) setDraft(""); }}
            className="px-4 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            {busy === "add" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </button>
        </div>
      )}
      {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}
      {loading ? (
        <div className="py-12 flex justify-center text-gray-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-10 px-6 text-center">
          <p className="text-sm font-semibold text-gray-800">Nothing remembered yet</p>
          <p className="text-[13px] text-gray-500 mt-1">Tell {assistantName} something like "remember that I never discount above 20%".</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3">
              <Brain size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
              {editing?.id === m.id ? (
                <div className="flex-1 flex gap-2">
                  <input value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} maxLength={300} className="flex-1 px-2 py-1 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-green-500" />
                  <button onClick={async () => { if (await run(m.id, { action: "memory-update", id: m.id, text: editing.text })) setEditing(null); }} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50" aria-label="Save"><Check size={15} /></button>
                  <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Cancel"><X size={15} /></button>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-[13px] text-gray-800 leading-relaxed">{m.text}</p>
                  {canEdit && (
                    <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditing({ id: m.id, text: m.text })} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="Edit"><Pencil size={14} /></button>
                      <button onClick={() => run(m.id, { action: "memory-delete", id: m.id })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" aria-label="Delete">
                        {busy === m.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {!canEdit && !loading && <p className="mt-4 text-[12px] text-gray-400">Only the store owner can change what {assistantName} remembers.</p>}
    </PanelShell>
  );
}

// ---------------------------------------------------------------- Saved prompts
export function PromptsPanel({ storeId, callSella, prompts, setPrompts, onUse, initialText = "" }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy("save");
    setError("");
    try {
      const d = await callSella({ storeId, action: "prompt-save", title, text });
      setPrompts((p) => [d.prompt, ...p]);
      setTitle("");
      setText("");
    } catch (e) {
      setError(e.data?.error || e.message);
    } finally {
      setBusy(null);
    }
  };
  const remove = async (id) => {
    setBusy(id);
    try {
      await callSella({ storeId, action: "prompt-delete", id });
      setPrompts((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.data?.error || e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <PanelShell icon={Bookmark} title="Saved prompts" subtitle="Save the requests you make often and send them again in one tap. Everyone on your store who uses the assistant sees these.">
      <div className="rounded-2xl border border-gray-200 bg-white p-3.5 mb-5">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Name (optional), e.g. Monday report" className="w-full px-2 py-1.5 text-[13px] font-semibold outline-none border-b border-gray-100 mb-2" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} placeholder="The prompt, e.g. Summarise last week's sales and tell me what to restock." className="w-full px-2 py-1 text-[13px] outline-none resize-none" />
        <div className="flex justify-end">
          <button onClick={save} disabled={!text.trim() || busy === "save"} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5">
            {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save prompt
          </button>
        </div>
      </div>
      {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}
      {prompts.length === 0 ? (
        <p className="text-[13px] text-gray-400 text-center py-8">No saved prompts yet.</p>
      ) : (
        <ul className="space-y-2">
          {prompts.map((p) => (
            <li key={p.id} className="group rounded-xl border border-gray-200 bg-white px-3.5 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{p.title}</p>
                <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{p.text}</p>
              </div>
              <button onClick={() => onUse(p.text)} className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-[11.5px] font-bold hover:bg-green-100">Use</button>
              <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" aria-label="Delete prompt">
                {busy === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

// ---------------------------------------------------------------- Settings
export function SettingsPanel({
  assistantName, renameValue, setRenameValue, saveName,
  credits, isOwner, staffAccess, savingStaff, toggleStaffAccess, openTerms,
  prefs = { language: "en", voice: "female", speechProvider: "device" }, savePrefs = () => {}, playSample = () => {},
}) {
  const [sampling, setSampling] = useState(false);
  const pct = credits?.included ? Math.min(100, Math.round((credits.used / credits.included) * 100)) : 0;
  const resetLabel = credits?.resetsAt
    ? new Date(credits.resetsAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", timeZone: "Africa/Lagos" })
    : "";
  return (
    <PanelShell icon={Coins} title="Settings" subtitle="Your assistant's name, language and voice, your monthly credits, and who on your team can use it.">
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assistant name</label>
          <div className="flex gap-2 mt-2">
            <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={40} className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500" placeholder="Sella AI" />
            <button onClick={saveName} className="px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold inline-flex items-center gap-1.5"><Pencil size={12} /> Save</button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Languages size={12} /> Language and voice</p>
          <p className="text-[12px] text-gray-500 mt-1.5 leading-relaxed">{assistantName} replies in the language you pick, and reads replies aloud in the voice you pick. This is your own setting; your staff choose theirs.</p>
          <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Language">
            {LANGUAGE_OPTIONS.map((l) => (
              <button
                key={l.id}
                role="radio"
                aria-checked={prefs.language === l.id}
                onClick={() => savePrefs({ language: l.id })}
                className={`px-3 py-1.5 rounded-xl border text-[12.5px] font-semibold transition-colors ${prefs.language === l.id ? "border-green-500 bg-green-50 text-green-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-gray-200 p-0.5" role="radiogroup" aria-label="Voice">
              {[["female", "Female voice"], ["male", "Male voice"]].map(([id, label]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={prefs.voice === id}
                  onClick={() => savePrefs({ voice: id })}
                  className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${prefs.voice === id ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { if (sampling) { stopSpeaking(); setSampling(false); return; } setSampling(true); playSample(() => setSampling(false)); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              {sampling ? <Square size={12} fill="currentColor" /> : <Volume2 size={14} />} Hear a sample
            </button>
          </div>
          {prefs.speechProvider !== "spitch" && ["yo", "ig", "ha"].includes(prefs.language) && (
            <p className="text-[11.5px] text-amber-700 mt-2.5 leading-relaxed">Replies will be written in this language. Reading them aloud uses your device's voice, which does not speak it well yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Monthly credits</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">{credits ? `${fmtCredits(credits.remaining)} left` : "…"}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-green-500"}`} style={{ width: `${credits ? 100 - pct : 100}%` }} />
          </div>
          <p className="text-[12px] text-gray-500 mt-2.5 leading-relaxed">
            {credits ? (
              <>
                You have used <b className="text-gray-800">{fmtCredits(credits.used)}</b> of <b className="text-gray-800">{fmtCredits(credits.included)}</b> credits this month
                {credits.topup > 0 ? <>, plus <b className="text-gray-800">{fmtCredits(credits.topup)}</b> extra credits</> : null}.
                {resetLabel && <> They reset on {resetLabel}.</>}
              </>
            ) : "Loading your credits…"}
          </p>
          <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">
            Each message uses credits based on how much work it takes. A quick question uses about 1 to 3, reading a big file or Deeper Research uses more. Confirming a change is free.
          </p>
        </div>

        {isOwner && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Users size={12} /> Staff access</p>
                <p className="text-[13px] text-gray-700 mt-2">Let your team use <b>{assistantName}</b>.</p>
              </div>
              <button
                role="switch"
                aria-checked={staffAccess}
                aria-label="Let staff use this assistant"
                disabled={savingStaff}
                onClick={() => toggleStaffAccess(!staffAccess)}
                className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${staffAccess ? "bg-green-500" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${staffAccess ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            <p className="text-[12px] text-gray-500 mt-3 leading-relaxed">
              Staff only ever reach the tabs their role already allows, and a member with read-only access cannot use {assistantName} to make changes.
            </p>
            {staffAccess && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <p className="text-[12px] text-amber-800 leading-relaxed flex gap-2">
                  <ShieldAlert size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Questions your staff ask send store data, including customer names, phone numbers and addresses, to third-party AI
                    providers outside Nigeria. You remain responsible for that data under the NDPA 2023.{" "}
                    <button onClick={openTerms} className="underline underline-offset-2">What gets shared</button>
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
          <p className="text-[13px] text-gray-700 leading-relaxed">
            <b className="text-green-700">{assistantName}</b> can read your entire dashboard and make changes on your request, but it always shows you a confirmation before saving anything.
          </p>
        </div>
      </div>
    </PanelShell>
  );
}
