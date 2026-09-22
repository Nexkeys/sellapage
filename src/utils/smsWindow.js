// When promotional SMS may be sent.
//
// MTN does not deliver promotional traffic between 8pm and 8am Lagos time
// (Docs/TERMII_API_DOCS.md, and Termii support confirmed it for promotional
// messages generally). We cannot tell which network a number is on before
// sending, so the whole night is closed rather than paying for messages that
// quietly vanish for a large part of the list.
//
// Shared by the server, which enforces it, and the admin tab, which shows it.
// One copy so the two can never drift apart.
export const LAGOS = 'Africa/Lagos'
export const OPEN_HOUR = 8
export const CLOSE_HOUR = 20

export function lagosHour(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: LAGOS, hour: '2-digit', hour12: false }).format(now),
  )
}

export function sendWindow(now = new Date()) {
  const hour = lagosHour(now)
  const open = hour >= OPEN_HOUR && hour < CLOSE_HOUR
  return {
    open,
    hour,
    opensAt: '8:00am',
    closesAt: '8:00pm',
    reason: open
      ? ''
      : 'MTN does not deliver promotional SMS between 8pm and 8am Lagos time. Send after 8am so your vendors actually receive it.',
  }
}
