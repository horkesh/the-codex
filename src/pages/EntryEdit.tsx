import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { fetchEntry, updateEntry } from '@/data/entries'
import { useUIStore } from '@/store/ui'
import { TopBar, PageWrapper } from '@/components/layout'
import { Spinner } from '@/components/ui'
import { MissionForm } from '@/components/chronicle/forms/MissionForm'
import { NightOutForm } from '@/components/chronicle/forms/NightOutForm'
import { SteakForm } from '@/components/chronicle/forms/SteakForm'
import { PlaystationForm } from '@/components/chronicle/forms/PlaystationForm'
import { ToastForm } from '@/components/chronicle/forms/ToastForm'
import { InterludeForm } from '@/components/chronicle/forms/InterludeForm'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { fadeUp } from '@/lib/animations'
import type { EntryWithParticipants, PS5Match, GentAlias } from '@/types/app'
import type { MissionFormData } from '@/components/chronicle/forms/MissionForm'
import type { NightOutFormData } from '@/components/chronicle/forms/NightOutForm'
import type { SteakFormData } from '@/components/chronicle/forms/SteakForm'
import type { PlaystationFormData } from '@/components/chronicle/forms/PlaystationForm'
import type { ToastFormData } from '@/components/chronicle/forms/ToastForm'
import type { InterludeFormData } from '@/components/chronicle/forms/InterludeForm'

// Rebuild H2H snapshot from match list (same logic as EntryNew)
function buildH2HSnapshot(matches: PS5Match[]): Record<string, Record<string, number>> {
  const snapshot: Record<string, Record<string, number>> = {}
  for (const match of matches) {
    if (!match.winner) continue
    const loser: GentAlias = match.winner === match.p1 ? match.p2 : match.p1
    if (!snapshot[match.winner]) snapshot[match.winner] = {}
    snapshot[match.winner][loser] = (snapshot[match.winner][loser] ?? 0) + 1
  }
  return snapshot
}

// Map an entry's stored metadata to the steak form's string fields
function steakInitialData(entry: EntryWithParticipants): Partial<SteakFormData> {
  const meta = entry.metadata as Record<string, unknown>
  return {
    title: entry.title,
    date: entry.date,
    location: entry.location ?? '',
    description: entry.description ?? '',
    cut: typeof meta?.cut === 'string' ? meta.cut : '',
    score: meta?.score != null ? String(meta.score) : '',
    verdict: typeof meta?.verdict === 'string' ? meta.verdict : '',
  }
}

// Map an entry's stored metadata to the playstation form's fields
function playstationInitialData(entry: EntryWithParticipants): Partial<PlaystationFormData> {
  const meta = entry.metadata as Record<string, unknown>
  const rawMatches = Array.isArray(meta?.matches) ? (meta.matches as PS5Match[]) : []
  return {
    title: entry.title,
    date: entry.date,
    matches: rawMatches,
  }
}

export default function EntryEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addToast = useUIStore(s => s.addToast)

  const [entry, setEntry] = useState<EntryWithParticipants | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchEntry(id)
      .then(e => { setEntry(e); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  // Generic update handler — accepts the normalised payload each submit wrapper produces
  async function handleSubmit(fields: Parameters<typeof updateEntry>[1]) {
    if (!id) return
    setSaving(true)
    try {
      await updateEntry(id, fields)
      addToast('Entry updated.', 'success')
      navigate(`/chronicle/${id}`)
    } catch {
      addToast('Failed to save. Try again.', 'error')
      setSaving(false)
    }
  }

  // Per-type submit wrappers — mirror the shape used in EntryNew
  async function submitMission(data: MissionFormData) {
    await handleSubmit({
      title: data.title,
      date: data.date,
      city: data.city || null,
      country: data.country || null,
      country_code: data.country_code || null,
      location: data.location || null,
      description: data.description || null,
    })
  }

  async function submitNightOut(data: NightOutFormData) {
    await handleSubmit({
      title: data.title,
      date: data.date,
      location: data.location || null,
      description: data.description || null,
    })
  }

  async function submitSteak(data: SteakFormData) {
    await handleSubmit({
      title: data.title,
      date: data.date,
      location: data.location || null,
      description: data.description || null,
      metadata: {
        cut: data.cut || null,
        score: data.score ? parseFloat(data.score) : null,
        verdict: data.verdict || null,
      },
    })
  }

  async function submitPlaystation(data: PlaystationFormData) {
    const head_to_head_snapshot = buildH2HSnapshot(data.matches)
    await handleSubmit({
      title: data.title,
      date: data.date,
      metadata: {
        matches: data.matches,
        head_to_head_snapshot,
        total_matches: data.matches.length,
      },
    })
  }

  async function submitToast(data: ToastFormData) {
    await handleSubmit({
      title: data.title,
      date: data.date,
      location: data.location || null,
      description: data.description || null,
    })
  }

  async function submitInterlude(data: InterludeFormData) {
    await handleSubmit({
      title: data.title,
      date: data.date,
      description: data.description || null,
    })
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-obsidian">
        <Spinner size="lg" />
      </div>
    )
  }

  // ── Not found state ──
  if (!entry) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-obsidian text-ivory-muted font-body text-sm">
        Entry not found.
      </div>
    )
  }

  const typeMeta = ENTRY_TYPE_META[entry.type]

  function renderForm() {
    if (!entry) return null

    if (entry.type === 'mission') {
      const meta = entry.metadata as Record<string, unknown> | undefined
      const initial: Partial<MissionFormData> = {
        title: entry.title,
        date: entry.date,
        date_end: (meta?.date_end as string) ?? '',
        city: entry.city ?? '',
        country: entry.country ?? '',
        country_code: entry.country_code ?? '',
        location: entry.location ?? '',
        description: entry.description ?? '',
      }
      return (
        <MissionForm
          onSubmit={submitMission}
          loading={saving}
          initialData={initial}
        />
      )
    }

    if (entry.type === 'night_out') {
      const initial: Partial<NightOutFormData> = {
        title: entry.title,
        date: entry.date,
        location: entry.location ?? '',
        description: entry.description ?? '',
      }
      return (
        <NightOutForm
          onSubmit={submitNightOut}
          loading={saving}
          initialData={initial}
        />
      )
    }

    if (entry.type === 'steak') {
      return (
        <SteakForm
          onSubmit={submitSteak}
          loading={saving}
          initialData={steakInitialData(entry)}
        />
      )
    }

    if (entry.type === 'playstation') {
      return (
        <PlaystationForm
          onSubmit={submitPlaystation}
          loading={saving}
          initialData={playstationInitialData(entry)}
        />
      )
    }

    if (entry.type === 'toast') {
      const initial: Partial<ToastFormData> = {
        title: entry.title,
        date: entry.date,
        location: entry.location ?? '',
        description: entry.description ?? '',
      }
      return (
        <ToastForm
          onSubmit={submitToast}
          loading={saving}
          initialData={initial}
        />
      )
    }

    if (entry.type === 'interlude') {
      const initial: Partial<InterludeFormData> = {
        title: entry.title,
        date: entry.date,
        description: entry.description ?? '',
      }
      return (
        <InterludeForm
          onSubmit={submitInterlude}
          loading={saving}
          initialData={initial}
        />
      )
    }

    if (entry.type === 'gathering') {
      // Gathering edits are handled on the dedicated gathering page
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <p className="text-ivory-muted font-body text-sm">
            Gathering entries are managed from the Gathering page.
          </p>
        </div>
      )
    }

    return null
  }

  return (
    <>
      <TopBar
        title="Edit Entry"
        back
      />
      <PageWrapper>
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-6 pb-4"
        >
          {/* Type badge */}
          <div className="flex items-center gap-2 pt-1">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${typeMeta?.borderColor} 60%, transparent)` }}
            >
              {typeMeta && <typeMeta.Icon size={16} aria-hidden="true" />}
            </div>
            <span className="text-ivory-muted font-body text-sm">{typeMeta?.label}</span>
          </div>

          {/* Form */}
          {renderForm()}
        </motion.div>
      </PageWrapper>
    </>
  )
}
