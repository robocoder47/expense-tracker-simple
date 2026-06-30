import fs from 'fs'
import path from 'path'

const OUT = path.join('public', 'rates.json')
const FRANKFURTER = 'https://api.frankfurter.dev/v1/latest?from=CHF&to=EUR,USD,GBP'
const ER_API = 'https://open.er-api.com/v6/latest/CHF'

function round4(value) {
  return Math.round(value * 10000) / 10000
}

function chfPerUnit(chfToForeign) {
  return round4(1 / chfToForeign)
}

async function fromFrankfurter() {
  const res = await fetch(FRANKFURTER)
  if (!res.ok) throw new Error(`frankfurter ${res.status}`)
  const json = await res.json()
  const { EUR, USD, GBP } = json.rates
  if (!EUR || !USD || !GBP) throw new Error('frankfurter missing rates')
  return {
    updatedAt: new Date().toISOString(),
    fxRatesDate: json.date,
    eurToChfRate: chfPerUnit(EUR),
    usdToChfRate: chfPerUnit(USD),
    gbpToChfRate: chfPerUnit(GBP),
    source: 'ecb',
  }
}

async function fromErApi() {
  const res = await fetch(ER_API)
  if (!res.ok) throw new Error(`er-api ${res.status}`)
  const json = await res.json()
  if (json.result !== 'success') throw new Error('er-api failed')
  const { EUR, USD, GBP } = json.rates
  if (!EUR || !USD || !GBP) throw new Error('er-api missing rates')
  return {
    updatedAt: new Date().toISOString(),
    fxRatesDate: new Date(json.time_last_update_unix * 1000).toISOString().slice(0, 10),
    eurToChfRate: chfPerUnit(EUR),
    usdToChfRate: chfPerUnit(USD),
    gbpToChfRate: chfPerUnit(GBP),
    source: 'er-api',
  }
}

async function main() {
  let payload
  try {
    payload = await fromFrankfurter()
  } catch (err) {
    console.warn('[fetch-rates] frankfurter failed:', err.message)
    try {
      payload = await fromErApi()
    } catch (err2) {
      console.warn('[fetch-rates] er-api failed:', err2.message)
      if (fs.existsSync(OUT)) {
        console.warn('[fetch-rates] keeping existing rates.json')
        return
      }
      payload = {
        updatedAt: new Date().toISOString(),
        fxRatesDate: null,
        eurToChfRate: 0.95,
        usdToChfRate: 0.88,
        gbpToChfRate: 1.12,
        source: 'defaults',
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n')
  console.log('[fetch-rates] wrote', OUT, payload.fxRatesDate, payload.source)
}

main()
