import { useEffect, useState } from 'react'
import { addExpense } from '../lib/db'
import type { Currency } from '../lib/types'
import { AddMonthSummary } from './AddMonthSummary'
import { CategoryAutocomplete, CurrencySelect } from './CategoryAutocomplete'

interface ExpenseFormProps {
  onSaved: () => void
  refreshKey: number
  active: boolean
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ExpenseForm({ onSaved, refreshKey, active }: ExpenseFormProps) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('CHF')
  const [date, setDate] = useState(todayIso)
  const [dateTouched, setDateTouched] = useState(false)
  const [showDate, setShowDate] = useState(false)
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (active && !dateTouched) {
      setDate(todayIso())
    }
  }, [active, dateTouched])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const parsed = parseFloat(amount.replace(',', '.'))
    if (!amount.trim() || !parsed || parsed <= 0) {
      setFormError('enter an amount')
      return
    }
    if (!category.trim()) {
      setFormError('enter a category')
      return
    }

    const entryDate = dateTouched ? date : todayIso()

    setSaving(true)
    try {
      await addExpense({
        date: entryDate,
        amount: parsed,
        currency,
        category: category.trim(),
        note: category.trim(),
        source: 'manual',
      })
      setAmount('')
      setCategory('')
      setDateTouched(false)
      setDate(todayIso())
      setShowDate(false)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
      onSaved()
    } catch (err) {
      console.error('[save]', err)
      setFormError('could not save — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="add-view">
      <form onSubmit={handleSubmit} className="add-form">
        <p className="section-title">new expense</p>

        <div className="field">
          <label>amount</label>
          <div className="amount-row">
            <input
              className="input amount amount-input-lg"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
        </div>

        <CategoryAutocomplete value={category} onChange={setCategory} />

        <div className="field date-field">
          {!showDate ? (
            <button
              type="button"
              className="date-today-btn"
              onClick={() => setShowDate(true)}
            >
              date: <span className="amount">{dateTouched ? date : `today (${todayIso()})`}</span>
              <span className="date-change-hint">tap to change</span>
            </button>
          ) : (
            <>
              <label>date</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setDateTouched(true)
                }}
              />
              <button
                type="button"
                className="btn btn-block"
                style={{ marginTop: '0.5rem', minHeight: '36px', fontSize: '11px' }}
                onClick={() => {
                  setDate(todayIso())
                  setDateTouched(false)
                  setShowDate(false)
                }}
              >
                reset to today
              </button>
            </>
          )}
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
          {saving ? 'saving...' : savedFlash ? 'saved ✓' : 'save'}
        </button>
        {formError && <p className="form-error">{formError}</p>}
      </form>

      <AddMonthSummary refreshKey={refreshKey} />
    </div>
  )
}
