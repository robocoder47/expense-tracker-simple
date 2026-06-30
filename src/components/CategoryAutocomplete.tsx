import { useEffect, useMemo, useRef, useState } from 'react'
import { getSortedCategories } from '../lib/db'
import type { Category, Currency } from '../lib/types'

interface CategoryAutocompleteProps {
  value: string
  onChange: (value: string) => void
}

export function CategoryAutocomplete({ value, onChange }: CategoryAutocompleteProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getSortedCategories().then(setCategories)
  }, [])

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    const list = categories.map((c) => c.name)
    if (!q) return list.slice(0, 6)
    return list.filter((name) => name.toLowerCase().includes(q)).slice(0, 6)
  }, [categories, value])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function pick(name: string) {
    onChange(name)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && open) {
      e.preventDefault()
      pick(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="field autocomplete-wrap" ref={wrapRef}>
      <label>category</label>
      <input
        className="input"
        type="text"
        placeholder="type to search…"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        required
      />
      {open && suggestions.length > 0 && (
        <ul className="autocomplete-list" role="listbox">
          {suggestions.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={`autocomplete-item ${i === highlight ? 'autocomplete-item-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(name)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function CurrencySelect({
  value,
  onChange,
}: {
  value: Currency
  onChange: (v: Currency) => void
}) {
  return (
    <select className="select select-inline" value={value} onChange={(e) => onChange(e.target.value as Currency)}>
      <option value="CHF">CHF</option>
      <option value="EUR">EUR</option>
      <option value="USD">USD</option>
      <option value="GBP">GBP</option>
    </select>
  )
}
