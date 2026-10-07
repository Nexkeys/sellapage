// src/receipts/ReceiptCard.jsx
//
// A Sellapage receipt on screen: the same design as the PDF (ReceiptPdf.jsx),
// drawn from the same data (receiptModel.js), for receipts opened inside the
// dashboard. "Download PDF" saves the matching file.
import { useEffect, useState } from 'react'
import { User, CalendarDays, MapPin, CreditCard, MessageCircle, ShieldCheck, CheckCircle2, FileText, ShoppingBag, Sparkles, Clock, Download, Loader2 } from 'lucide-react'
import { ngn, fmtDay } from './receiptModel'

const LINE_ICON = { calendar: CalendarDays, pin: MapPin, clock: Clock }

function useQr(url) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let alive = true
    if (!url) return undefined
    import('qrcode').then((QR) => QR.toDataURL(url, { margin: 0, width: 240, color: { dark: '#034e22', light: '#ffffff' } })).then((d) => { if (alive) setSrc(d) }).catch(() => {})
    return () => { alive = false }
  }, [url])
  return src
}

function Dot({ icon: Icon }) {
  return <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#e4f2e9] text-[#0b6b35]"><Icon size={18} /></span>
}

export default function ReceiptCard({ r, onDownload, downloading = false }) {
  const qr = useQr(r.qr?.url)
  const paid = r.status === 'PAID'
  const DetailIcon = r.kind === 'order' ? ShoppingBag : r.kind === 'credits' ? Sparkles : CalendarDays
  return (
    <article className="relative overflow-hidden rounded-3xl bg-[#f7f8f5] p-4 font-body text-[#10291c] sm:p-6">
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-36 w-24 rotate-[30deg] rounded-[100%] bg-[#dcefe2]/80" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-24 -rotate-[40deg] rounded-[100%] bg-[#dcefe2]/80" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 pr-10">
          <span className="flex items-center gap-2"><img src="/receipt/sp-mark.png" alt="" className="h-6 w-6" /><span className="font-display text-[16px] font-extrabold">Sellapage</span></span>
          <span className="hidden items-center gap-2 text-[12px] text-[#6b7d72] sm:flex"><span className="h-px w-4 bg-[#6b7d72]" />Business made simpler.</span>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {r.issuer.logoUrl
              ? <img src={r.issuer.logoUrl} alt="" className={`h-16 w-16 flex-shrink-0 rounded-2xl sm:h-20 sm:w-20 ${r.issuer.isSellapage ? 'bg-white object-contain p-2.5' : 'object-cover'}`} />
              : <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-[#e4f2e9] font-display text-[22px] font-extrabold text-[#0b6b35] sm:h-20 sm:w-20">{r.issuer.initials}</span>}
            <div className="min-w-0">
              <p className="break-words font-display text-[22px] font-extrabold leading-tight sm:text-[26px]">{r.issuer.name}</p>
              <p className="text-[14px] text-[#6b7d72]">{r.title}</p>
              <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold tracking-wide ${paid ? 'bg-[#d8eedf] text-[#0b6b35]' : 'bg-amber-100 text-amber-800'}`}>{paid ? <CheckCircle2 size={14} /> : <Clock size={14} />}{r.status}</span>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-[12px] sm:w-56 sm:grid-cols-1 sm:border-l sm:border-[#e2e9e4] sm:pl-5">
            <div className="flex gap-2"><CalendarDays size={14} className="mt-0.5 flex-shrink-0 text-[#6b7d72]" /><div><dt className="text-[#6b7d72]">Receipt date</dt><dd className="font-bold">{fmtDay(r.date)}</dd></div></div>
            <div className="flex min-w-0 gap-2"><FileText size={14} className="mt-0.5 flex-shrink-0 text-[#6b7d72]" /><div className="min-w-0"><dt className="text-[#6b7d72]">Receipt ID</dt><dd className="truncate font-bold" title={r.receiptId}>{r.receiptId || r.receiptIdNote || '-'}</dd>
              {r.paymentRef && <><dt className="mt-1.5 text-[#6b7d72]">Payment ref</dt><dd className="break-all font-bold">{r.paymentRef}</dd></>}</div></div>
          </dl>
        </div>

        <div className="mt-5 space-y-2.5">
          <section className="flex items-start gap-3 rounded-2xl border border-[#e2e9e4] bg-white p-4">
            <Dot icon={User} />
            <div className="min-w-0"><p className="text-[12.5px] font-bold">{r.party.label}</p><p className="break-words font-display text-[17px] font-bold text-[#034e22]">{r.party.name}</p>{r.party.sub && <p className="break-all text-[12.5px] text-[#6b7d72]">{r.party.sub}</p>}</div>
          </section>
          <section className="flex items-start gap-3 rounded-2xl border border-[#e2e9e4] bg-white p-4">
            <Dot icon={DetailIcon} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold">{r.detail.label}</p>
              <p className="break-words font-display text-[17px] font-bold text-[#034e22]">{r.detail.title}</p>
              {r.detail.lines.map((l, i) => { const I = LINE_ICON[l.icon] || CalendarDays; return <p key={i} className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[#334a3d]"><I size={13} className="flex-shrink-0 text-[#6b7d72]" />{l.text}</p> })}
              {r.detail.items.length > 0 && (
                <ul className="mt-3 divide-y divide-[#e2e9e4] border-t border-[#e2e9e4] text-[13px]">
                  {r.detail.items.map((it, i) => <li key={i} className="flex items-start gap-3 py-1.5"><span className="min-w-0 flex-1">{it.name}{it.note && <span className="block text-[11.5px] text-[#6b7d72]">{it.note}</span>}</span><span className="text-[#6b7d72]">x{it.qty}</span><span className="w-28 text-right tabular-nums">{ngn(it.amount)}</span></li>)}
                </ul>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-[#e2e9e4] bg-white p-4">
            <p className="font-display text-[16px] font-bold">Payment breakdown</p>
            <div className="mt-2 border-t border-[#e2e9e4] pt-2 text-[13.5px]">
              {r.breakdown.map((b) => <p key={b.label} className="flex justify-between gap-3 py-1"><span className="text-[#334a3d]">{b.label}</span><span className="tabular-nums">{ngn(b.amount)}</span></p>)}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-[#eaf5ee] px-4 py-3"><span className="font-display text-[16px] font-bold text-[#034e22]">Grand total</span><span className="font-display text-[24px] font-extrabold tabular-nums text-[#034e22]">{ngn(r.total)}</span></div>
          </section>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <section className="flex items-start gap-3 rounded-2xl border border-[#e2e9e4] bg-white p-4">
              <Dot icon={CreditCard} />
              <div><p className="text-[12px] text-[#6b7d72]">Payment method</p><p className="font-display text-[17px] font-bold text-[#034e22]">{r.method.name}</p><span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#e4f2e9] px-2 py-0.5 text-[11.5px] text-[#0b6b35]"><ShieldCheck size={12} />{r.method.note}</span></div>
            </section>
            <section className="flex items-center gap-3 rounded-2xl border border-[#e2e9e4] bg-white p-4">
              <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-[#e2e9e4] bg-white p-1.5">{qr ? <img src={qr} alt="QR code" className="h-full w-full" /> : <Loader2 size={16} className="animate-spin text-[#6b7d72]" />}</span>
              <div className="min-w-0"><p className="text-[14px] font-bold">{r.qr.title}</p><p className="text-[12.5px] text-[#6b7d72]">{r.qr.text}</p></div>
            </section>
          </div>
          {(r.contact || r.note) && (
            <section className="flex flex-col gap-3 rounded-2xl border border-[#e2e9e4] bg-white p-4 sm:flex-row sm:items-center">
              {r.contact && <div className="flex flex-1 items-start gap-3"><Dot icon={MessageCircle} /><div><p className="text-[12px] text-[#6b7d72]">{r.contact.label}</p><p className="text-[15px] font-bold">{r.contact.channel}</p><p className="text-[13px] text-[#334a3d]">{r.contact.value}</p></div></div>}
              {r.note && <p className="flex-1 -rotate-3 text-center text-[20px] text-[#0b6b35]" style={{ fontFamily: '"Caveat", cursive' }}>{r.note}</p>}
            </section>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3 text-[13.5px] text-[#334a3d]"><span className="h-px flex-1 bg-[#e2e9e4]" /><span className="text-center">{r.thanks}</span><span className="h-px flex-1 bg-[#e2e9e4]" /></div>
        <p className="mt-2 flex items-center justify-center gap-1.5 font-display text-[14px] font-extrabold"><img src="/receipt/sp-mark.png" alt="" className="h-5 w-5" />Sellapage</p>
        <p className="text-center text-[11.5px] text-[#6b7d72]">Powered by Sellapage</p>
        {onDownload && (
          <button type="button" onClick={onDownload} disabled={downloading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#034e22] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#0b6b35] disabled:opacity-60">
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download PDF
          </button>
        )}
      </div>
    </article>
  )
}
