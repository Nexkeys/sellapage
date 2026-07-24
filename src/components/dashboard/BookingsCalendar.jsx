//src/components/dashboard/BookingsCalendar.jsx/
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Builds a 6-row (42-cell) month grid starting on Sunday, including the
// leading/trailing days of adjacent months so every week row is full.
function buildMonthGrid(viewDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)

  const cells = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + i)
    cells.push({
      date,
      dateKey: toDateKey(date),
      inCurrentMonth: date.getMonth() === month,
    })
  }
  return cells
}

export default function BookingsCalendar({ bookings = [], selectedDate, onSelectDate }) {
  const [viewDate, setViewDate] = useState(() => new Date())

  const bookingsByDate = useMemo(() => {
    const map = new Map()
    for (const booking of bookings) {
      if (!booking.bookingDate) continue
      const list = map.get(booking.bookingDate) || []
      list.push(booking)
      map.set(booking.bookingDate, list)
    }
    return map
  }, [bookings])

  const cells = useMemo(() => buildMonthGrid(viewDate), [viewDate])
  const todayKey = toDateKey(new Date())
  const monthLabel = viewDate.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })

  const goToPrevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const goToNextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-2.5 sm:p-3.5">
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="rounded-xl border border-gray-200 p-1.5 text-gray-500 transition-all hover:bg-gray-50 active:bg-gray-100"
          aria-label="Previous month"
        >
          <ChevronLeft size={15} />
        </button>
        <p className="text-sm font-extrabold text-gray-900">{monthLabel}</p>
        <button
          type="button"
          onClick={goToNextMonth}
          className="rounded-xl border border-gray-200 p-1.5 text-gray-500 transition-all hover:bg-gray-50 active:bg-gray-100"
          aria-label="Next month"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {WEEKDAY_LABELS.map(label => (
          <div key={label} className="py-1 text-center text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
            {label.slice(0, 3)}
          </div>
        ))}

        {cells.map(({ date, dateKey, inCurrentMonth }) => {
          const dayBookings = bookingsByDate.get(dateKey) || []
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedDate

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate?.(isSelected ? null : dateKey)}
              className={`relative flex min-h-[2.75rem] flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] font-semibold transition-all sm:min-h-[3.25rem] sm:rounded-xl sm:text-xs
                ${isSelected ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent hover:bg-gray-50 active:bg-gray-100'}
                ${!inCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isToday && !isSelected ? 'ring-2 ring-green-500/30' : ''}
              `}
            >
              {date.getDate()}
              {dayBookings.length > 0 && (
                <span className="inline-flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-green-600 px-1 text-[8px] font-extrabold text-white sm:h-4 sm:min-w-[1rem] sm:text-[9px]">
                  {dayBookings.length}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
