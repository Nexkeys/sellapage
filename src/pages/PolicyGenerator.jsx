import { useMemo, useState } from 'react'
import { Copy, FileText, ShieldCheck } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function PolicyGenerator() {
  const [businessName, setBusinessName] = useState('Your Business')
  const [refundWindow, setRefundWindow] = useState('48 hours')
  const [deliveryWindow, setDeliveryWindow] = useState('1 to 3 working days')
  const [paymentMethods, setPaymentMethods] = useState('bank transfer, card payment, and cash on delivery where available')
  const [exchangeAllowed, setExchangeAllowed] = useState('yes')
  const [customNote, setCustomNote] = useState('Items must be returned unused and in good condition.')

  const policy = useMemo(() => {
    const name = businessName.trim() || 'This business'
    const exchangeLine = exchangeAllowed === 'yes'
      ? 'Exchanges are accepted when the item is unused, in good condition, and reported within the refund window.'
      : 'Exchanges are not available unless the wrong item was supplied or the item arrived damaged.'

    const full = `${name} Customer Policy

Orders
Customers should confirm product or service details before payment. Once an order is confirmed, we begin processing immediately.

Payment
We accept ${paymentMethods.trim() || 'available payment methods confirmed by the seller'}. Orders are processed after payment confirmation, except where pay-on-delivery has been agreed.

Delivery and pickup
Delivery usually takes ${deliveryWindow.trim() || 'the agreed delivery window'} after payment confirmation. Delivery fees depend on the customer's location. Pickup may be arranged where available.

Refunds and exchanges
Refund or exchange requests must be made within ${refundWindow.trim() || 'the stated refund window'} after delivery or service confirmation. ${exchangeLine}

Customer responsibility
Customers should provide correct names, phone numbers, delivery details, sizes, colours, dates, or booking information. ${customNote.trim() || 'Extra terms may apply based on the order.'}

Support
For questions, customers should contact us through our Sellapage link or WhatsApp contact channel.`

    const short = `${name}: Orders are processed after payment confirmation. Delivery takes ${deliveryWindow}. Refund or exchange requests must be made within ${refundWindow}. ${exchangeLine}`

    const whatsapp = `Hi, here is our order policy:

- Payment: ${paymentMethods}
- Delivery: ${deliveryWindow}
- Refund/exchange window: ${refundWindow}
- ${exchangeLine}
- ${customNote}`

    return { full, short, whatsapp }
  }, [businessName, customNote, deliveryWindow, exchangeAllowed, paymentMethods, refundWindow])

  const copy = text => navigator.clipboard?.writeText(text)

  return (
    <div className="min-h-screen bg-[#f7fbf6] text-gray-950">
      <Navbar />
      <main className="pt-10">
        <section className="px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                  <ShieldCheck size={13} /> Policy tool
                </span>
                <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-gray-950 md:text-5xl">
                  Create clear customer terms before the first dispute.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
                  Generate a full customer policy, a short page summary, and a WhatsApp-ready version for refunds, delivery, exchanges, and payment expectations.
                </p>
              </div>

              <div className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-xl shadow-emerald-100/70">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Business name</span>
                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Refund window</span>
                    <input value={refundWindow} onChange={e => setRefundWindow(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Delivery window</span>
                    <input value={deliveryWindow} onChange={e => setDeliveryWindow(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Exchange policy</span>
                    <select value={exchangeAllowed} onChange={e => setExchangeAllowed(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
                      <option value="yes">Allow exchanges</option>
                      <option value="no">Only for wrong or damaged items</option>
                    </select>
                  </label>
                </div>
                <label className="mt-4 block">
                  <span className="text-xs font-bold text-gray-700">Payment methods</span>
                  <input value={paymentMethods} onChange={e => setPaymentMethods(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                </label>
                <label className="mt-4 block">
                  <span className="text-xs font-bold text-gray-700">Extra customer note</span>
                  <textarea value={customNote} onChange={e => setCustomNote(e.target.value)} rows={3} className="mt-1 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            {[
              ['Full policy', policy.full, 'lg:col-span-2'],
              ['Short summary', policy.short, ''],
              ['WhatsApp version', policy.whatsapp, 'lg:col-span-3'],
            ].map(([label, text, classes]) => (
              <div key={label} className={`rounded-[26px] border border-emerald-100 bg-white p-6 shadow-sm ${classes}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-600" />
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{label}</p>
                  </div>
                  <button onClick={() => copy(text)} className="rounded-full bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100" aria-label={`Copy ${label}`}>
                    <Copy size={15} />
                  </button>
                </div>
                <pre className="mt-4 whitespace-pre-wrap font-body text-sm leading-7 text-gray-700">{text}</pre>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
