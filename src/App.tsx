import { useCallback, useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { ensureDefaults } from './lib/db'
import { refreshFxRatesIfNeeded } from './lib/fx'
import { seedInitialDataIfNeeded } from './lib/seed'
import { requestPersistentStorage } from './lib/storage'
import type { TabId } from './lib/types'
import { BottomNav } from './components/BottomNav'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseList } from './components/ExpenseList'
import { MoreView } from './components/MoreView'
import { StatsView } from './components/StatsView'

export default function App() {
  const [tab, setTab] = useState<TabId>('add')
  const [refreshKey, setRefreshKey] = useState(0)
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    registerSW({
      onNeedRefresh() {
        setToast('updated — refreshing…')
        setTimeout(() => window.location.reload(), 800)
      },
    })
  }, [])

  const initStarted = useRef(false)

  useEffect(() => {
    if (initStarted.current) return
    initStarted.current = true

    async function init() {
      try {
        await ensureDefaults()
        const seed = await seedInitialDataIfNeeded()
        if (seed.seeded) {
          setToast(`data reset: ${seed.expenses} entries · CHF ${seed.totalChf.toFixed(0)} total`)
          setTimeout(() => setToast(null), 4000)
        }
        await requestPersistentStorage()
        await refreshFxRatesIfNeeded()
      } catch (err) {
        console.error('[init] failed:', err)
        setToast('load error — try clearing site data')
      } finally {
        setReady(true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        refreshFxRatesIfNeeded()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (!ready) {
    return (
      <div className="app">
        <main className="main">
          <p className="empty">loading...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <main className="main">
        {tab === 'add' && (
          <ExpenseForm onSaved={refresh} refreshKey={refreshKey} active={tab === 'add'} />
        )}
        {tab === 'list' && <ExpenseList refreshKey={refreshKey} />}
        {tab === 'stats' && <StatsView refreshKey={refreshKey} />}
        {tab === 'more' && (
          <MoreView
            refreshKey={refreshKey}
            onImported={refresh}
            onBackupComplete={refresh}
            onRatesUpdated={refresh}
          />
        )}
      </main>
      <BottomNav active={tab} onChange={setTab} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
