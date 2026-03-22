import { useState } from 'react'
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { PizzaSvg, TOPPING_REGISTRY, TOPPING_KEYS } from '@/lib/pizzaSvg'
import { cn } from '@/lib/utils'
import type { PizzaMenuItem } from '@/types/app'

interface PizzaMenuBuilderProps {
  pizzas: PizzaMenuItem[]
  onChange: (pizzas: PizzaMenuItem[]) => void
  max?: number
}

export function PizzaMenuBuilder({ pizzas, onChange, max = 8 }: PizzaMenuBuilderProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  function addPizza() {
    if (pizzas.length >= max) return
    const next: PizzaMenuItem = { name: '', toppings: [] }
    onChange([...pizzas, next])
    setExpandedIndex(pizzas.length)
  }

  function removePizza(index: number) {
    const next = pizzas.filter((_, i) => i !== index)
    onChange(next)
    if (expandedIndex === index) setExpandedIndex(null)
    else if (expandedIndex !== null && expandedIndex > index) setExpandedIndex(expandedIndex - 1)
  }

  function updateName(index: number, name: string) {
    const next = pizzas.map((p, i) => (i === index ? { ...p, name } : p))
    onChange(next)
  }

  function toggleTopping(index: number, topping: string) {
    const pizza = pizzas[index]
    const has = pizza.toppings.includes(topping)
    const toppings = has
      ? pizza.toppings.filter(t => t !== topping)
      : [...pizza.toppings, topping]
    const next = pizzas.map((p, i) => (i === index ? { ...p, toppings } : p))
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-ivory-muted text-xs uppercase tracking-widest font-body">
        Pizza Menu
      </label>

      {pizzas.map((pizza, index) => {
        const isExpanded = expandedIndex === index
        const toppingLabels = pizza.toppings
          .map(t => TOPPING_REGISTRY[t]?.label ?? t)
          .join(', ')

        return (
          <div
            key={index}
            className="bg-slate-mid border border-white/8 rounded-xl overflow-hidden"
          >
            {/* Header row */}
            <div className="flex items-center gap-2 p-3">
              <PizzaSvg
                toppings={pizza.toppings}
                size={48}
                seed={`${index}-${pizza.name || 'pizza'}`}
              />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Pizza name"
                  value={pizza.name}
                  onChange={e => updateName(index, e.target.value)}
                  className={cn(
                    'w-full bg-transparent border-none text-sm text-ivory font-body',
                    'placeholder:text-ivory-dim/50 focus:outline-none',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="flex items-center gap-1 mt-0.5 text-[10px] text-ivory-dim/60 font-body hover:text-ivory-dim transition-colors"
                >
                  <span className="truncate max-w-[200px]">
                    {toppingLabels || 'Select toppings'}
                  </span>
                  {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => removePizza(index)}
                className="text-ivory-dim/40 hover:text-red-400 transition-colors p-1 shrink-0"
                aria-label="Remove pizza"
              >
                <X size={14} />
              </button>
            </div>

            {/* Topping grid (expandable) */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-white/5">
                <div className="flex flex-wrap gap-1.5">
                  {TOPPING_KEYS.map(key => {
                    const def = TOPPING_REGISTRY[key]
                    const selected = pizza.toppings.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleTopping(index, key)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-body transition-all border',
                          selected
                            ? 'bg-gold/15 border-gold/50 text-gold'
                            : 'bg-white/5 border-white/10 text-ivory-dim hover:border-white/20',
                        )}
                      >
                        {def.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Add pizza button */}
      {pizzas.length < max && (
        <button
          type="button"
          onClick={addPizza}
          className={cn(
            'flex items-center justify-center gap-2 py-3 rounded-xl',
            'border border-dashed border-white/15 text-ivory-dim/60',
            'hover:border-gold/30 hover:text-gold/60 transition-all',
            'font-body text-xs',
          )}
        >
          <Plus size={14} />
          Add pizza
        </button>
      )}
    </div>
  )
}
