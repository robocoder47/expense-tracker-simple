import seedText from '../data/seed-2026.txt?raw'
import { sumChf } from './calculations'
import { bulkImportExpenses, db, getSettings, updateSettings } from './db'
import { getValidCommitRows, parseNotes } from './parser'

/** Bump when seed file changes — wipes all expenses and re-imports on next launch. */
export const CURRENT_SEED_VERSION = 5

export const EXPECTED_SEED_COUNT = 308

let seedInFlight: Promise<{
  seeded: boolean
  expenses: number
  totalChf: number
}> | null = null

export async function seedInitialDataIfNeeded(): Promise<{
  seeded: boolean
  expenses: number
  totalChf: number
}> {
  if (seedInFlight) return seedInFlight

  seedInFlight = runSeed().finally(() => {
    seedInFlight = null
  })

  return seedInFlight
}

async function runSeed(): Promise<{
  seeded: boolean
  expenses: number
  totalChf: number
}> {
  const settings = await getSettings()
  const seedVersion = settings.seedVersion ?? 0
  const count = await db.expenses.count()

  // Already seeded for this version — never wipe user data.
  if (seedVersion >= CURRENT_SEED_VERSION) {
    return { seeded: false, expenses: 0, totalChf: 0 }
  }

  // Version bump but user already has data — keep it, just mark current.
  if (count > 0) {
    await updateSettings({ seedVersion: CURRENT_SEED_VERSION })
    return { seeded: false, expenses: 0, totalChf: 0 }
  }

  const rows = getValidCommitRows(parseNotes(seedText)).filter((r) => r.type === 'expense')

  await db.expenses.clear()
  await db.fixedCosts.clear()
  const imported = await bulkImportExpenses(rows)

  if (imported !== EXPECTED_SEED_COUNT) {
    console.warn(`[seed] expected ${EXPECTED_SEED_COUNT} rows, imported ${imported}`)
  }

  const all = await db.expenses.toArray()
  const totalChf = sumChf(all)

  await updateSettings({
    seededAt: new Date().toISOString(),
    seedVersion: CURRENT_SEED_VERSION,
    monthlyBudgetNote: null,
    fixedCostMonthlyNote: null,
    foodBudget: 1000,
  })

  return { seeded: true, expenses: all.length, totalChf }
}
