// src/components/dashboard/sella/ImageTools.jsx
// Images Sella made, shown under its reply, with the three things a vendor
// does next: download it, put it on a product or service, or ask for changes.

import { useEffect, useMemo, useState } from "react";
import { Download, ImagePlus, PenLine, X, Search, Loader2, Check, Package } from "lucide-react";

const ASPECT_CLASS = { square: "aspect-square", portrait: "aspect-[3/4]", story: "aspect-[9/16]", landscape: "aspect-video", wide: "aspect-[3/2]" };

// Cloudinary serves a file as a download when fl_attachment is in its URL, so
// no blob juggling is needed and it works the same on phones.
const downloadUrl = (url) => url.replace("/upload/", "/upload/fl_attachment/");

function ListingPicker({ storeId, callSella, imageUrl, onClose, onDone }) {
  const [listings, setListings] = useState(null);
  const [q, setQ] = useState("");
  const [makeMain, setMakeMain] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    callSella({ storeId, action: "listings" })
      .then((d) => live && setListings(d.listings || []))
      .catch((e) => live && setError(e.data?.error || e.message));
    return () => { live = false; };
  }, [storeId, callSella]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (listings || []).filter((l) => !s || l.name.toLowerCase().includes(s)).slice(0, 80);
  }, [listings, q]);

  const attach = async (l) => {
    setBusy(l.id);
    setError("");
    try {
      await callSella({ storeId, action: "attach-image", target: { collection: l.collection, id: l.id }, imageUrl, makeMain });
      onDone(`Photo added to "${l.name}"${makeMain ? " as its main photo" : ""}.`);
    } catch (e) {
      setError(e.data?.error || e.message);
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-6" onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
          <img src={imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover border border-gray-200" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-gray-900">Add to a listing</p>
            <p className="text-[12px] text-gray-500">Choose the product or service for this photo.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="px-4 pt-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your listings" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-green-400" />
          </div>
          <label className="flex items-center gap-2 mt-2.5 text-[12.5px] text-gray-700 cursor-pointer">
            <input type="checkbox" checked={makeMain} onChange={(e) => setMakeMain(e.target.checked)} className="accent-green-600" />
            Make it the main photo
          </label>
          {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {listings === null ? (
            <div className="py-10 flex justify-center text-gray-400"><Loader2 size={18} className="animate-spin" /></div>
          ) : shown.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-gray-400">{q ? "No listings match that." : "You have no products or services yet."}</p>
          ) : shown.map((l) => (
            <button key={`${l.collection}_${l.id}`} onClick={() => attach(l)} disabled={busy !== null} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-60 text-left">
              {l.imageUrl
                ? <img src={l.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                : <span className="w-10 h-10 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center"><Package size={16} /></span>}
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-gray-900 truncate">{l.name}</span>
                <span className="block text-[11px] text-gray-400 capitalize">{l.collection === "services" ? "Service" : "Product"}</span>
              </span>
              {busy === l.id ? <Loader2 size={15} className="animate-spin text-green-600" /> : <ImagePlus size={15} className="text-gray-400" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ImageResults({ images, storeId, callSella, onEdit, onAttached }) {
  const [picking, setPicking] = useState(null); // url
  const [added, setAdded] = useState({}); // url -> true
  const cols = images.length > 1 ? "grid-cols-2" : "grid-cols-1";
  return (
    <>
      <div className={`mt-3 grid ${cols} gap-2.5 max-w-md`}>
        {images.map((img) => (
          <div key={img.url} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <a href={img.url} target="_blank" rel="noopener noreferrer" className={`block bg-gray-50 ${ASPECT_CLASS[img.aspect] || "aspect-square"}`}>
              <img src={img.url} alt={img.mode === "enhance" ? "Improved photo" : "Image created by Sella"} className="w-full h-full object-cover" loading="lazy" />
            </a>
            <div className="flex items-stretch divide-x divide-gray-100 border-t border-gray-100 text-[11.5px] font-semibold">
              <a href={downloadUrl(img.url)} className="flex-1 inline-flex items-center justify-center gap-1 py-2 text-gray-600 hover:bg-gray-50 hover:text-green-700" aria-label="Download image" title="Save to your device">
                <Download size={13} /> <span className="hidden min-[400px]:inline">Save</span>
              </a>
              <button onClick={() => setPicking(img.url)} className="flex-1 inline-flex items-center justify-center gap-1 py-2 text-gray-600 hover:bg-gray-50 hover:text-green-700" aria-label="Add to a listing" title="Use on a product or service">
                {added[img.url] ? <Check size={13} className="text-green-600" /> : <ImagePlus size={13} />} <span className="hidden min-[400px]:inline">{added[img.url] ? "Added" : "Use"}</span>
              </button>
              <button onClick={() => onEdit(img.url)} className="flex-1 inline-flex items-center justify-center gap-1 py-2 text-gray-600 hover:bg-gray-50 hover:text-green-700" aria-label="Edit this image" title="Ask for changes">
                <PenLine size={13} /> <span className="hidden min-[400px]:inline">Edit</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      {picking && (
        <ListingPicker
          storeId={storeId}
          callSella={callSella}
          imageUrl={picking}
          onClose={() => setPicking(null)}
          onDone={(msg) => { setAdded((a) => ({ ...a, [picking]: true })); setPicking(null); onAttached(msg); }}
        />
      )}
    </>
  );
}
