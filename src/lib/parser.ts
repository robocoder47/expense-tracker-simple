import type { Currency, ParsePreviewRow } from './types'

type ParseMode = 'fixed_costs' | 'expenses'

const DATE_SINGLE = /^(\d{2})\.(\d{2})\.(\d{4})$/
const DATE_RANGE = /^(\d{2})\.(\d{2})-(\d{2})\.(\d{2})\.(\d{4})$/

function toIso(day: string, month: string, year: string): string {
  return `${year}-${month}-${day}`
}

function skipped(rawLine: string): ParsePreviewRow {
  return { type: 'skipped', rawLine, status: 'valid' }
}

function flagged(rawLine: string, reason: string): ParsePreviewRow {
  return { type: 'skipped', rawLine, status: 'flagged', errorReason: reason }
}

function parseDateLine(line: string): string | null {
  const range = line.match(DATE_RANGE)
  if (range) {
    const [, d1, m1, , , y] = range
    return toIso(d1, m1, y)
  }
  const single = line.match(DATE_SINGLE)
  if (single) {
    const [, d, m, y] = single
    return toIso(d, m, y)
  }
  return null
}

function parseAmountCurrency(line: string): {
  amount: number
  currency: Currency
  rest: string
} | null {
  const euroAfter = line.match(/^(\d+(?:\.\d+)?)\s*€\s*(.*)$/i)
  if (euroAfter) {
    return {
      amount: parseFloat(euroAfter[1]),
      currency: 'EUR',
      rest: euroAfter[2].trim(),
    }
  }

  const euroBefore = line.match(/^(\d+(?:\.\d+)?)\s*(.+?)\s*€\s*$/i)
  if (euroBefore) {
    return {
      amount: parseFloat(euroBefore[1]),
      currency: 'EUR',
      rest: euroBefore[2].trim(),
    }
  }

  const chf = line.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)
  if (chf) {
    return {
      amount: parseFloat(chf[1]),
      currency: 'CHF',
      rest: chf[2].trim(),
    }
  }

  const colon = line.match(/^(.+?):\s*(\d+(?:\.\d+)?)\s*(.*)$/i)
  if (colon) {
    return {
      amount: parseFloat(colon[2]),
      currency: 'CHF',
      rest: (colon[1] + ' ' + colon[3]).trim(),
    }
  }

  return null
}

function isSectionHeader(line: string): boolean {
  return /:$/.test(line) && !line.includes('€')
}

function isBudgetHint(line: string): RegExpMatchArray | null {
  return line.match(/(?:essen\/einkauf|essen).*?:\s*max\.?\s*(\d+(?:\.\d+)?)/i)
}

function isFixedCostSection(line: string): boolean {
  return /monatliche\s+fixkosten/i.test(line)
}

function isComment(line: string): boolean {
  return line.startsWith('//') || line.toLowerCase().startsWith('ausgaben')
}

function cleanCategory(rest: string): string {
  return rest
    .replace(/\s*\/\s*monat\s*$/i, '')
    .replace(/\s*\(pro\s+jahr\)\s*$/i, '')
    .replace(/\s*\(yearly\)\s*$/i, '')
    .replace(/\s*\(pro\s+Jahr\)\s*$/i, '')
    .replace(/\s*pro\s+monat\s*$/i, '')
    .replace(/\s*pro\s+jahr\s*$/i, '')
    .replace(/\s*\/\s*monat\s*$/i, '')
    .trim()
}

function parseFixedCostLine(line: string): ParsePreviewRow | null {
  const parsed = parseAmountCurrency(line)
  if (!parsed) return null

  const label = cleanCategory(parsed.rest)
  if (!label) return flagged(line, 'Missing fixed cost label')

  const interval = /pro\s+jahr|yearly|\(pro\s+Jahr\)/i.test(line)
    ? 'yearly'
    : 'monthly'

  return {
    type: 'fixed_cost',
    amount: parsed.amount,
    currency: parsed.currency,
    category: label,
    rawLine: line,
    status: 'valid',
    errorReason: interval === 'yearly' ? undefined : undefined,
  }
}

function parseExpenseLine(line: string, date: string): ParsePreviewRow {
  const parsed = parseAmountCurrency(line)
  if (!parsed) return flagged(line, 'Could not parse amount')

  const category = cleanCategory(parsed.rest)
  if (!category) return flagged(line, 'Missing category')

  if (Number.isNaN(parsed.amount) || parsed.amount < 0) {
    return flagged(line, 'Invalid amount')
  }

  return {
    type: 'expense',
    date,
    amount: parsed.amount,
    currency: parsed.currency,
    category,
    rawLine: line,
    status: 'valid',
  }
}

export function parseNotes(text: string): ParsePreviewRow[] {
  const lines = text.split(/\r?\n/)
  const rows: ParsePreviewRow[] = []
  let mode: ParseMode = 'expenses'
  let currentDate: string | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      rows.push(skipped(raw))
      continue
    }

    if (isComment(line)) {
      rows.push(skipped(raw))
      continue
    }

    const budget = isBudgetHint(line)
    if (budget) {
      rows.push({
        type: 'budget_hint',
        amount: parseFloat(budget[1]),
        category: 'Essen/Einkauf',
        rawLine: raw,
        status: 'valid',
      })
      continue
    }

    if (isFixedCostSection(line)) {
      mode = 'fixed_costs'
      rows.push(skipped(raw))
      continue
    }

    if (isSectionHeader(line) && !isFixedCostSection(line)) {
      mode = 'expenses'
      rows.push(skipped(raw))
      continue
    }

    const dateIso = parseDateLine(line)
    if (dateIso) {
      currentDate = dateIso
      mode = 'expenses'
      rows.push(skipped(raw))
      continue
    }

    if (mode === 'fixed_costs') {
      const fixed = parseFixedCostLine(line)
      if (fixed) {
        rows.push(fixed)
      } else {
        rows.push(flagged(raw, 'Could not parse fixed cost'))
      }
      continue
    }

    if (!currentDate) {
      if (parseFixedCostLine(line)) {
        rows.push(parseFixedCostLine(line)!)
      } else {
        rows.push(flagged(raw, 'No date context for expense line'))
      }
      continue
    }

    rows.push(parseExpenseLine(line, currentDate))
  }

  return rows
}

export function summarizeParseRows(rows: ParsePreviewRow[]): string {
  const counts = {
    expense: 0,
    fixed_cost: 0,
    budget_hint: 0,
    skipped: 0,
    flagged: 0,
  }

  for (const row of rows) {
    if (row.status === 'flagged') {
      counts.flagged++
      continue
    }
    counts[row.type]++
  }

  const parts = [
    `${counts.expense} expenses`,
    `${counts.fixed_cost} fixed costs`,
    counts.budget_hint ? `${counts.budget_hint} budget hint` : null,
    counts.skipped ? `${counts.skipped} skipped` : null,
    counts.flagged ? `${counts.flagged} flagged` : null,
  ].filter(Boolean)

  return parts.join(', ')
}

export function getValidCommitRows(rows: ParsePreviewRow[]): ParsePreviewRow[] {
  return rows.filter((r) => r.status === 'valid' && r.type !== 'skipped')
}
