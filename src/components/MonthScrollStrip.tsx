import { useEffect, useRef } from 'react'
import {
  formatChf,
  formatChfShort,
  formatDelta,
  monthLabel,
  monthLabelShort,
  type MonthComparison,
} from '../lib/calculations'

interface MonthScrollStripProps {
  months: MonthComparison[]
  selectedMonth: string
  onSelect: (month: string) => void
}

export function MonthScrollStrip({ months, selectedMonth, onSelect }: MonthScrollStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedMonth])

  if (months.length === 0) {
    return <p className="empty">no monthly data yet</p>
  }

  return (
    <div className="month-scroll-wrap">
      <p className="section-title">months — swipe to compare</p>
      <div className="month-scroll" ref={scrollRef}>
        {months.map((m) => {
          const isUp = m.delta != null && m.delta > 0
          const isDown = m.delta != null && m.delta < 0
          const isSelected = m.month === selectedMonth

          return (
            <button
              key={m.month}
              type="button"
              ref={isSelected ? selectedRef : undefined}
              className={`month-scroll-card ${isSelected ? 'month-scroll-card-active' : ''}`}
              onClick={() => onSelect(m.month)}
            >
              <div className="month-scroll-label">{monthLabelShort(m.month)}</div>
              <div className="month-scroll-year">{m.month.slice(0, 4)}</div>
              <div className="month-scroll-total amount">{formatChfShort(m.total)}</div>
              <div
                className={`month-scroll-delta ${isUp ? 'delta-up' : ''} ${isDown ? 'delta-down' : ''}`}
              >
                {m.delta == null ? (
                  <span className="month-scroll-delta-na">first month</span>
                ) : (
                  <>
                    <span className="month-scroll-arrow">{isUp ? '↑' : isDown ? '↓' : '→'}</span>
                    <span className="amount">{formatDelta(m.delta, m.deltaPct)}</span>
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface MonthComparisonDetailProps {
  comparison: MonthComparison | null
}

export function MonthComparisonDetail({ comparison }: MonthComparisonDetailProps) {
  if (!comparison) return null

  const isUp = comparison.delta != null && comparison.delta > 0
  const isDown = comparison.delta != null && comparison.delta < 0

  return (
    <div className="comparison-detail card">
      <div className="comparison-detail-header">
        <span>{monthLabel(comparison.month)}</span>
        <span className="amount comparison-detail-total">{formatChf(comparison.total)}</span>
      </div>
      {comparison.prevTotal != null && (
        <div className="comparison-detail-row">
          <span className="comparison-detail-label">vs previous month</span>
          <span
            className={`amount comparison-detail-change ${isUp ? 'delta-up' : ''} ${isDown ? 'delta-down' : ''}`}
          >
            {isUp ? '↑' : isDown ? '↓' : '→'} {formatDelta(comparison.delta, comparison.deltaPct)}
            <span className="comparison-detail-prev">
              {' '}
              (prev {formatChf(comparison.prevTotal)})
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
