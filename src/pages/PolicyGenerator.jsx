//src/pages/PolicyGenerator.jsx/
import { useMemo, useState } from 'react'
import { Copy, FileText, ShieldCheck, CheckCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

export default function PolicyGenerator() {
  // Structured Business Profile States
  const [businessName, setBusinessName] = useState('Your Business')
  const [deliveryModel, setDeliveryModel] = useState('island-mainland') // island-mainland, nationwide, pickup
  const [processingTime, setProcessingTime] = useState('standard') // fast-track, standard, preorder
  const [paymentModel, setPaymentModel] = useState('pbd') // pbd (payment before delivery), split, pod
  const [refundStrategy, setRefundStrategy] = useState('size-exchange') // no-refunds, size-exchange, unboxing-only
  const [saleExclusion, setSaleExclusion] = useState(true) // Protects clearance items
  const [logisticShield, setLogisticShield] = useState(true) // Protects from rider delays

  const policy = useMemo(() => {
    const name = businessName.trim() || 'Our Store'

    // 1. Logistics Clause Engine
    let deliveryClause = ""
    let deliverySummary = ""
    if (deliveryModel === 'island-mainland') {
      deliveryClause = "We enforce an explicit Mainland vs. Island dispatch rate infrastructure. Clients must select their precise delivery zone at checkout. Failure to select the correct location code will result in immediate order hold or processing cancellation."
      deliverySummary = "Lagos Mainland vs. Island rates apply strictly. Ensure accurate checkout selection."
    } else if (deliveryModel === 'pickup') {
      deliveryClause = "This store operates strictly via pre-scheduled hub pickups. Safe pickup coordinates, secure warehouse access tokens, and collection windows are transmitted automatically via email/WhatsApp immediately after payment settlement verifies."
      deliverySummary = "Strictly hub pickup. Location coordinates unlock only after payment confirmation."
    } else {
      deliveryClause = "Interstate shipping routes via verified third-party transit networks. Capital cities sustain 3 to 5 business days transit windows. Remote geopolitical zones may necessitate self-collection at regional logistics hubs."
      deliverySummary = "Nationwide shipping takes 3-5 working days. Remote regions require hub terminal pickup."
    }

    // 2. Processing & Timeline Engine
    let timelineClause = ""
    if (processingTime === 'fast-track') {
      timelineClause = "Orders cleared before 12 PM enter immediate distribution channels for next-day dispatch rider handoff."
    } else if (processingTime === 'preorder') {
      timelineClause = "🕒 PRE-ORDER INFRASTRUCTURE: This piece is manufactured or batched upon request. Processing requires a mandatory 7 to 14 working days window before outward courier tracking codes activate."
    } else {
      timelineClause = "Standard order sorting, verification, and package staging take 24 to 48 hours post-payment confirmation before courier collection."
    }

    // 3. Escrow & Settlement Engine
    let paymentClause = ""
    if (paymentModel === 'pbd') {
      paymentClause = "We operate exclusively on a Payment Before Delivery (PBD) architecture. Order components will not be staged, cut, or allocated to dispatch riders without cleared funds confirming in our payment gateway records."
    } else if (paymentModel === 'split') {
      paymentClause = "A non-refundable 50% commitment stake is required to activate item packaging or custom production lines. The remaining 50% balance must clear seamlessly prior to release to outward dispatch riders."
    } else {
      paymentClause = "Pay on Delivery (POD) is exclusively available for verified mainland hubs. Funds must transfer via instant mobile transaction immediately upon rider presentation, before product packaging breaks open."
    }

    // 4. Return, Exchange & Dispute Defense Engine
    let refundClause = ""
    let exchangeLine = ""
    if (refundStrategy === 'no-refunds') {
      refundClause = "Due to the fast operational lifecycles and product sanitary parameters, all transactions are final. We maintain a zero-refund policy. Ensure you double-check specifications completely before checkout confirmation."
      exchangeLine = "Exchanges are strictly prohibited unless an entirely wrong item or verifiable mistake was made by our processing warehouse."
    } else if (refundStrategy === 'unboxing-only') {
      refundClause = "Refunds or store credits are evaluated uniquely under the absolute condition of a continuous, unedited unboxing video submitted within 24 hours of package drop-off."
      exchangeLine = "Disputes concerning missing contents, cosmetic cracks, or wrong sizes will be rejected flatly without unambiguous unboxing video proof."
    } else {
      refundClause = "Size exchanges are available as a customer service courtesy within 48 hours of transit pickup. Items must remain completely unworn, scent-free, with brand product tags entirely intact."
      exchangeLine = "The customer assumes full legal and financial responsibility for covering both inward return and outward exchange courier fees."
    }

    // 5. System Safeguard Add-ons
    const saleBlock = saleExclusion 
      ? "\n\n🛑 PROMOTIONAL EXCLUSIONS:\nAll items secured during promotional flash sales, clearance cycles, or store discount runs are strictly final. Promotional orders are exempt from sizing modifications or store credits under any circumstances."
      : ""

    const logisticsBlock = logisticShield
      ? "\n\n⚠️ THIRD-PARTY COURIER LIABILITY:\nOutward fulfillment is driven by independent logistics platforms. While our operations desk tracks shipments, we hold zero financial liability for weather disruptions, traffic grids, or unexpected rider delays once parcels leave the distribution hub."
      : ""

    // --- STRATEGIC OUTPUT FORMATS ---

    // Channel Layout A: Official Storefront Terms
    const full = `${name.toUpperCase()} OPERATIONAL POLICY

1. Order Settlement & Payment Execution
${paymentClause}

2. Distribution & Timeline Parameters
${timelineClause} ${deliveryClause}${logisticsBlock}

3. Returns, Cancellations & Escrow Disputes
${refundClause} ${exchangeLine}${saleBlock}

4. Client Verification Data
Purchasers assume full liability for providing flawless phone lines, exact WhatsApp digits, and complete street addresses. We hold zero liability for delivery failure tied to dead terminal responses.`

    // Channel Layout B: Instagram Highlight Story Formula (Bullet optimized for screenshots)
    const short = `✨ ${name.toUpperCase()} STORE TERMS ✨

💳 PAYMENT MODEL
• ${paymentModel === 'pbd' ? 'Payment Before Delivery Only' : paymentModel === 'split' ? '50% Staking / 50% Pre-dispatch' : 'POD available for verified zones'}
• No payment = No rider deployment.

🚚 DISPATCH PIPELINE
• ${deliverySummary}
• Allow ${processingTime === 'preorder' ? '7-14 days production' : '24-48 hours staging time'}.

🔄 RETURNS / DISPUTES
• ${refundStrategy === 'no-refunds' ? 'Strictly No Refunds/Exchanges' : refundStrategy === 'unboxing-only' ? 'Unboxing Video Required within 24h' : 'Size swaps allowed within 48h'}
• ${saleExclusion ? 'Sale items are completely FINAL.' : 'Terms apply to all orders.'}`

    // Channel Layout C: Post-Checkout WhatsApp Confirmation Matrix (Natively wrapped in Markdown wildcards)
    const whatsapp = `*🧾 ORDER TRANSACTION TERMS: ${name.toUpperCase()}*

Hi! Thank you for choosing us. To ensure a smooth delivery transaction, please review our store terms:

*1. Processing Timeline:*
• ${timelineClause}

*2. Logistics Delivery:*
• ${deliverySummary}
${logisticShield ? '• _Note: We utilize third-party rider lines; transit delays are outside our manual control._' : ''}

*3. Payment Terms:*
• ${paymentClause}

*4. Refund/Exchange Rules:*
• ${refundStrategy === 'no-refunds' ? 'All sales are final. No return lines open.' : refundStrategy === 'unboxing-only' ? 'Any dispute requires a clear, unedited unboxing video clip.' : 'Size swaps require items to be pristine. Buyer bears dispatch costs.'}
${saleExclusion ? '\n⚠️ *Note:* Flash sale/discounted items cannot be swapped or returned.' : ''}

_By proceeding with payment verification, you validate this operational contract._`

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
                  <ShieldCheck size={13} /> Dispute Defense Studio
                </span>
                <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-gray-950 md:text-5xl">
                  Deploy air-tight terms before bad clients show up.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
                  Ditch the generic legal text templates. Configure real operational logic parameters to structure custom storefront guidelines, social screenshots, and automated WhatsApp receipts.
                </p>
              </div>

              {/* Dynamic Interactive Parameter Grid */}
              <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-100/70 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Business Name</span>
                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Logistics Strategy</span>
                    <select value={deliveryModel} onChange={e => setDeliveryModel(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
                      <option value="island-mainland">Lagos Split (Island vs Mainland)</option>
                      <option value="nationwide">Nationwide Courier Delivery</option>
                      <option value="pickup">Hub / Warehouse Pickup Only</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Processing Window</span>
                    <select value={processingTime} onChange={e => setProcessingTime(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
                      <option value="fast-track">Next-Day Handoff (Fast)</option>
                      <option value="standard">Standard (24-48 Hours)</option>
                      <option value="preorder">Pre-Order (7-14 Days Production)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Payment Strategy</span>
                    <select value={paymentModel} onChange={e => setPaymentModel(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
                      <option value="pbd">Payment Before Delivery (PBD)</option>
                      <option value="split">50% Deposit Commitment</option>
                      <option value="pod">Pay On Delivery (POD Split)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-gray-700">Dispute Defense Strategy</span>
                    <select value={refundStrategy} onChange={e => setRefundStrategy(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
                      <option value="size-exchange">Allow Pristine Size Swaps</option>
                      <option value="unboxing-only">Require Unboxing Video</option>
                      <option value="no-refunds">Absolute Zero Return Line</option>
                    </select>
                  </label>
                </div>

                {/* Algorithmic Safeguard Toggles */}
                <div className="pt-2 grid gap-3 sm:grid-cols-2">
                  <button 
                    onClick={() => setSaleExclusion(!saleExclusion)} 
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${saleExclusion ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950' : 'border-gray-200 text-gray-500'}`}
                  >
                    <CheckCircle size={18} className={saleExclusion ? 'text-emerald-600' : 'text-gray-300'} />
                    <div>
                      <p className="text-xs font-bold">Lock Flash Sale Exclusion</p>
                      <p className="text-[10px] opacity-80">Block sizing returns entirely on clearance drops.</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setLogisticShield(!logisticShield)} 
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${logisticShield ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950' : 'border-gray-200 text-gray-500'}`}
                  >
                    <CheckCircle size={18} className={logisticShield ? 'text-emerald-600' : 'text-gray-300'} />
                    <div>
                      <p className="text-xs font-bold">Deploy Third-Party Shield</p>
                      <p className="text-[10px] opacity-80">Protect operations from dispatch rider delay liability.</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Structured Output Formats Grid Display */}
        <section className="px-4 pb-16">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            {[
              ['Official Storefront Blueprint', policy.full, 'lg:col-span-2'],
              ['Instagram Highlight Content', policy.short, ''],
              ['WhatsApp Invoice Text Payload', policy.whatsapp, 'lg:col-span-3'],
            ].map(([label, text, classes]) => (
              <div key={label} className={`rounded-[26px] border border-emerald-100 bg-white p-6 shadow-sm transition-all hover:shadow-md ${classes}`}>
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
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}