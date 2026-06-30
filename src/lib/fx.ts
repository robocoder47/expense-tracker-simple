import { roundChf } from './calculations'
import { getSettings, updateSettings } from './db'

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest?from=CHF&to=EUR,USD,GBP'
const FALLBACK_URL = 'https://open.er-api.com/v6/latest/CHF'
const STALE_MS = 24 * 60 * 60 * 1000

let refreshInFlight: Promise<{ updated: boolean }> | null = null

function ratesAreStale(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return true
  return Date.now() - new Date(updatedAt).getTime() >= STALE_MS
}

function chfPerUnit(chfToForeign: number): number {
  return roundChf(1 / chfToForeign)
}

async function fetchFromFrankfurter(): Promise<{
  eurToChfRate: number
  usdToChfRate: number
  gbpToChfRate: number
  fxRatesDate: string
}> {
  const res = await fetch(FRANKFURTER_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`frankfurter ${res.status}`)

  const data = (await res.json()) as {
    date: string
    rates: { EUR: number; USD: number; GBP: number }
  }

  const { EUR, USD, GBP } = data.rates
  if (!EUR || !USD || !GBP) throw new Error('frankfurter missing rates')

  return {
    eurToChfRate: chfPerUnit(EUR),
    usdToChfRate: chfPerUnit(USD),
    gbpToChfRate: chfPerUnit(GBP),
    fxRatesDate: data.date,
  }
}

async function fetchFromOpenErApi(): Promise<{
  eurToChfRate: number
  usdToChfRate: number
  gbpToChfRate: number
  fxRatesDate: string
}> {
  const res = await fetch(FALLBACK_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`er-api ${res.status}`)

  const data = (await res.json()) as {
    result: string
    time_last_update_unix: number
    rates: { EUR: number; USD: number; GBP: number }
  }

  if (data.result !== 'success') throw new Error('er-api failed')

  const { EUR, USD, GBP } = data.rates
  if (!EUR || !USD || !GBP) throw new Error('er-api missing rates')

  return {
    eurToChfRate: chfPerUnit(EUR),
    usdToChfRate: chfPerUnit(USD),
    gbpToChfRate: chfPerUnit(GBP),
    fxRatesDate: new Date(data.time_last_update_unix * 1000).toISOString().slice(0, 10),
  }
}

async function fetchLiveRates(): Promise<{
  eurToChfRate: number
  usdToChfRate: number
  gbpToChfRate: number
  fxRatesDate: string
}> {
  try {
    return await fetchFromFrankfurter()
  } catch (primaryErr) {
    console.warn('[fx] frankfurter failed, trying fallback:', primaryErr)
    return await fetchFromOpenErApi()
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
