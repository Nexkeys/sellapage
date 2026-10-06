// src/components/auth/AuthFields.jsx
//
// The form pieces every auth screen shares (sign in, create store, forgot
// password, reset password, account recovery), so they all look and behave
// the same: labelled field with its error or hint, icon input, error banner,
// and the main button style.
import { AlertCircle, Check } from 'lucide-react'
import { passwordStrength } from './authUtils'

export function Field({ id, label, required, optional, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-semibold text-dash-ink">
        {label}{required && <span className="text-red-500"> *</span>}{optional && <span className="font-normal text-dash-muted"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium leading-snug text-red-600 animate-in fade-in slide-in-from-top-1 duration-200"><AlertCircle size={14} className="mt-px flex-shrink-0" />{error}</p>
      ) : hint ? <div className="mt-1.5 text-[12px] leading-snug text-dash-muted">{hint}</div> : null}
    </div>
  )
}

export function IconInput({ icon: Icon, invalid, right, prefix, inputRef, ...props }) {
  return (
    <div className={`flex h-12 items-center overflow-hidden rounded-2xl border bg-white transition focus-within:ring-4 ${invalid ? 'border-red-300 focus-within:border-red-400 focus-within:ring-red-100' : 'border-gray-200 focus-within:border-forest-600 focus-within:ring-forest-600/10'}`}>
      <span className="flex h-full w-12 flex-shrink-0 items-center justify-center border-r border-gray-100 text-slate-400"><Icon size={17} /></span>
      {prefix}
      <input ref={inputRef} {...props} className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[14.5px] text-dash-ink outline-none placeholder:text-slate-400" />
      {right}
    </div>
  )
}

export const PRIMARY = 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest-600 px-5 text-[15px] font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none'

export function ErrorBanner({ children }) {
  if (!children) return null
  return (
    <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13.5px] leading-snug text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> <span>{children}</span>
    </div>
  )
}

const METER = {
  red: ['bg-red-500', 'text-red-600 bg-red-50'],
  amber: ['bg-amber-400', 'text-amber-700 bg-amber-50'],
  green: ['bg-green-500', 'text-green-700 bg-green-50'],
  forest: ['bg-forest-600', 'text-white bg-forest-600'],
}

/** Weak / Good / Strong / Perfect, with the three must-haves underneath. */
export function PasswordMeter({ password }) {
  const strength = passwordStrength(password)
  return (
    <>
      {!strength.empty && (
        <div className="mt-2.5 animate-in fade-in duration-200" aria-live="polite">
          <div className="flex items-center gap-2.5">
            <div className="grid flex-1 grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-1.5 rounded-full transition-colors duration-300 ${i <= strength.level ? METER[strength.tone][0] : 'bg-slate-100'}`} />
              ))}
            </div>
            <span key={strength.label} className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold animate-in zoom-in-90 duration-200 ${METER[strength.tone][1]}`}>{strength.label}</span>
          </div>
          <p className="mt-1.5 text-[12px] text-slate-500">{strength.tip}</p>
        </div>
      )}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        {[['length', 'At least 8 characters'], ['letter', '1 letter'], ['number', '1 number']].map(([k, label]) => (
          <li key={k} className={`flex items-center gap-1 transition-colors ${strength.checks[k] ? 'text-forest-600' : 'text-slate-400'}`}>
            <Check size={13} strokeWidth={strength.checks[k] ? 3 : 2} /> {label}
          </li>
        ))}
      </ul>
    </>
  )
}
