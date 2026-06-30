import type { TabId } from '../lib/types'

interface BottomNavProps {
  active: TabId
  onChange: (tab: TabId) => void
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'add', label: 'add' },
  { id: 'list', label: 'list' },
  { id: 'stats', label: 'dash' },
  { id: 'more', label: 'more' },
]

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`nav-item ${active === tab.id ? 'nav-item-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
