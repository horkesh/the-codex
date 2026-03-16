import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Instagram, MapPin, Calendar, Cake, Trash2, Edit2, Link2, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Avatar, Spinner, Modal } from '@/components/ui'
import { usePerson } from '@/hooks/usePerson'
import { usePersonDossier } from '@/hooks/usePersonDossier'
import { PrivateNoteSection } from '@/components/circle/PrivateNoteSection'
import { PersonForm } from '@/components/circle/PersonForm'
import type { PersonFormData } from '@/components/circle/PersonForm'
import { deletePerson, updatePerson, fetchPersonGents, updatePersonGents } from '@/data/people'
import { fetchScanByPerson } from '@/data/personScans'
import { fetchAllGents } from '@/data/gents'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { useUIStore } from '@/store/ui'
import { cn, formatDate } from '@/lib/utils'
import { getZodiacSign } from '@/lib/horoscope'
import type { Gent, PersonScan, PersonWithPrivateNote, PersonTier, VerdictLabel, EntryType } from '@/types/app'

type Tab = 'profile' | 'intel'

const VERDICT_STYLE: Record<VerdictLabel, { bg: string; text: string }> = {
  'Immediate Interest': { bg: 'bg-gold/20', text: 'text-gold' },
  'Circle Material':   { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  'On the Radar':      { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  'Observe Further':   { bg: 'bg-white/10', text: 'text-ivory-dim' },
}

const TIER_OPTIONS: Array<{ value: PersonTier; label: string }> = [
  { value: 'inner_circle', label: 'Inner Circle' },
  { value: 'outer_circle', label: 'Outer Circle' },
  { value: 'acquaintance', label: 'Acquaintance' },
]

function DossierSectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mt-8 mb-4">
      <div className="flex-1 h-px bg-gold/10" />
      <span className="text-[10px] uppercase tracking-[0.25em] text-gold-muted font-mono font-medium">
        {label}
      </span>
      <div className="flex-1 h-px bg-gold/10" />
    </div>
  )
}

function RedactedPlaceholder() {
  return (
    <div className="space-y-2">
      <div className="h-3 bg-white/5 rounded w-full" />
      <div className="h-3 bg-white/5 rounded w-3/4" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
    </div>
  )
}

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useUIStore()
  const { person, setPerson, loading, notFound } = usePerson(id)
  const dossier = usePersonDossier(id)
  const [tab, setTab] = useState<Tab>('profile')
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [scan, setScan] = useState<PersonScan | null>(null)
  const [gents, setGents] = useState<Gent[]>([])
  const [showTierModal, setShowTierModal] = useState(false)
  const [tierSaving, setTierSaving] = useState(false)
  const [showGentModal, setShowGentModal] = useState(false)
  const [gentSaving, setGentSaving] = useState(false)
  const [knownByGentIds, setKnownByGentIds] = useState<string[]>([])

  useEffect(() => {
    if (!id) return
    fetchScanByPerson(id).then(setScan).catch(() => {})
    fetchAllGents().then(setGents).catch(() => {})
    fetchPersonGents(id).then(setKnownByGentIds).catch(() => {})
  }, [id])

  const handleSaveEdit = async (data: PersonFormData) => {
    if (!person) return
    const igHandle = data.instagram?.replace(/^@/, '').trim()
    const instagramChanged = (data.instagram || '') !== (person.instagram || '')
    const updated = await updatePerson(person.id, {
      name: data.name,
      instagram: data.instagram || null,
      photo_url: igHandle && instagramChanged
        ? `https://unavatar.io/instagram/${igHandle}`
        : person.photo_url,
      met_location: data.met_location || null,
      met_date: data.met_date || null,
      birthday: data.birthday || null,
      notes: data.notes || null,
      labels: data.labels,
    })
    setPerson({ ...updated, private_note: person.private_note } as PersonWithPrivateNote)
    addToast('Contact updated', 'success')
    setShowEditForm(false)
  }

  const handleDelete = async () => {
    if (!person) return
    setDeleting(true)
    try {
      await deletePerson(person.id)
      addToast('Contact removed', 'info')
      navigate(-1)
    } catch {
      addToast('Failed to delete contact', 'error')
      setDeleting(false)
    }
  }

  const handleGentToggle = async (gentId: string) => {
    if (!person) return
    const next = knownByGentIds.includes(gentId)
      ? knownByGentIds.filter((id) => id !== gentId)
      : [...knownByGentIds, gentId]
    setKnownByGentIds(next)
    setGentSaving(true)
    try {
      await updatePersonGents(person.id, next)
    } catch {
      // revert on failure
      setKnownByGentIds(knownByGentIds)
      addToast('Failed to update connections', 'error')
    } finally {
      setGentSaving(false)
    }
  }

  const handleTierChange = async (tier: PersonTier) => {
    if (!person) return
    setTierSaving(true)
    try {
      const updated = await updatePerson(person.id, { tier })
      setPerson({ ...updated, private_note: person.private_note } as PersonWithPrivateNote)
      addToast('Tier updated', 'success')
      setShowTierModal(false)
    } catch {
      addToast('Failed to update tier', 'error')
    } finally {
      setTierSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Contact" back />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      </div>
    )
  }

  if (notFound || !person) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Not Found" back />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
          <p className="text-ivory-dim text-sm font-body">This contact could not be found.</p>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </div>
    )
  }

  const verdictStyle = scan?.verdict_label
    ? VERDICT_STYLE[scan.verdict_label as VerdictLabel] ?? VERDICT_STYLE['Observe Further']
    : null

  const currentTier = TIER_OPTIONS.find(t => t.value === person.tier)
  const dossierNumber = person.id.slice(0, 6).toUpperCase()

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={person.name}
        back
        right={
          <button
            type="button"
            onClick={() => setShowEditForm(true)}
            className="flex items-center justify-center w-8 h-8 text-ivory-muted hover:text-ivory transition-colors"
            aria-label="Edit contact"
          >
            <Edit2 size={16} />
          </button>
        }
      />

      <PageWrapper>
        {/* ── DOSSIER HEADER ── */}
        <div className="flex flex-col items-center gap-2 pt-4 pb-2">
          {/* Dossier number */}
          <span className="text-[10px] font-mono tracking-[0.3em] text-gold-muted uppercase">
            Dossier No. {dossierNumber}
          </span>

          {/* Avatar area */}
          <div className="relative mt-1">
            {person.portrait_url ? (
              <div className="flex items-end gap-3">
                <img
                  src={person.portrait_url}
                  alt={`${person.name} portrait`}
                  className="w-20 h-20 rounded-2xl object-cover border border-gold/30"
                />
                {person.photo_url && (
                  <div className="flex flex-col items-center gap-1 mb-0.5">
                    <Avatar src={person.photo_url} name={person.name} size="sm" />
                    <span className="text-[9px] text-ivory-dim font-body">Photo</span>
                  </div>
                )}
              </div>
            ) : (
              <Avatar src={person.photo_url} name={person.name} size="xl" />
            )}

            {/* Tier stamp — positioned to the right of avatar */}
            {person.category === 'contact' && currentTier && (
              <button
                type="button"
                onClick={() => setShowTierModal(true)}
                className="absolute -right-10 -top-1"
              >
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full border-2 border-gold/40"
                    style={{ transform: 'rotate(-12deg)' }}
                  />
                  <div
                    className="absolute inset-1 rounded-full border border-gold/20"
                    style={{ transform: 'rotate(-12deg)' }}
                  />
                  <span className="text-[8px] uppercase tracking-[0.2em] text-gold font-body font-semibold text-center leading-tight px-1">
                    {currentTier.label}
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Name */}
          <h2 className="font-display text-3xl text-ivory text-center leading-tight mt-1">
            {person.name}
          </h2>

          {/* Instagram */}
          {person.instagram && (
            <a
              href={`https://instagram.com/${person.instagram.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gold hover:text-gold-light transition-colors font-body"
            >
              <Instagram size={14} />
              @{person.instagram.replace(/^@/, '')}
            </a>
          )}

          {/* Score pill + gent connections row */}
          <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
            {scan?.score != null && verdictStyle && (
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-semibold', verdictStyle.bg, verdictStyle.text)}>
                {scan.score.toFixed(1)} · {scan.verdict_label}
              </span>
            )}
            {gents.length > 0 && (
              <button
                type="button"
                onClick={() => setShowGentModal(true)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-slate-light/50 border border-white/10 text-[11px] font-body text-ivory-dim hover:text-ivory hover:border-white/20 transition-colors"
              >
                <Link2 size={10} />
                {knownByGentIds.length > 0
                  ? gents.filter(g => knownByGentIds.includes(g.id)).map(g => g.display_name).join(', ')
                  : 'Connect'}
              </button>
            )}
          </div>
        </div>

        {/* Tab switcher — only show Intel tab if scan exists */}
        {scan && (
          <div className="flex border-b border-white/10 mt-2 mb-1">
            <button
              type="button"
              onClick={() => setTab('profile')}
              className={cn(
                'flex-1 py-2 text-xs font-body font-medium tracking-wide uppercase transition-colors',
                tab === 'profile' ? 'text-gold border-b-2 border-gold -mb-px' : 'text-ivory-dim hover:text-ivory'
              )}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setTab('intel')}
              className={cn(
                'flex-1 py-2 text-xs font-body font-medium tracking-wide uppercase transition-colors',
                tab === 'intel' ? 'text-gold border-b-2 border-gold -mb-px' : 'text-ivory-dim hover:text-ivory'
              )}
            >
              Intel
            </button>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <>
            {/* Met info + Last seen */}
            {(person.met_location || person.met_date || dossier.lastSeen) && (
              <div className="flex flex-col items-center gap-2 mt-3">
                <div className="flex flex-wrap justify-center gap-3">
                  {person.met_location && (
                    <div className="flex items-center gap-1.5 text-xs text-ivory-dim font-body">
                      <MapPin size={12} className="text-gold-muted shrink-0" />
                      {person.met_location}
                    </div>
                  )}
                  {person.met_date && (
                    <div className="flex items-center gap-1.5 text-xs text-ivory-dim font-body">
                      <Calendar size={12} className="text-gold-muted shrink-0" />
                      <span className="font-mono text-[11px]">{formatDate(person.met_date)}</span>
                    </div>
                  )}
                </div>

                {/* Last Seen */}
                {dossier.lastSeen && (
                  <button
                    type="button"
                    onClick={() => navigate(`/chronicle/${dossier.lastSeen!.entry.id}`)}
                    className="flex items-center gap-1.5 text-xs text-ivory-dim font-body hover:text-ivory transition-colors"
                  >
                    <Eye size={12} className="text-gold-muted shrink-0" />
                    <span className="text-gold-muted">Last seen:</span>
                    {(() => {
                      const meta = ENTRY_TYPE_META[dossier.lastSeen.entry.type as EntryType]
                      const Icon = meta?.Icon
                      return Icon ? <Icon size={11} className="text-gold-muted" /> : null
                    })()}
                    <span className="truncate max-w-[160px]">{dossier.lastSeen.entry.title}</span>
                    <span className="font-mono text-[11px] text-ivory-dim/60 shrink-0">
                      {formatDate(dossier.lastSeen.date)}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Birthday */}
            {person.birthday && (() => {
              const zodiac = getZodiacSign(person.birthday!)
              return (
                <div className="flex flex-wrap justify-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-ivory-dim font-body">
                    <Cake size={12} className="text-gold-muted shrink-0" />
                    <span className="font-mono text-[11px]">{formatDate(person.birthday!)}</span>
                  </div>
                  {zodiac && (
                    <div className="flex items-center gap-1.5 text-xs text-ivory-dim font-body">
                      {zodiac}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Labels */}
            {person.labels.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {person.labels.map((label) => (
                  <span
                    key={label}
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1',
                      'bg-slate-light text-ivory-dim text-xs font-body',
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* ── FIELD NOTES ── */}
            <DossierSectionHeader label="Field Notes" />
            {person.notes ? (
              <p className="text-sm text-ivory-muted font-body leading-relaxed whitespace-pre-wrap">
                {person.notes}
              </p>
            ) : (
              <RedactedPlaceholder />
            )}

            <div className="mt-2">
              <PrivateNoteSection
                personId={person.id}
                initialNote={person.private_note}
              />
            </div>

            {/* ── ENCOUNTER LOG ── */}
            {dossier.appearances.length > 0 && (
              <>
                <DossierSectionHeader label="Encounter Log" />
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gold/20" />

                  <div className="space-y-4">
                    {dossier.appearances.map((app, i) => {
                      const meta = ENTRY_TYPE_META[app.entry.type as EntryType]
                      const Icon = meta?.Icon
                      return (
                        <motion.button
                          key={app.entry.id}
                          type="button"
                          onClick={() => navigate(`/chronicle/${app.entry.id}`)}
                          className="relative flex items-start gap-3 text-left w-full group"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          {/* Timeline dot */}
                          <div className="absolute -left-6 top-1 w-[15px] h-[15px] rounded-full border-2 border-gold/40 bg-obsidian flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-gold/60" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {Icon && <Icon size={12} className="text-gold-muted shrink-0" />}
                              <span className="text-sm text-ivory font-body truncate group-hover:text-gold transition-colors">
                                {app.entry.title}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-ivory-dim/60 mt-0.5 block">
                              {formatDate(app.date)}
                              {app.entry.city && ` — ${app.entry.city}`}
                            </span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── KNOWN ASSOCIATIONS ── */}
            {dossier.coAppearing.length > 0 && (
              <>
                <DossierSectionHeader label="Known Associations" />
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {dossier.coAppearing.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => navigate(`/circle/${p.id}`)}
                      className="flex flex-col items-center gap-1.5 shrink-0 group"
                    >
                      <Avatar src={p.photo_url} name={p.name} size="md" />
                      <span className="text-[11px] text-ivory-dim font-body truncate max-w-[64px] group-hover:text-ivory transition-colors">
                        {p.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── VISUAL EVIDENCE ── */}
            {dossier.photos.length > 0 && (
              <>
                <DossierSectionHeader label="Visual Evidence" />
                <div className="grid grid-cols-3 gap-1.5">
                  {dossier.photos.map((photo, i) => (
                    <button
                      key={`${photo.entryId}-${i}`}
                      type="button"
                      onClick={() => navigate(`/chronicle/${photo.entryId}`)}
                      className="aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-gold/30 transition-colors"
                    >
                      <img
                        src={photo.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Delete button */}
            <div className="mt-8 flex justify-center">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2 bg-transparent border border-[--color-error]/40 text-[--color-error] hover:bg-[--color-error]/10"
              >
                <Trash2 size={14} />
                Remove from Circle
              </Button>
            </div>
          </>
        )}

        {/* ── INTEL TAB ── */}
        {tab === 'intel' && scan && (
          <div className="space-y-5 mt-3">
            {/* Vibe + Style */}
            {Boolean(scan.review_payload?.vibe || scan.review_payload?.style_read) && (
              <div className="space-y-2">
                {typeof scan.review_payload?.vibe === 'string' && (
                  <p className="text-sm text-ivory font-body leading-relaxed italic">
                    "{scan.review_payload.vibe}"
                  </p>
                )}
                {typeof scan.review_payload?.style_read === 'string' && (
                  <p className="text-xs text-ivory-dim font-body leading-relaxed">
                    {scan.review_payload.style_read}
                  </p>
                )}
              </div>
            )}

            {/* Traits */}
            {scan.trait_words && scan.trait_words.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gold-muted font-body mb-2">Traits</p>
                <div className="flex flex-wrap gap-1.5">
                  {scan.trait_words.map((trait) => (
                    <span
                      key={trait}
                      className="inline-flex items-center rounded-full px-2.5 py-1 bg-gold/10 text-gold text-[11px] font-body"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Why interesting */}
            {scan.why_interesting && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gold-muted font-body mb-1.5">Why Notable</p>
                <p className="text-sm text-ivory-muted font-body leading-relaxed">{scan.why_interesting}</p>
              </div>
            )}

            {/* Best opener */}
            {scan.best_opener && (
              <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-gold-muted font-body mb-1">Best Opener</p>
                <p className="text-sm text-ivory font-body italic">"{scan.best_opener}"</p>
              </div>
            )}

            {/* Green flags + watchouts */}
            <div className="grid grid-cols-2 gap-3">
              {scan.green_flags && scan.green_flags.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-500/70 font-body mb-1.5">Green Flags</p>
                  <ul className="space-y-1">
                    {scan.green_flags.map((flag, i) => (
                      <li key={i} className="text-xs text-ivory-muted font-body leading-snug flex gap-1.5">
                        <span className="text-emerald-500 shrink-0 mt-px">✓</span>
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {scan.watchouts && scan.watchouts.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-amber-500/70 font-body mb-1.5">Watch Out</p>
                  <ul className="space-y-1">
                    {scan.watchouts.map((w, i) => (
                      <li key={i} className="text-xs text-ivory-muted font-body leading-snug flex gap-1.5">
                        <span className="text-amber-500 shrink-0 mt-px">!</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Appearance */}
            {scan.appearance_description && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gold-muted font-body mb-1.5">Appearance</p>
                <p className="text-xs text-ivory-dim font-body leading-relaxed">{scan.appearance_description}</p>
              </div>
            )}

            {/* Confidence */}
            {scan.confidence != null && (
              <p className="text-[10px] text-ivory-dim font-mono text-right">
                Confidence: {Math.round(scan.confidence * 100)}%
              </p>
            )}
          </div>
        )}
      </PageWrapper>

      {/* Edit modal */}
      <PersonForm
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSave={handleSaveEdit}
        person={person}
      />

      {/* Gent connection modal — multi-select */}
      <Modal isOpen={showGentModal} onClose={() => setShowGentModal(false)} title="Known by">
        <div className="space-y-2 pb-2">
          {gents.map((g) => {
            const selected = knownByGentIds.includes(g.id)
            return (
              <button
                key={g.id}
                type="button"
                disabled={gentSaving}
                onClick={() => handleGentToggle(g.id)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border text-sm font-body transition-colors flex items-center gap-3',
                  selected
                    ? 'border-gold/40 bg-gold/10 text-gold'
                    : 'border-white/10 text-ivory hover:border-white/20 hover:bg-slate-light/30'
                )}
              >
                <Avatar src={g.avatar_url} name={g.display_name} size="sm" />
                {g.display_name}
              </button>
            )
          })}
        </div>
      </Modal>

      {/* Tier modal */}
      <Modal isOpen={showTierModal} onClose={() => setShowTierModal(false)} title="Set Circle Tier">
        <div className="space-y-2 pb-2">
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={tierSaving}
              onClick={() => handleTierChange(opt.value)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border text-sm font-body transition-colors',
                person.tier === opt.value
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-white/10 text-ivory hover:border-white/20 hover:bg-slate-light/30'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Remove Contact"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ivory-muted font-body">
            Are you sure you want to remove{' '}
            <span className="text-ivory font-medium">{person.name}</span> from your
            circle? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={deleting}
              onClick={handleDelete}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
