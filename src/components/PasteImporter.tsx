import { useState } from 'react'
import { bulkImportExpenses, db } from '../lib/db'
import { getValidCommitRows, parseNotes, summarizeParseRows } from '../lib/parser'
import type { ParsePreviewRow } from '../lib/types'
import { ImportPreview } from './ImportPreview'

interface PasteImporterProps {
  onImported: () => void
}

export async function replaceAllWithRows(rows: ParsePreviewRow[]): Promise<number> {
  const valid = getValidCommitRows(rows).filter((r) => r.type === 'expense')
  await db.expenses.clear()
  await db.fixedCosts.clear()
  return bulkImportExpenses(valid)
}

export function PasteImporter({ onImported }: PasteImporterProps) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ParsePreviewRow[] | null>(null)
  const [committing, setCommitting] = useState(false)

  function handleParse() {
    setPreview(parseNotes(text))
  }

  async function handleConfirm() {
    if (!preview) return

    const existing = await db.expenses.count()
    if (existing > 0) {
      const ok = window.confirm(
        `Replace all ${existing} existing entries with ${getValidCommitRows(preview).filter((r) => r.type === 'expense').length} imported ones?`,
      )
      if (!ok) return
    }

    setCommitting(true)
    try {
      await replaceAllWithRows(preview)
      setPreview(null)
      setText('')
      onImported()
    } finally {
      setCommitting(false)
    }
  }

  if (preview) {
    return (
      <ImportPreview
        rows={preview}
        summary={summarizeParseRows(preview)}
        onConfirm={handleConfirm}
        onCancel={() => setPreview(null)}
        committing={committing}
      />
    )
  }

  return (
    <div>
      <p className="section-title">import notes</p>
      <p className="chart-subtitle">replaces all existing data on confirm</p>
      <div className="field">
        <label>paste expenses</label>
        <textarea
          className="textarea"
          placeholder="paste from Notes app..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <button className="btn btn-primary" type="button" onClick={handleParse} disabled={!text.trim()}>
        parse
      </button>
    </div>
  )
}
