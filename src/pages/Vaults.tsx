import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Unlock, Plus, Trash2, X } from 'lucide-react'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { useAuthStore } from '@/store/auth'
import { fetchVaults, createVault, openVault, deleteVault } from '@/data/vaults'
import { formatDate, daysUntil } from '@/lib/utils'
import { useUIStore } from '@/store/ui'
import type { Vault } from '@/types/app'

// Vault-specific countdown (more granular than the generic countdownLabel)
function vaultCountdown(days: number): string {
  if (days <= 0) return 'Ready to unseal'
  if (days === 1) return 'Opens tomorrow'
  if (days < 30) return `Opens in ${days} days`
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `Opens in ${months} month${months > 1 ? 's' : ''}`
  }
  const years = Math.floor(days / 365)
  const rem = Math.floor((days % 365) / 30)
  return rem > 0
    ? `Opens in ${years}y ${rem}mo`
    : `Opens in ${years} year${years > 1 ? 's' : ''}`
}

function addMonths(date: Date, months: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

// ── Redacted bars (placeholder for hidden message) ───────────────────────────

function RedactedBars() {
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      <div className="h-2.5 w-full rounded bg-white/8" />
      <div className="h-2.5 w-[85%] rounded bg-white/6" />
      <div className="h-2.5 w-[60%] rounded bg-white/5" />
    </div>
  )
}

// ── Create Vault Modal ───────────────────────────────────────────────────────

function CreateVaultModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (message: string, opensAt: string) => Promise<void>
}) {
  const [message, setMessage] = useState('')
  const [opensAt, setOpensAt] = useState('')
  const [saving, setSaving] = useState(false)

  const presets = [
    { label: '6 months', value: addMonths(new Date(), 6) },
    { label: '1 year', value: addMonths(new Date(), 12) },
    { label: '2 years', value: addMonths(new Date(), 24) },
  ]

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  async function handleSubmit() {
    if (!message.trim() || !opensAt) return
    setSaving(true)
    try {
      await onCreate(message.trim(), opensAt)
      setMessage('')
      setOpensAt('')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg bg-slate-dark border-t border-gold/20 rounded-t-2xl p-5"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-ivory">Seal a Vault</h2>
              <button onClick={onClose} className="text-ivory-dim/60 p-1">
                <X size={20} />
              </button>
            </div>

            {/* Message */}
            <label className="block mb-1 text-[10px] uppercase tracking-[0.2em] text-gold/60 font-body">
              Your message
            </label>
            <textarea
              className="w-full bg-obsidian/60 border border-white/10 rounded-lg p-3 text-ivory font-body text-sm resize-none focus:border-gold/40 focus:outline-none transition-colors"
              rows={4}
              placeholder="Write something for your future self..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
            <p className="text-right text-[10px] text-ivory-dim/40 font-body mt-1">
              {message.length}/2000
            </p>

            {/* Date */}
            <label className="block mb-1 mt-3 text-[10px] uppercase tracking-[0.2em] text-gold/60 font-body">
              Unlock date
            </label>
            <input
              type="date"
              className="w-full bg-obsidian/60 border border-white/10 rounded-lg p-3 text-ivory font-body text-sm focus:border-gold/40 focus:outline-none transition-colors"
              value={opensAt}
              min={minDateStr}
              onChange={(e) => setOpensAt(e.target.value)}
            />

            {/* Presets */}
            <div className="flex gap-2 mt-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setOpensAt(p.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-body border transition-colors ${
                    opensAt === p.value
                      ? 'border-gold/60 text-gold bg-gold/10'
                      : 'border-white/10 text-ivory-dim/60 hover:border-white/20'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || !opensAt || saving}
              className="w-full mt-5 py-3 rounded-xl bg-gold/15 border border-gold/30 text-gold font-display text-sm tracking-wide disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {saving ? 'Sealing...' : 'Seal Vault'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Vault Card ───────────────────────────────────────────────────────────────

function VaultCard({
  vault,
  onOpen,
  onDelete,
}: {
  vault: Vault
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  const days = daysUntil(vault.opens_at)
  const isReady = days <= 0 && !vault.opened
  const isSealed = days > 0 && !vault.opened

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="relative border border-white/8 rounded-xl bg-slate-dark/80 p-4 overflow-hidden"
    >
      {/* Subtle gold glow for ready-to-open vaults */}
      {isReady && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              'inset 0 0 0 1px rgba(201,168,76,0.08), 0 0 20px rgba(201,168,76,0.06)',
              'inset 0 0 0 1px rgba(201,168,76,0.25), 0 0 30px rgba(201,168,76,0.12)',
              'inset 0 0 0 1px rgba(201,168,76,0.08), 0 0 20px rgba(201,168,76,0.06)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Lock icon */}
          {vault.opened ? (
            <Unlock size={18} className="text-gold/50 shrink-0" />
          ) : (
            <motion.div
              animate={
                isSealed
                  ? {
                      filter: [
                        'drop-shadow(0 0 4px rgba(201,168,76,0.15))',
                        'drop-shadow(0 0 8px rgba(201,168,76,0.35))',
                        'drop-shadow(0 0 4px rgba(201,168,76,0.15))',
                      ],
                    }
                  : undefined
              }
              transition={isSealed ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : undefined}
            >
              <Lock size={18} className={isReady ? 'text-gold' : 'text-gold/40'} />
            </motion.div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ivory-dim/50 font-body">
              {vault.opened
                ? `Opened ${vault.opened_at ? formatDate(vault.opened_at) : ''}`
                : isReady
                  ? 'Ready to unseal'
                  : vaultCountdown(days)}
            </p>
            <p className="text-[10px] text-ivory-dim/30 font-body mt-0.5">
              Sealed {formatDate(vault.created_at)} · Opens {formatDate(vault.opens_at)}
            </p>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(vault.id)}
          className="text-ivory-dim/20 hover:text-red-400/60 transition-colors p-1 -mr-1"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Message or redacted */}
      <div className="mt-3">
        {vault.opened ? (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-ivory/90 font-body text-sm leading-relaxed whitespace-pre-wrap"
          >
            {vault.message}
          </motion.p>
        ) : (
          <RedactedBars />
        )}
      </div>

      {/* Unseal button */}
      {isReady && (
        <motion.button
          onClick={() => onOpen(vault.id)}
          className="mt-4 w-full py-2.5 rounded-lg bg-gold/12 border border-gold/30 text-gold font-display text-sm tracking-wide active:scale-[0.97] transition-transform"
          whileTap={{ scale: 0.97 }}
        >
          Unseal
        </motion.button>
      )}
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Vaults() {
  const { gent } = useAuthStore()
  const [vaults, setVaults] = useState<Vault[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    if (!gent) return
    try {
      const data = await fetchVaults(gent.id)
      setVaults(data)
    } catch (err) {
      console.error('Failed to load vaults', err)
    } finally {
      setLoading(false)
    }
  }, [gent])

  useEffect(() => { load() }, [load])

  const { addToast } = useUIStore()

  async function handleCreate(message: string, opensAt: string) {
    if (!gent) return
    try {
      const vault = await createVault(gent.id, message, opensAt)
      setVaults((prev) => [...prev, vault].sort((a, b) => a.opens_at.localeCompare(b.opens_at)))
      addToast('Vault sealed', 'success')
    } catch {
      addToast('Failed to create vault', 'error')
    }
  }

  async function handleOpen(id: string) {
    try {
      await openVault(id)
      setVaults((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, opened: true, opened_at: new Date().toISOString() } : v,
        ),
      )
    } catch {
      addToast('Failed to unseal vault', 'error')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteVault(id)
      setVaults((prev) => prev.filter((v) => v.id !== id))
    } catch {
      addToast('Failed to delete vault', 'error')
    }
  }

  const { sealed, ready, opened } = useMemo(() => ({
    sealed: vaults.filter((v) => !v.opened && daysUntil(v.opens_at) > 0),
    ready: vaults.filter((v) => !v.opened && daysUntil(v.opens_at) <= 0),
    opened: vaults.filter((v) => v.opened),
  }), [vaults])

  return (
    <>
      <TopBar />
      <SectionNav />

      <PageWrapper padded scrollable>
        {/* Header */}
        <div className="flex items-center justify-between pt-6 pb-5">
          <div>
            <h1 className="font-display text-xl text-ivory">The Vault</h1>
            <p className="text-ivory-dim/50 text-[10px] font-body uppercase tracking-[0.2em] mt-0.5">
              Time-sealed messages
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gold/10 border border-gold/25 text-gold text-xs font-body active:scale-[0.96] transition-transform"
          >
            <Plus size={14} />
            <span>New</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : vaults.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Lock size={40} className="text-gold/20" />
            <div>
              <p className="text-ivory/60 font-display text-base">No vaults yet</p>
              <p className="text-ivory-dim/40 font-body text-xs mt-1">
                Seal a message for your future self.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-8">
            {/* Ready to open */}
            {ready.length > 0 && (
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.25em] text-gold/60 font-body mb-3">
                  Ready to Unseal
                </h2>
                <div className="flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {ready.map((v) => (
                      <VaultCard key={v.id} vault={v} onOpen={handleOpen} onDelete={handleDelete} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Sealed */}
            {sealed.length > 0 && (
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.25em] text-ivory-dim/40 font-body mb-3">
                  Sealed
                </h2>
                <div className="flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {sealed.map((v) => (
                      <VaultCard key={v.id} vault={v} onOpen={handleOpen} onDelete={handleDelete} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Opened */}
            {opened.length > 0 && (
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.25em] text-ivory-dim/30 font-body mb-3">
                  Opened
                </h2>
                <div className="flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {opened.map((v) => (
                      <VaultCard key={v.id} vault={v} onOpen={handleOpen} onDelete={handleDelete} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </div>
        )}
      </PageWrapper>

      <CreateVaultModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </>
  )
}
