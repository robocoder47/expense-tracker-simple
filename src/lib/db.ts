import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_CATEGORIES } from './categories'
import { computeChfValue } from './calculations'
import type {
  Category,
  Expense,
  FixedCost,
  ParsePreviewRow,
  Settings,
} from './types'

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  eurToChfRate: 0.95,
  lastBackupAt: null,
  foodBudget: 1000,
  seededAt: null,
  seedVersion: 0,
  monthlyBudgetNote: null,
  fixedCostMonthlyNote: null,
}

class ExpenseTrackerDB extends Dexie {
  expenses!: EntityTable<Expense, 'id'>
  fixedCosts!: EntityTable<FixedCost, 'id'>
  categories!: EntityTable<Category, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('expense-tracker-simple')
    this.version(1).stores({
      expenses: 'id, date, category, currency',
      fixedCosts: 'id, label',
      categories: 'id, name',
      settings: 'id',
    })
  }
}

export const db = new ExpenseTrackerDB()

export async function ensureDefaults(): Promise<Settings> {
  const existing = await db.settings.get('app')
  if (existing) return existing

  await db.settings.put(DEFAULT_SETTINGS)

  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((name) => ({
        id: crypto.randomUUID(),
        name,
        isDefault: true,
      })),
    )
  }

  return DEFAULT_SETTINGS
}

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('app')
  return { ...DEFAULT_SETTINGS, ...existing }
}

export async function updateSettings(
  patch: Partial<Omit<Settings, 'id'>>,
): Promise<Settings> {
  const current = await getSettings()
  const next = { ...current, ...patch }
  await db.settings.put(next)
  return next
}

export async function addExpense(
  input: Omit<Expense, 'id' | 'chfValue'> & { chfValue?: number },
): Promise<Expense> {
  const settings = await getSettings()
  const expense: Expense = {
    ...input,
    id: crypto.randomUUID(),
    chfValue:
      input.chfValue ??
      computeChfValue(input.amount, input.currency, settings.eurToChfRate),
  }
  await db.expenses.add(expense)
  await touchCategory(expense.category)
  return expense
}

export async function updateExpense(
  id: string,
  patch: Partial<Pick<Expense, 'date' | 'amount' | 'currency' | 'category' | 'note'>>,
): Promise<void> {
  const existing = await db.expenses.get(id)
  if (!existing) return

  const settings = await getSettings()
  const amount = patch.amount ?? existing.amount
  const currency = patch.currency ?? existing.currency
  const amountOrCurrencyChanged =
    patch.amount !== undefined || patch.currency !== undefined

  const updated: Expense = {
    ...existing,
    ...patch,
    chfValue: amountOrCurrencyChanged
      ? computeChfValue(amount, currency, settings.eurToChfRate)
      : existing.chfValue,
  }
  await db.expenses.put(updated)
  if (patch.category) await touchCategory(patch.category)
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id)
}

async function touchCategory(name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return

  const existing = await db.categories.where('name').equals(trimmed).first()
  if (existing) {
    await db.categories.update(existing.id, { lastUsedAt: new Date().toISOString() })
    return
  }

  await db.categories.add({
    id: crypto.randomUUID(),
    name: trimmed,
    isDefault: false,
    lastUsedAt: new Date().toISOString(),
  })
}

export async function getSortedCategories(): Promise<Category[]> {
  const cats = await db.categories.toArray()
  return cats.sort((a, b) => {
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0
    if (aTime !== bTime) return bTime - aTime
    return a.name.localeCompare(b.name)
  })
}

export async function bulkImportExpenses(rows: ParsePreviewRow[]): Promise<number> {
  const settings = await getSettings()
  const expenses: Expense[] = []

  for (const row of rows) {
    if (row.status !== 'valid' || row.type !== 'expense') continue
    if (!row.date || row.amount == null || !row.category) continue

    expenses.push({
      id: crypto.randomUUID(),
      date: row.date,
      amount: row.amount,
      currency: row.currency ?? 'CHF',
      category: row.category,
      note: row.category,
      source: 'import',
      chfValue: computeChfValue(
        row.amount,
        row.currency ?? 'CHF',
        settings.eurToChfRate,
      ),
    })
  }

  if (expenses.length > 0) {
    await db.expenses.bulkAdd(expenses)
  }

  return expenses.length
}

export async function commitImportRows(rows: ParsePreviewRow[]): Promise<{
  expenses: number
  fixedCosts: number
  budgetUpdated: boolean
}> {
  const settings = await getSettings()
  let expenses = 0
  let fixedCosts = 0
  let budgetUpdated = false

  for (const row of rows) {
    if (row.status !== 'valid') continue

    if (row.type === 'expense' && row.date && row.amount != null && row.category) {
      await addExpense({
        date: row.date,
        amount: row.amount,
        currency: row.currency ?? 'CHF',
        category: row.category,
        note: row.category,
        source: 'import',
        chfValue: computeChfValue(
          row.amount,
          row.currency ?? 'CHF',
          settings.eurToChfRate,
        ),
      })
      expenses++
    }

    if (row.type === 'fixed_cost' && row.amount != null && row.category) {
      const interval = row.rawLine.match(/pro\s+jahr|yearly|\(pro\s+Jahr\)/i)
        ? 'yearly'
        : 'monthly'
      await db.fixedCosts.add({
        id: crypto.randomUUID(),
        label: row.category,
        amount: row.amount,
        currency: row.currency ?? 'CHF',
        interval,
        category: row.category,
      })
      fixedCosts++
    }

    if (row.type === 'budget_hint' && row.amount != null) {
      await updateSettings({ foodBudget: row.amount })
      budgetUpdated = true
    }
  }

  return { expenses, fixedCosts, budgetUpdated }
}

export async function getAllData() {
  const [expenses, fixedCosts, categories, settings] = await Promise.all([
    db.expenses.toArray(),
    db.fixedCosts.toArray(),
    db.categories.toArray(),
    getSettings(),
  ])
  return { expenses, fixedCosts, categories, settings }
}
