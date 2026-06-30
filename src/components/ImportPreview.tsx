import type { ParsePreviewRow } from '../lib/types'
import { formatDate } from '../lib/calculations'

interface ImportPreviewProps {
  rows: ParsePreviewRow[]
  summary: string
  onConfirm: () => void
  onCancel: () => void
  committing: boolean
}

export function ImportPreview({
  rows,
  summary,
  onConfirm,
  onCancel,
  committing,
}: ImportPreviewProps) {
  const validCount = rows.filter((r) => r.status === 'valid' && r.type !== 'skipped').length

  return (
    <div>
      <p className="summary-line">{summary}</p>
      <div className="preview-table-wrap">
        <table className="preview-table">
          <thead>
            <tr>
              <th>type</th>
              <th>date</th>
              <th>amount</th>
              <th>cur</th>
              <th>category</th>
              <th>raw</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.rawLine}-${i}`}
                className={row.status === 'flagged' ? 'preview-row-flagged' : ''}
              >
                <td>{row.type}</td>
                <td>{row.date ? formatDate(row.date) : '—'}</td>
                <td className="amount">{row.amount?.toFixed(2) ?? '—'}</td>
                <td>{row.currency ?? '—'}</td>
                <td>
                  {row.category ?? '—'}
                  {row.errorReason && (
                    <div style={{ fontSize: '10px' }}>{row.errorReason}</div>
                  )}
                </td>
                <td style={{ maxWidth: '120px', wordBreak: 'break-all' }}>{row.rawLine}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          type="button"
          disabled={committing || validCount === 0}
          onClick={onConfirm}
        >
          {committing ? 'importing...' : `confirm import (${validCount})`}
        </button>
        <button className="btn" type="button" onClick={onCancel}>
          cancel
        </button>
      </div>
    </div>
  )
}
