import { roundChf } from './calculations'
import { getSettings, updateSettings } from './db'

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=CHF&to=EUR,USD,GBP'
const STALE_MS = 24 * 60 * 60 * 1000

let refreshInFlight: Promise<{ updated: boolean }> | null = null

function ratesAreStale(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return true
  return Date.now() - new Date(updatedAt).getTime() >= STALE_MS
}

async function fetchLiveRates(): Promise<{
  eurToChfRate: number
  usdToChfRate: number
  gbpToChfRate: number
  fxRatesDate: string
}> {
  const res = await fetch(FRANKFURTER_URL)
  if (!res.ok) throw new Error(`fx fetch failed: ${res.status}`)

  const data = (await res.json()) as {
    date: string
    rates: { EUR: number; USD: number; GBP: number }
  }

  const { EUR, USD, GBP } = data.rates
  if (!EUR || !USD || !GBP) throw new Error('fx response missing rates')

  return {
    eurToChfRate: roundChf(1 / EUR),
    usdToChfRate: roundChf(1 / USD),
    gbpToChfRate: roundChf(1 / GBP),
    fxRatesDate: data.date,
  }
}

export async function refreshFxRatesIfNeeded(): Promise<{ updated: boolean }> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const settings = await getSettings()
    if (!ratesAreStale(settings.fxRatesUpdatedAt)) {
      return { updated: false }
    }

    try {
      const rates = await fetchLiveRates()
      await updateSettings({
        ...rates,
        fxRatesUpdatedAt: new Date().toISOString(),
      })
      return { updated: true }
    } catch (err) {
      console.warn('[fx] using cached rates:', err)
      return { updated: false }
    }
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

export async function forceRefreshFxRates(): Promise<boolean> {
  try {
    const rates = await fetchLiveRates()
    await updateSettings({
      ...rates,
      fxRatesUpdatedAt: new Date().toISOString(),
    })
    return true
  } catch (err) {
    console.warn('[fx] manual refresh failed:', err)
    return false
  }
}
