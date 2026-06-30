interface BackupBannerProps {
  visible: boolean
  onExport: () => void
  onDismiss: () => void
}

export function BackupBanner({ visible, onExport, onDismiss }: BackupBannerProps) {
  if (!visible) return null

  return (
    <div className="banner" role="status">
      <span>No backup in 7+ days — tap to export</span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={onExport}>
          export
        </button>
        <button type="button" onClick={onDismiss}>
          dismiss
        </button>
      </div>
    </div>
  )
}
