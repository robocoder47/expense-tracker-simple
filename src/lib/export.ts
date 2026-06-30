import { getAllData, updateSettings } from './db'
import type { ExportData } from './types'

export async function buildExportData(): Promise<ExportData> {
  const data = await getAllData()
  return {
    ...data,
    exportedAt: new Date().toISOString(),
  }
}

export async function exportJsonBackup(): Promise<boolean> {
  const data = await buildExportData()
  const json = JSON.stringify(data, null, 2)
  const filename = `expense-tracker-backup-${data.exportedAt.slice(0, 10)}.json`
  const file = new File([json], filename, { type: 'application/json' })

  let shared = false

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'expense tracker simple backup',
      })
      shared = true
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false
    }
  }

  if (!shared) {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    shared = true
  }

  if (shared) {
    await updateSettings({ lastBackupAt: new Date().toISOString() })
  }

  return shared
}
