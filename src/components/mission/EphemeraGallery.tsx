import type { Ephemera } from '@/types/app'

interface Props {
  ephemera: Ephemera[]
}

const TYPE_LABELS: Record<string, string> = {
  menu: 'Menu',
  sign: 'Sign',
  ticket: 'Ticket',
  receipt: 'Receipt',
  boarding_pass: 'Boarding Pass',
  label: 'Label',
  other: 'Text',
}

export function EphemeraGallery({ ephemera }: Props) {
  if (ephemera.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-gold/40">
        Collected Ephemera
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {ephemera.map((item, i) => (
          <div
            key={i}
            className="p-3 bg-[#f5f0e8]/[0.04] border border-[#f5f0e8]/10 rounded-lg"
          >
            <span className="text-[9px] font-body uppercase tracking-widest text-gold/40 block mb-1">
              {TYPE_LABELS[item.type] ?? item.type}
            </span>
            <p className="text-ivory/70 font-mono text-[11px] leading-relaxed break-words">
              {item.text}
            </p>
            {item.context && (
              <p className="text-ivory/30 font-body text-[10px] mt-1 italic">
                {item.context}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
