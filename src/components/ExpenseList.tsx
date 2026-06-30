import { useEffect, useMemo, useState } from 'react'
import { db, deleteExpense } from '../lib/db'
import { formatChf, formatDate, monthLabel } from '../lib/calculations'
import { groupExpensesByMonth } from '../lib/expenseGroups'
import type { Expense } from '../lib/types'
import { useLiveQuery } from '../hooks/useLiveQuery'

interface ExpenseListProps {
  refreshKey: number
}

export function ExpenseList({ refreshKey }: ExpenseListProps) {
  const expenses = useLiveQuery(
    () => db.expenses.orderBy('date').reverse().toArray(),
    [refreshKey],
    [] as Expense[],
  )

  const groups = useMemo(() => groupExpensesByMonth(expenses), [expenses])
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (groups.length > 0) {
      setExpandedMonths((prev) => (prev.size > 0 ? prev : new Set([groups[0].month])))
    }
  }, [groups])

  async function handleDelete(id: string) {
    try {
      await deleteExpense(id)
    } catch (err) {
      console.error('[delete]', err)
    }
  }

  function toggleMonth(month: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

  if (groups.length === 0) {
    return (
      <div>
        <p className="section-title">list</p>
        <p className="empty">no expenses yet</p>
      </div>
    )
  }

  return (
    <div className="list-view">
      <p className="section-title">list</p>

      {groups.map((mg) => {
        const expanded = expandedMonths.has(mg.month)
        return (
          <section key={mg.month} className="list-month">
            <button
              type="button"
              className="list-month-header"
              onClick={() => toggleMonth(mg.month)}
            >
              <span>
                {expanded ? '▾' : '▸'} {monthLabel(mg.month)}
              </span>
              <span className="list-month-meta amount">
                {mg.count} · {formatChf(mg.total)}
              </span>
            </button>

            {expanded &&
              mg.days.map((day) => (
                <div key={day.date} className="list-day">
                  <div className="list-day-header">
                    <span>{formatDate(day.date)}</span>
                    <span className="amount">{formatChf(day.total)}</span>
                  </div>
                  <div className="list-day-rows">
                    {day.expenses.map((e) => (
                      <CompactRow key={e.id} expense={e} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              ))}
          </section>
        )
      })}
    </div>
  )
}

function CompactRow({
  expense: e,
  onDelete,
}: {
  expense: Expense
  onDelete: (id: string) => void
}) {
  return (
    <div className="list-row">
      <span className="list-row-cat">{e.category}</span>
      <span className="list-row-amt amount">{formatChf(e.chfValue)}</span>
      <button
        type="button"
        className="list-row-del"
        aria-label="delete"
        onClick={() => onDelete(e.id)}
      >
        ×
      </button>
    </div>
  )
}
