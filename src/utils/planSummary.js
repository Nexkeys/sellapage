// The line printed under "Paid Stores" in the admin Analytics tab.
//
// The figure on its own was what went unnoticed for so long: 92 "paid" stores
// out of 149 looked plausible until someone knew it should be single digits.
// Spelling out the split makes a wrong number obvious at a glance.
export function planSplitLine(analytics) {
  if (!analytics) return ''
  const b = analytics.planBreakdown || {}
  const free = typeof analytics.freeStores === 'number' ? analytics.freeStores : null

  const tiers = [
    b.premium ? `${b.premium} Premium` : '',
    b.pro ? `${b.pro} Pro` : '',
    b.growth ? `${b.growth} Growth` : '',
  ].filter(Boolean)

  if (!tiers.length) {
    return free === null ? 'No paid plans yet' : `No paid plans yet · ${free.toLocaleString()} free`
  }

  const extra = [
    analytics.inGrace ? `${analytics.inGrace} in grace` : '',
    free === null ? '' : `${free.toLocaleString()} free`,
  ].filter(Boolean)

  return [tiers.join(' · '), extra.join(' · ')].filter(Boolean).join(' · ')
}
