//src/pages/PolicyGenerator.jsx/
import { useMemo, useState } from 'react'
import { Copy, FileText, ShieldCheck, CheckCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'

export default function PolicyGenerator() {
  // Store setup
  const [businessName, setBusinessName] = useState('Your Business')
  const [deliveryModel, setDeliveryModel] = useState('island-mainland') // island-mainland, nationwide, pickup
  const [processingTime, setProcessingTime] = useState('standard') // fast-track, standard, preorder
  const [paymentModel, setPaymentModel] = useState('pbd') // pbd (payment before delivery), split, pod
  const [refundStrategy, setRefundStrategy] = useState('size-exchange') // no-refunds, size-exchange, unboxing-only
  const [saleExclusion, setSaleExclusion] = useState(true) // sale items are final
  const [logisticShield, setLogisticShield] = useState(true) // courier delay disclaimer

  const policy = useMemo(() => {
    const name = businessName.trim() || 'Our Store'

    // 1. Delivery
    let deliveryClause = ""
    let deliverySummary = ""
    if (deliveryModel === 'island-mainland') {
      deliveryClause = "Delivery to Lagos Island and Lagos Mainland are charged at different rates. Please pick the correct area at checkout. If the wrong area is selected, we will hold the order until the balance is settled."
      deliverySummary = "Island and Mainland rates are different. Pick the correct area at checkout."
    } else if (deliveryModel === 'pickup') {
      deliveryClause = "Orders are collected in person at our pickup point. We send you the address and a collection time on WhatsApp or email once your payment comes in."
      deliverySummary = "Pickup only. We send the address once payment comes in."
    } else {
      deliveryClause = "We ship nationwide through courier partners. Delivery to major cities takes 3 to 5 working days. For some locations you may need to collect from the courier office closest to you."
      deliverySummary = "Nationwide delivery takes 3 to 5 working days. Some areas require pickup at the courier office."
    }

    // 2. Processing time
    let timelineClause = ""
    if (processingTime === 'fast-track') {
      timelineClause = "Orders paid for before 12 PM are packed the same day and go out the next morning."
    } else if (processingTime === 'preorder') {
      timelineClause = "This item is made or restocked after you order it. Please allow 7 to 14 working days before it ships."
    } else {
      timelineClause = "We pack your order and hand it to the courier within 24 to 48 hours of your payment."
    }

    // 3. Payment
    let paymentClause = ""
    if (paymentModel === 'pbd') {
      paymentClause = "We only accept payment before delivery. Your order is packed and sent out once your payment reflects."
    } else if (paymentModel === 'split') {
      paymentClause = "Pay 50% to start your order and the balance before we send it out. The first 50% is not refundable once work has started."
    } else {
      paymentClause = "Pay on delivery is available in selected areas only. Please have the money ready and pay the rider before the package is opened."
    }

    // 4. Returns and exchanges
    let refundClause = ""
    let exchangeLine = ""
    if (refundStrategy === 'no-refunds') {
      refundClause = "All sales are final and we do not give refunds. Please check the size, colour, and details carefully before you pay."
      exchangeLine = "We only replace an item if we sent you the wrong thing."
    } else if (refundStrategy === 'unboxing-only') {
      refundClause = "We only review refund or store credit requests if you send a clear unboxing video, recorded in one take, within 24 hours of delivery."
      exchangeLine = "Without that video we cannot honour a claim for a missing, damaged, or wrong item."
    } else {
      refundClause = "You can exchange for a different size within 48 hours of delivery. The item must be unworn, unwashed, and still have its tags on."
      exchangeLine = "You cover the delivery cost both ways for an exchange."
    }

    // 5. Optional clauses
    const saleBlock = saleExclusion 
      ? "\n\nSALE AND DISCOUNTED ITEMS\nAnything bought during a sale, flash sale, or discount run is final. Sale items cannot be exchanged or returned."
      : ""

    const logisticsBlock = logisticShield
      ? "\n\nDELIVERY DELAYS\nWe deliver through courier and dispatch partners. We follow up on every order, but once a parcel leaves us we cannot control delays caused by traffic, weather, or the rider."
      : ""

    // --- OUTPUT FORMATS ---

    // A: full terms for the store page
    const full = `${name.toUpperCase()} STORE POLICY

1. Payment
${paymentClause}

2. Delivery and Timing
${timelineClause} ${deliveryClause}${logisticsBlock}

3. Returns and Exchanges
${refundClause} ${exchangeLine}${saleBlock}

4. Your Details
Please give us a correct phone number, WhatsApp number, and full address. We cannot be held responsible for a delivery that fails because the contact details were wrong or unreachable.`

    // B: short version, sized for an Instagram highlight screenshot
    const short = `${name.toUpperCase()} STORE TERMS

💳 PAYMENT MODEL
• ${paymentModel === 'pbd' ? 'Payment before delivery only' : paymentModel === 'split' ? '50% upfront, balance before we ship' : 'Pay on delivery in selected areas'}
• No payment, no delivery.

🚚 DELIVERY
• ${deliverySummary}
• Allow ${processingTime === 'preorder' ? '7 to 14 days to make your item' : '24 to 48 hours before it ships'}.

🔄 RETURNS
• ${refundStrategy === 'no-refunds' ? 'No refunds or exchanges' : refundStrategy === 'unboxing-only' ? 'Unboxing video required within 24 hours' : 'Size swaps allowed within 48 hours'}
• ${saleExclusion ? 'Sale items are final.' : 'These terms apply to every order.'}`

    // C: WhatsApp message, using WhatsApp markdown
    const whatsapp = `*🧾 ${name.toUpperCase()} - ORDER TERMS*

Thank you for your order. Here is how we work:

*1. Timing*
• ${timelineClause}

*2. Delivery*
• ${deliverySummary}
${logisticShield ? '• _We deliver through dispatch partners, so delays from traffic or weather are outside our control._' : ''}

*3. Payment*
• ${paymentClause}

*4. Returns*
• ${refundStrategy === 'no-refunds' ? 'All sales are final. We do not accept returns.' : refundStrategy === 'unboxing-only' ? 'Any claim needs a clear, unedited unboxing video.' : 'Size swaps need the item unworn with tags on. You cover delivery both ways.'}
${saleExclusion ? '\n⚠️ *Note:* Sale and discounted items cannot be swapped or returned.' : ''}

_Paying for your order means you agree to these terms._`

    return { full, short, whatsapp }
  }, [businessName, deliveryModel, processingTime, paymentModel, refundStrategy, saleExclusion, logisticShield])

  const copy = text => navigator.clipboard?.writeText(text)

  return (
    <div className="min-h-screen bg-[#f7fbf6] text-gray-950">
      <SEO
        title="Policy Generator"
        description="Generate professional store policies for your business. Create return, shipping, and privacy policies in minutes."
        url="/tools/policy-generator"
        keywords="store policy generator, return policy generator, privacy policy generator nigeria"
      />
      <Navbar />
      <main className="pt-10">
        <section className="px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                  <ShieldCheck size={13} /> Free tool
                </span>
                <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-gray-950 md:text-5xl">
                  Set your store rules before a customer tries to bend them.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
                  Answer a few questions about how you actually run your store. You get terms for your store page, a short version for your Instagram highlight, and a message to send on WhatsApp after checkout.
                </p>
              </div>

              {/* Controls */}
              <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-100/70 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Business Name</span>
                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Delivery</span>
                    <select value={deliveryModel} onChange={e => setDeliveryModel(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
                      <option value="island-mainland">Lagos Split (Island vs Mainland)</option>
                      <option value="nationwide">Nationwide Courier Delivery</option>
                      <option value="pickup">Hub / Warehouse Pickup Only</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">How fast you ship</span>
                    <select value={processingTime} onChange={e => setProcessingTime(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
                      <option value="fast-track">Next day</option>
                      <option value="standard">24 to 48 hours</option>
                      <option value="preorder">Pre-order (7 to 14 days)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Payment</span>
                    <select value={paymentModel} onChange={e => setPaymentModel(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
                      <option value="pbd">Payment Before Delivery (PBD)</option>
                      <option value="split">50% deposit, balance later</option>
                      <option value="pod">Pay on delivery (POD)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Returns</span>
                    <select value={refundStrategy} onChange={e => setRefundStrategy(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
                      <option value="size-exchange">Allow size swaps</option>
                      <option value="unboxing-only">Require an unboxing video</option>
                      <option value="no-refunds">No returns at all</option>
                    </select>
                  </label>
                </div>

                {/* Optional clauses */}
                <div className="pt-2 grid gap-3 sm:grid-cols-2">
                  <button 
                    onClick={() => setSaleExclusion(!saleExclusion)} 
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${saleExclusion ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950' : 'border-gray-200 text-gray-500'}`}
                  >
                    <CheckCircle size={18} className={saleExclusion ? 'text-emerald-600' : 'text-gray-300'} />
                    <div>
                      <p className="text-xs font-bold">Sale items are final</p>
                      <p className="text-[10px] opacity-80">No swaps or returns on discounted items.</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setLogisticShield(!logisticShield)} 
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${logisticShield ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950' : 'border-gray-200 text-gray-500'}`}
                  >
                    <CheckCircle size={18} className={logisticShield ? 'text-emerald-600' : 'text-gray-300'} />
                    <div>
                      <p className="text-xs font-bold">Cover courier delays</p>
                      <p className="text-[10px] opacity-80">States that rider and traffic delays are not your fault.</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Output */}
        <section className="px-4 pb-16">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            {[
              ['For your store page', policy.full, 'lg:col-span-2'],
              ['For your Instagram highlight', policy.short, ''],
              ['To send on WhatsApp', policy.whatsapp, 'lg:col-span-3'],
            ].map(([label, text, classes], i) => (
              <Reveal key={label} delay={i * 100} className={`rounded-[26px] border border-emerald-100 bg-white p-6 shadow-sm transition-all hover:shadow-md ${classes}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-600" />
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{label}</p>
                  </div>
                  <button onClick={() => copy(text)} className="rounded-full bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 active:scale-90 transition-transform" aria-label={`Copy ${label}`}>
                    <Copy size={15} />
                  </button>
                </div>
                <pre className="mt-4 whitespace-pre-wrap font-mono text-xs leading-6 text-gray-700 bg-gray-50/50 p-4 rounded-xl border border-gray-100 max-h-[380px] overflow-y-auto">{text}</pre>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}