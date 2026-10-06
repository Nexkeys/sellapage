// src/ops/CodeBoxes.jsx
//
// Six boxes over ONE real input (so phone autofill and paste work), the same
// approach as the vendor code screen: digits only, paste "123 456" fills all
// six, 16px text so iPhones do not zoom, the cursor kept at the end.
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

const CodeBoxes = forwardRef(function CodeBoxes({ value, onChange, onComplete, disabled, error, autoFocus = true, label = '6-digit code' }, ref) {
  const inputRef = useRef(null)
  const [focused, setFocused] = useState(false)
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }))

  const keepEnd = (e) => {
    const el = e.currentTarget
    const end = el.value.length
    if (el.selectionStart !== end) { try { el.setSelectionRange(end, end) } catch { /* ignore */ } }
  }

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '').slice(0, 6)
          onChange(next)
          if (next.length === 6) onComplete?.(next)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSelect={keepEnd}
        onClick={keepEnd}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={label}
        className="absolute inset-0 z-[1] h-full w-full cursor-text bg-transparent text-[16px] text-transparent caret-transparent opacity-0 outline-none"
      />
      <div className={`grid grid-cols-6 gap-2 ${error ? 'animate-[sp-ops-shake_0.4s_ease-in-out]' : ''}`}>
        {Array.from({ length: 6 }).map((_, i) => {
          const d = value[i]
          const active = focused && i === Math.min(value.length, 5) && !disabled
          return (
            <div key={i} className={`flex aspect-[5/6] items-center justify-center rounded-xl border-2 font-display text-[22px] font-bold transition-colors sm:text-[26px] ${
              error && d ? 'border-red-300 bg-red-50 text-red-600'
                : d ? 'border-forest-600/60 bg-forest-50/60 text-dash-ink'
                  : active ? 'border-forest-600 bg-white ring-4 ring-forest-600/10' : 'border-gray-200 bg-white'
            }`}>
              {d || (active ? <span className="h-6 w-[2px] animate-pulse rounded bg-forest-600" /> : null)}
            </div>
          )
        })}
      </div>
      <style>{'@keyframes sp-ops-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}50%{transform:translateX(5px)}75%{transform:translateX(-3px)}}'}</style>
    </div>
  )
})

export default CodeBoxes
