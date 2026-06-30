import type { Expense } from './types'
import { monthKey, sumChf } from './calculations'

export interface DayGroup {
  date: string
  expenses: Expense[]
  total: number
}

export interface MonthGroup {
  month: string
  days: DayGroup[]
  total: number
  count: number
}

export function groupExpensesByMonth(expenses: Expense[]): MonthGroup[] {
  const byMonth = new Map<string, Map<string, Expense[]>>()

  for (const e of expenses) {
    const mk = monthKey(e.date)
    if (!byMonth.has(mk)) byMonth.set(mk, new Map())
    const days = byMonth.get(mk)!
    if (!days.has(e.date)) days.set(e.date, [])
    days.get(e.date)!.push(e)
  }

  return Array.from(byMonth.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, daysMap]) => {
      const days = Array.from(daysMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, dayExpenses]) => ({
          date,
          expenses: dayExpenses.sort((a, b) => b.chfValue - a.chfValue),
          total: sumChf(dayExpenses),
        }))
      const all = days.flatMap((d) => d.expenses)
      return { month, days, total: sumChf(all), count: all.length }
    })
}

export function categoryBreakdown(expenses: Expense[]): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const e of expenses) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.chfValue)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

export function monthlyTotals(expenses: Expense[]): { month: string; total: number }[] {
  const map = new Map<string, number>()
  for (const e of expenses) {
    const key = monthKey(e.date)
    map.set(key, (map.get(key) ?? 0) + e.chfValue)
  }
  return Array.from(map.entries())
    .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => a.month.localeCompare(b.month))
}
