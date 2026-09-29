// src/components/auth/AuthShell.jsx
//
// The frame around sign in, create store, reset password and the code screen.
// Desktop: the story and artwork on the left, the form card on the right.
// Phones: the artwork sits BEHIND the top of the form card, so the page still
// feels like Sellapage without pushing the form below the fold.
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, ShieldCheck, CreditCard, Lock } from 'lucide-react'
import MediaSlot from '../../media/MediaSlot'
import { hasMedia } from '../../media/hasMedia'

export function Brand({ small = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Sellapage home">
      <img src="/og-image.png" alt="" className={`${small ? 'h-9 w-9' : 'h-11 w-11'} rounded-xl object-cover shadow-sm ring-1 ring-black/5`} />
      <span className="leading-tight">
        <span className={`block font-display font-extrabold tracking-tight text-dash-ink ${small ? 'text-lg' : 'text-[22px]'}`}>Sellapage</span>
        <span className="block text-[11px] font-medium text-forest-600/80">Build · Sell · Grow</span>
      </span>
    </Link>
  )
}

const FEATURES = [
  'Products & Services',
  'Secure Checkout (Paystack)',
  'Delivery with Sendbox, Topship & Kwik',
  'Customers, Orders & Analytics',
  'And so much more...',
]

function StoryAside({ mode }) {
  const signingIn = mode === 'login'
  return (
    <div className="flex h-full flex-col">
      <Brand />
      <span className="mt-10 inline-flex w-fit items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-[12px] font-semibold text-forest-600 ring-1 ring-forest-100">
        {signingIn ? 'Good to see you again' : 'Free to start. No card needed.'}
      </span>
      <h1 className="mt-5 font-display text-[40px] font-extrabold leading-[1.05] tracking-tight text-dash-ink xl:text-[50px]">
        {signingIn ? <>Your store has been <span className="text-forest-600">waiting for you.</span></> : <>Turn your ideas into a thriving <span className="text-forest-600">online business.</span></>}
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600">
        {signingIn
          ? 'Sign in to see your orders, reply to customers and keep your business moving.'
          : 'Create your store in minutes, reach more customers, and grow with Sellapage, the all-in-one commerce workspace for Nigerian businesses.'}
      </p>
      <ul className="mt-5 space-y-2.5">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-[14px] text-slate-700">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-forest-600 text-white"><Check size={12} strokeWidth={3} /></span>
            {f}
          </li>
        ))}
      </ul>
      {hasMedia('auth-hero') && (
        <div className="relative mt-6 max-w-[520px]">
          <MediaSlot name="auth-hero" alt="" priority className="w-full animate-float mix-blend-multiply [mask-image:radial-gradient(ellipse_62%_60%_at_50%_45%,black_62%,transparent_100%)]" />
        </div>
      )}
      <div className="relative -mt-8 max-w-[440px] rounded-3xl bg-forest p-5 text-white shadow-xl shadow-forest/20">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20"><ShieldCheck size={20} className="text-green-200" /></span>
          <div>
            <p className="text-[14px] font-semibold">Built for Nigerian businesses</p>
            <p className="mt-1 text-[13px] leading-relaxed text-green-100/90">From solo entrepreneurs to growing brands, Sellapage helps you sell smarter, faster and bigger.</p>
          </div>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-6 pt-8">
        {[
          { icon: CreditCard, t: 'Paystack Secured', s: 'Licensed by the CBN' },
          { icon: Lock, t: 'Firebase Encrypted', s: 'Your data, your control' },
        ].map((x) => (
          <div key={x.t} className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-forest-600 shadow-sm ring-1 ring-black/5"><x.icon size={18} /></span>
            <span><span className="block text-[12.5px] font-semibold text-dash-ink">{x.t}</span><span className="block text-[11px] text-dash-muted">{x.s}</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// A plain link home, or a button when the screen wants to handle "back"
// itself (the code screen goes back to the form, not away from the page).
function BackLink({ back, className, children }) {
  if (back.onClick) return <button type="button" onClick={back.onClick} className={className}>{children}</button>
  return <Link to={back.to || '/'} className={className}>{children}</Link>
}

/**
 * `aside` replaces the left-hand story (the code screen has its own).
 * `mobileArt` is the media slot shown behind the card on phones.
 * `back` is the small link at the top of the card area.
 */
export default function AuthShell({ mode = 'login', aside, mobileArt = 'auth-hero', back, children }) {
  const backLink = back || { to: '/', label: 'Back to home' }
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f2f9f5] font-body">
      {/* Soft background shapes, desktop and phone alike. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#dff2e7] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-[#e3f4ea] blur-3xl" />

      {/* Phones: the artwork behind the top of the card. */}
      {hasMedia(mobileArt) && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[340px] overflow-hidden lg:hidden">
          <MediaSlot name={mobileArt} alt="" priority className="absolute left-1/2 top-[68px] w-[440px] max-w-none -translate-x-1/2 mix-blend-multiply [mask-image:radial-gradient(ellipse_60%_60%_at_50%_45%,black_60%,transparent_100%)] sm:w-[520px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f2f9f5]/0 via-[#f2f9f5]/10 to-[#f2f9f5]" />
        </div>
      )}

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1320px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-12 lg:px-10 xl:gap-20">
        <aside className="hidden py-10 lg:block">{aside || <StoryAside mode={mode} />}</aside>

        <main className="flex min-w-0 flex-col px-4 pb-10 pt-4 sm:px-6 lg:justify-center lg:px-0 lg:py-8">
          <div className="flex items-center justify-between lg:hidden">
            <Brand small />
            <BackLink back={backLink} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <ArrowLeft size={13} /> {backLink.short || 'Home'}
            </BackLink>
          </div>
          <div className={hasMedia(mobileArt) ? 'h-[190px] sm:h-[250px] lg:hidden' : 'h-6 lg:hidden'} />

          <div className="relative rounded-[28px] border border-white bg-white/95 p-5 shadow-[0_20px_60px_-20px_rgba(3,78,34,0.25)] backdrop-blur sm:p-8">
            <div className="mb-5 hidden items-center justify-between gap-3 lg:flex">
              <BackLink back={backLink} className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-dash-ink">
                <ArrowLeft size={14} /> {backLink.label}
              </BackLink>
              <span className="flex items-center gap-2 text-[11.5px] leading-tight text-slate-500">
                <ShieldCheck size={18} className="text-forest-600" /> Your information is safe<br />and secure with us.
              </span>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
