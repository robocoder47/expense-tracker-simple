import { useMemo } from 'react'
import { db } from '../lib/db'
import {
  buildMonthComparisons,
  formatChf,
  formatChfShort,
  formatDelta,
  monthKey,
  monthLabelShort,
} from '../lib/calculations'
import type { Expense } from '../lib/types'
import { useLiveQuery } from '../hooks/useLiveQuery'

interface AddMonthSummaryProps {
  refreshKey: number
}

export function AddMonthSummary({ refreshKey }: AddMonthSummaryProps) {
  const expenses = useLiveQuery(
    () => db.expenses.toArray(),
    [refreshKey],
    [] as Expense[],
  )

  const currentMonth = monthKey(new Date().toISOString().slice(0, 10))

  const comparisons = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const k = monthKey(e.date)
      map.set(k, (map.get(k) ?? 0) + e.chfValue)
    }
    const totals = Array.from(map.entries()).map(([month, total]) => ({
      month,
      total: Math.round(total * 100) / 100,
    }))
    return buildMonthComparisons(totals)
  }, [expenses])

  const current = comparisons.find((m) => m.month === currentMonth)
  const recent = comparisons.slice(-4)

  if (recent.length === 0) return null

  return (
    <div className="add-month-summary">
      <p className="add-month-summary-title">// month snapshot</p>
      <div className="add-month-bars">
        {recent.map((m) => {
          const max = Math.max(...recent.map((x) => x.total), 1)
          const pct = (m.total / max) * 100
          const isCurrent = m.month === currentMonth
          return (
            <div key={m.month} className={`add-month-bar-row ${isCurrent ? 'add-month-bar-current' : ''}`}>
              <span className="add-month-bar-label">{monthLabelShort(m.month)}</span>
              <div className="add-month-bar-track">
                <div className="add-month-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="add-month-bar-val amount">{formatChfShort(m.total)}</span>
            </div>
          )
        })}
      </div>
      {current && (
        <p className="add-month-summary-foot amount">
          this month {formatChf(current.total)}
          {current.delta != null && (
            <span className={current.delta > 0 ? 'delta-up' : 'delta-down'}>
              {' '}
              · {formatDelta(current.delta, current.deltaPct)} vs prev
            </span>
          )}
        </p>
      )}
    </div>
  )
}
