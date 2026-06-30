import { useState } from 'react'
import { getSettings } from '../lib/db'
import { formatDate, daysSince } from '../lib/calculations'
import { exportJsonBackup } from '../lib/export'
import { forceRefreshFxRates } from '../lib/fx'
import type { Settings } from '../lib/types'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { InstallNote } from './InstallNote'
import { PasteImporter } from './PasteImporter'

interface MoreViewProps {
  refreshKey: number
  onImported: () => void
  onBackupComplete: () => void
  onRatesUpdated?: () => void
}

export function MoreView({
  refreshKey,
  onImported,
  onBackupComplete,
  onRatesUpdated,
}: MoreViewProps) {
  const settings = useLiveQuery(() => getSettings(), [refreshKey], {
    id: 'app',
    eurToChfRate: 0.95,
    usdToChfRate: 0.88,
    gbpToChfRate: 1.12,
    fxRatesUpdatedAt: null,
    fxRatesDate: null,
    lastBackupAt: null,
    foodBudget: 1000,
    seededAt: null,
    seedVersion: 0,
    monthlyBudgetNote: null,
    fixedCostMonthlyNote: null,
  } as Settings)

  const [exporting, setExporting] = useState(false)
  const [refreshingRates, setRefreshingRates] = useState(false)
  const [ratesMsg, setRatesMsg] = useState<string | null>(null)

  const backupDays = daysSince(settings.lastBackupAt)
  const backupLabel =
    backupDays === null ? 'never' : backupDays === 0 ? '0 days ago' : `${backupDays} days ago`

  const ratesAge = daysSince(settings.fxRatesUpdatedAt)
  const ratesAgeLabel =
    ratesAge === null
      ? 'not fetched yet'
      : ratesAge === 0
        ? 'today'
        : `${ratesAge} day${ratesAge === 1 ? '' : 's'} ago`

  async function handleExport() {
    setExporting(true)
    try {
      const ok = await exportJsonBackup()
      if (ok) onBackupComplete()
    } finally {
      setExporting(false)
    }
  }

  async function handleRefreshRates() {
    setRefreshingRates(true)
    setRatesMsg(null)
    try {
      const ok = await forceRefreshFxRates()
      if (ok) {
        onRatesUpdated?.()
        setRatesMsg('rates updated')
      } else {
        setRatesMsg('offline — using cached rates')
      }
    } finally {
      setRefreshingRates(false)
      setTimeout(() => setRatesMsg(null), 2500)
    }
  }

  return (
    <div>
      <p className="section-title">more</p>

      <p className="backup-status">
        last backup: <span>{backupLabel}</span>
      </p>

      <div className="card">
        <button
          className="btn btn-primary btn-block"
          type="button"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'exporting...' : 'export json backup'}
        </button>
      </div>

      <InstallNote />

      <div className="card">
        <PasteImporter onImported={onImported} />
      </div>

      <div className="card">
        <p className="section-title">exchange rates</p>
        <p className="rates-note">auto-updated daily (ECB via frankfurter.app)</p>
        <ul className="rates-list">
          <li>
            <span>1 EUR</span>
            <span className="amount">= {settings.eurToChfRate.toFixed(4)} CHF</span>
          </li>
          <li>
            <span>1 USD</span>
            <span className="amount">= {settings.usdToChfRate.toFixed(4)} CHF</span>
          </li>
          <li>
            <span>1 GBP</span>
            <span className="amount">= {settings.gbpToChfRate.toFixed(4)} CHF</span>
          </li>
        </ul>
        <p className="rates-meta">
          {settings.fxRatesDate
            ? `ecb date: ${formatDate(settings.fxRatesDate)} · checked ${ratesAgeLabel}`
            : `checked ${ratesAgeLabel}`}
        </p>
        <button
          className="btn btn-block"
          type="button"
          onClick={handleRefreshRates}
          disabled={refreshingRates}
        >
          {refreshingRates ? 'refreshing...' : 'refresh rates now'}
        </button>
        {ratesMsg && <p className="rates-msg">{ratesMsg}</p>}
      </div>
    </div>
  )
}
