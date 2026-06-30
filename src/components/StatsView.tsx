import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import {
  buildMonthComparisons,
  formatChf,
  monthKey,
  sumChf,
} from '../lib/calculations'
import { categoryBreakdown, monthlyTotals } from '../lib/expenseGroups'
import type { Expense } from '../lib/types'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { CategoryChart } from './CategoryChart'
import { MonthComparisonDetail, MonthScrollStrip } from './MonthScrollStrip'
import { MonthlyMiniPie } from './MonthlyMiniPie'
import { TrendLineChart } from './TrendLineChart'

interface StatsViewProps {
  refreshKey: number
}

export function StatsView({ refreshKey }: StatsViewProps) {
  const expenses = useLiveQuery(
    () => db.expenses.toArray(),
    [refreshKey],
    [] as Expense[],
  )
  const monthComparisons = useMemo(() => {
    const totals = monthlyTotals(expenses).filter((t) => t.month.startsWith('2026'))
    return buildMonthComparisons(totals)
  }, [expenses])

  const currentMonth = monthKey(new Date().toISOString().slice(0, 10))

  const [selectedMonth, setSelectedMonth] = useState(
    () => monthComparisons[monthComparisons.length - 1]?.month ?? currentMonth,
  )

  useEffect(() => {
    if (monthComparisons.length === 0) return
    const latest = monthComparisons[monthComparisons.length - 1].month
    if (!monthComparisons.some((m) => m.month === selectedMonth)) {
      setSelectedMonth(latest)
    }
  }, [monthComparisons, selectedMonth])

  const selectedComparison = useMemo(
    () => monthComparisons.find((m) => m.month === selectedMonth) ?? null,
    [monthComparisons, selectedMonth],
  )

  const monthExpenses = useMemo(
    () => expenses.filter((e) => monthKey(e.date) === selectedMonth),
    [expenses, selectedMonth],
  )

  const categoryData = useMemo(() => categoryBreakdown(monthExpenses), [monthExpenses])

  const avgMonthly =
    monthComparisons.length > 0
      ? monthComparisons.reduce((s, m) => s + m.total, 0) / monthComparisons.length
      : 0

  const currentMonthTotal = useMemo(() => {
    const c = monthComparisons.find((m) => m.month === currentMonth)
    return c?.total ?? sumChf(monthExpenses.filter((e) => monthKey(e.date) === currentMonth))
  }, [monthComparisons, currentMonth, monthExpenses])

  const currentVsAvg = currentMonthTotal - avgMonthly

  const trendData = useMemo(
    () =>
      monthComparisons.map((m) => ({
        month: m.month,
        total: m.total,
        delta: m.delta,
        deltaPct: m.deltaPct,
      })),
    [monthComparisons],
  )

  const monthlyPies = useMemo(
    () =>
      monthComparisons.map((m) => {
        const monthEx = expenses.filter((e) => monthKey(e.date) === m.month)
        return {
          month: m.month,
          total: m.total,
          data: categoryBreakdown(monthEx),
        }
      }),
    [monthComparisons, expenses],
  )

  return (
    <div className="dashboard">
      <p className="section-title">dashboard</p>

      <div className="dashboard-hero card">
        <div className="dashboard-hero-label">avg monthly</div>
        <div className="dashboard-hero-value amount">{formatChf(avgMonthly)}</div>
        <p className="chart-subtitle" style={{ marginTop: '0.35rem' }}>
          {expenses.length} entries · totals use stored CHF (EUR × rate at entry)
        </p>
        <div className="dashboard-hero-sub">
          <div className="dashboard-hero-sub-row">
            <span className="dashboard-hero-sub-label">this month</span>
            <span className="amount">{formatChf(currentMonthTotal)}</span>
          </div>
          {monthComparisons.length > 1 && (
            <div className="dashboard-hero-sub-row">
              <span className="dashboard-hero-sub-label">vs average</span>
              <span className={`amount ${currentVsAvg > 0 ? 'delta-up' : 'delta-down'}`}>
                {currentVsAvg > 0 ? '+' : ''}
                {currentVsAvg.toFixed(0)}
              </span>
            </div>
          )}
        </div>
      </div>

      <MonthScrollStrip
        months={monthComparisons}
        selectedMonth={selectedMonth}
        onSelect={setSelectedMonth}
      />

      <MonthComparisonDetail comparison={selectedComparison} />

      <div className="card">
        <p className="section-title">monthly pies</p>
        <p className="chart-subtitle">swipe — one pie per month</p>
        <div className="mini-pie-scroll">
          {monthlyPies.map((m) => (
            <MonthlyMiniPie
              key={m.month}
              month={m.month}
              data={m.data}
              total={m.total}
              active={m.month === selectedMonth}
              onClick={() => setSelectedMonth(m.month)}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <p className="section-title">selected month breakdown</p>
        <CategoryChart data={categoryData} centerTotal={sumChf(monthExpenses)} />
      </div>

      <div className="card">
        <p className="section-title">spending trend</p>
        <p className="chart-subtitle">monthly totals over the year</p>
        <TrendLineChart data={trendData} />
        <div className="trend-legend">
          <span className="trend-legend-item">
            <span className="trend-legend-line" /> monthly total
          </span>
          <span className="trend-legend-item trend-legend-dashed">
            <span className="trend-legend-line trend-legend-line-dashed" /> average
          </span>
        </div>
      </div>
    </div>
  )
}
