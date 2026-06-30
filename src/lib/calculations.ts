import type { Currency, Expense, FixedCost } from './types'

export function computeChfValue(
  amount: number,
  currency: Currency,
  eurToChfRate: number,
): number {
  if (currency === 'CHF') return roundChf(amount)
  return roundChf(amount * eurToChfRate)
}

export function roundChf(value: number): number {
  return Math.round(value * 100) / 100
}

export function sumChf(expenses: Expense[]): number {
  return roundChf(expenses.reduce((sum, e) => sum + e.chfValue, 0))
}

export function monthlyFixedBurn(fixedCosts: FixedCost[], eurToChfRate: number): number {
  return roundChf(
    fixedCosts.reduce((sum, fc) => {
      const chf =
        fc.currency === 'CHF' ? fc.amount : fc.amount * eurToChfRate
      const monthly = fc.interval === 'yearly' ? chf / 12 : chf
      return sum + monthly
    }, 0),
  )
}

export function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null
  const diff = Date.now() - new Date(isoDate).getTime()
  return Math.floor(diff / 86_400_000)
}

export function formatChf(value: number): string {
  return `CHF ${value.toFixed(2)}`
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${months[Number(m) - 1]} ${y}`
}

export function monthLabelShort(key: string): string {
  const [, m] = key.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[Number(m) - 1]
}

export interface MonthComparison {
  month: string
  total: number
  prevTotal: number | null
  delta: number | null
  deltaPct: number | null
}

export function buildMonthComparisons(totals: { month: string; total: number }[]): MonthComparison[] {
  const sorted = [...totals].sort((a, b) => a.month.localeCompare(b.month))
  return sorted.map((row, i) => {
    const prevTotal = i > 0 ? sorted[i - 1].total : null
    const delta = prevTotal != null ? roundChf(row.total - prevTotal) : null
    const deltaPct =
      prevTotal != null && prevTotal !== 0
        ? roundChf(((row.total - prevTotal) / prevTotal) * 100)
        : null
    return { month: row.month, total: row.total, prevTotal, delta, deltaPct }
  })
}

export function formatDelta(delta: number | null, deltaPct: number | null): string {
  if (delta == null) return '—'
  const sign = delta > 0 ? '+' : ''
  const pct = deltaPct != null ? ` (${sign}${deltaPct.toFixed(0)}%)` : ''
  return `${sign}${delta.toFixed(0)}${pct}`
}

export function formatChfShort(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toFixed(0)
}