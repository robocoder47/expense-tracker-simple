import { useState } from 'react'
import { getSettings, updateSettings } from '../lib/db'
import { daysSince } from '../lib/calculations'
import { exportJsonBackup } from '../lib/export'
import type { Settings } from '../lib/types'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { InstallNote } from './InstallNote'
import { PasteImporter } from './PasteImporter'

interface MoreViewProps {
  refreshKey: number
  onImported: () => void
  onBackupComplete: () => void
}

export function MoreView({ refreshKey, onImported, onBackupComplete }: MoreViewProps) {
  const settings = useLiveQuery(() => getSettings(), [refreshKey], {
    id: 'app',
    eurToChfRate: 0.95,
    usdToChfRate: 0.88,
    gbpToChfRate: 1.12,
    lastBackupAt: null,
    foodBudget: 1000,
    seededAt: null,
    seedVersion: 0,
    monthlyBudgetNote: null,
    fixedCostMonthlyNote: null,
  } as Settings)

  const [eurRate, setEurRate] = useState('')
  const [usdRate, setUsdRate] = useState('')
  const [gbpRate, setGbpRate] = useState('')
  const [exporting, setExporting] = useState(false)
  const [saved, setSaved] = useState(false)

  const backupDays = daysSince(settings.lastBackupAt)
  const backupLabel =
    backupDays === null ? 'never' : backupDays === 0 ? '0 days ago' : `${backupDays} days ago`

  async function handleExport() {
    setExporting(true)
    try {
      const ok = await exportJsonBackup()
      if (ok) onBackupComplete()
    } finally {
      setExporting(false)
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    const patch: Partial<Settings> = {}
    if (eurRate) patch.eurToChfRate = parseFloat(eurRate)
    if (usdRate) patch.usdToChfRate = parseFloat(usdRate)
    if (gbpRate) patch.gbpToChfRate = parseFloat(gbpRate)
    await updateSettings(patch)
    setEurRate('')
    setUsdRate('')
    setGbpRate('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
        <p className="section-title">settings</p>
        <form onSubmit={handleSaveSettings}>
          <div className="field">
            <label>eur → chf (new entries)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder={String(settings.eurToChfRate)}
              value={eurRate}
              onChange={(e) => setEurRate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>usd → chf (new entries)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder={String(settings.usdToChfRate)}
              value={usdRate}
              onChange={(e) => setUsdRate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>gbp → chf (new entries)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder={String(settings.gbpToChfRate)}
              value={gbpRate}
              onChange={(e) => setGbpRate(e.target.value)}
            />
          </div>
          <button className="btn btn-block" type="submit">
            save settings
          </button>
          {saved && <p style={{ color: 'var(--accent)', fontSize: 12 }}>saved</p>}
        </form>
      </div>
    </div>
  )
}
