import { roundChf } from './calculations'
import { getSettings, updateSettings } from './db'

const LOCAL_RATES_URL = `${import.meta.env.BASE_URL}rates.json`
const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest?from=CHF&to=EUR,USD,GBP'
const FALLBACK_URL = 'https://open.er-api.com/v6/latest/CHF'
const STALE_MS = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 12_000

let refreshInFlight: Promise<{ updated: boolean }> | null = null

export type FxPayload = {
  eurToChfRate: number
  usdToChfRate: number
  gbpToChfRate: number
  fxRatesDate: string
  fxRatesSource?: string
}

function ratesAreStale(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return true
  return Date.now() - new Date(updatedAt).getTime() >= STALE_MS
}

function chfPerUnit(chfToForeign: number): number {
  return roundChf(1 / chfToForeign)
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchFromLocalRates(): Promise<FxPayload & { source: string }> {
  const res = await fetchWithTimeout(`${LOCAL_RATES_URL}?t=${Date.now()}`)
  if (!res.ok) throw new Error(`local rates ${res.status}`)

  const data = (await res.json()) as {
    fxRatesDate: string | null
    eurToChfRate: number
    usdToChfRate: number
    gbpToChfRate: number
    source?: string
  }

  if (!data.eurToChfRate || !data.usdToChfRate || !data.gbpToChfRate) {
    throw new Error('local rates incomplete')
  }

  return {
    eurToChfRate: data.eurToChfRate,
    usdToChfRate: data.usdToChfRate,
    gbpToChfRate: data.gbpToChfRate,
    fxRatesDate: data.fxRatesDate ?? new Date().toISOString().slice(0, 10),
    source: data.source ?? 'bundled',
  }
}

async function fetchFromFrankfurter(): Promise<FxPayload & { source: string }> {
  const res = await fetchWithTimeout(FRANKFURTER_URL)
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
    source: 'ecb-live',
  }
}

async function fetchFromOpenErApi(): Promise<FxPayload & { source: string }> {
  const res = await fetchWithTimeout(FALLBACK_URL)
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
    source: 'er-api-live',
  }
}

async function fetchLiveRates(): Promise<FxPayload & { source: string }> {
  const attempts = [fetchFromLocalRates, fetchFromFrankfurter, fetchFromOpenErApi]
  let lastErr: unknown

  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (err) {
      lastErr = err
      console.warn('[fx] attempt failed:', err)
    }
  }

  throw lastErr ?? new Error('all fx sources failed')
}

async function saveRates(rates: FxPayload & { source: string }): Promise<void> {
  await updateSettings({
    eurToChfRate: rates.eurToChfRate,
    usdToChfRate: rates.usdToChfRate,
    gbpToChfRate: rates.gbpToChfRate,
    fxRatesDate: rates.fxRatesDate,
    fxRatesSource: rates.source,
    fxRatesUpdatedAt: new Date().toISOString(),
  })
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
      await saveRates(rates)
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

export async function forceRefreshFxRates(): Promise<{ ok: boolean; source?: string }> {
  try {
    const rates = await fetchLiveRates()
    await saveRates(rates)
    return { ok: true, source: rates.source }
  } catch (err) {
    console.warn('[fx] manual refresh failed:', err)
    return { ok: false }
  }
}
