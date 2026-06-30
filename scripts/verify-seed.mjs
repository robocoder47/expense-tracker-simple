import fs from 'fs'
import { parseNotes, getValidCommitRows } from '../src/lib/parser.ts'
import { computeChfValue } from '../src/lib/calculations.ts'

const text = fs.readFileSync('./src/data/seed-2026.txt', 'utf8')
const rows = getValidCommitRows(parseNotes(text)).filter((r) => r.type === 'expense')
const rate = { eurToChfRate: 0.95, usdToChfRate: 0.88, gbpToChfRate: 1.12 }

const byMonth = new Map()
let total = 0
for (const r of rows) {
  const month = r.date.slice(0, 7)
  const chf = computeChfValue(r.amount, r.currency ?? 'CHF', rate)
  byMonth.set(month, (byMonth.get(month) ?? 0) + chf)
  total += chf
}

console.log('expense count:', rows.length)
console.log('flagged:', parseNotes(text).filter((r) => r.status === 'flagged').length)
console.log('total CHF (0.95 EUR):', total.toFixed(2))
for (const [m, v] of [...byMonth.entries()].sort()) {
  console.log(m, v.toFixed(2))
}
