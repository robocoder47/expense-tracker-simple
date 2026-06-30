export type Currency = 'CHF' | 'EUR' | 'USD' | 'GBP'

export type ExpenseSource = 'manual' | 'import' | 'fixed'

export interface Expense {
  id: string
  date: string
  amount: number
  currency: Currency
  chfValue: number
  category: string
  note: string
  source: ExpenseSource
  /** ISO timestamp — used for within-day list order (newest last). */
  createdAt?: string
}

export interface FixedCost {
  id: string
  label: string
  amount: number
  currency: Currency
  interval: 'monthly' | 'yearly'
  category: string
}

export interface Category {
  id: string
  name: string
  isDefault: boolean
  lastUsedAt?: string
}

export interface Settings {
  id: 'app'
  eurToChfRate: number
  usdToChfRate: number
  gbpToChfRate: number
  /** When we last fetched live FX rates. */
  fxRatesUpdatedAt: string | null
  /** ECB date from the rates provider (YYYY-MM-DD). */
  fxRatesDate: string | null
  fxRatesSource: string | null
  lastBackupAt: string | null
  foodBudget: number
  seededAt: string | null
  seedVersion: number
  /** Reference only — not included in expense totals */
  monthlyBudgetNote: number | null
  /** Reference only — not included in expense totals */
  fixedCostMonthlyNote: number | null
}

export type ParseRowType = 'expense' | 'fixed_cost' | 'budget_hint' | 'skipped'

export interface ParsePreviewRow {
  type: ParseRowType
  date?: string
  amount?: number
  currency?: Currency
  category?: string
  rawLine: string
  status: 'valid' | 'flagged'
  errorReason?: string
}

export interface ExportData {
  expenses: Expense[]
  fixedCosts: FixedCost[]
  categories: Category[]
  settings: Settings
  exportedAt: string
}

export type TabId = 'add' | 'list' | 'stats' | 'more'
