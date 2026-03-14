import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageIcon, Share2 } from 'lucide-react'

import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Spinner } from '@/components/ui'
import { fetchEntries } from '@/data/entries'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { formatDate } from '@/lib/utils'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animations'
import { exportAndShare } from '@/export/exporter'
import type { Entry } from '@/types/app'

// Template imports — all written by the templates agent
import { NightOutCard } from '@/export/templates/NightOutCard'
import { MissionCarousel } from '@/export/templates/MissionCarousel'
import { SteakVerdict } from '@/export/templates/SteakVerdict'
import { PS5MatchCard } from '@/export/templates/PS5MatchCard'
import { GatheringInviteCard } from '@/export/templates/GatheringInviteCard'
import { CountdownCard } from '@/export/templates/CountdownCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateConfig {
  id: string
  label: string
  dims: string
}

// ---------------------------------------------------------------------------
// Template map — which templates are available per entry type
// ---------------------------------------------------------------------------

const TEMPLATES_BY_TYPE: Record<string, TemplateConfig[]> = {
  night_out:   [{ id: 'night_out_card',     label: 'Night Out Card',  dims: '1080×1350' }],
  mission:     [{ id: 'mission_carousel',   label: 'Mission Card',    dims: '1080×1080' }],
  steak:       [{ id: 'steak_verdict',      label: 'Steak Verdict',   dims: '1080×1350' }],
  playstation: [{ id: 'ps5_match_card',     label: 'Battle Card',     dims: '1080×1080' }],
  gathering:   [
    { id: 'gathering_invite', label: 'Invite Card',      dims: '1080×1350' },
    { id: 'countdown',        label: 'Countdown Story',  dims: '1080×1920' },
  ],
  toast:       [{ id: 'night_out_card',     label: 'Toast Card',      dims: '1080×1350' }],
  interlude:   [],
}

// Scale factor for the in-page preview
const PREVIEW_SCALE = 0.28
// The template canvas is always 1080px wide; height varies by dims ratio
const CANVAS_WIDTH = 1080

// Derive preview container height from dims string (e.g. "1080×1350")
function previewContainerHeight(dims: string): number {
  const parts = dims.split('×')
  if (parts.length !== 2) return Math.round(CANVAS_WIDTH * PREVIEW_SCALE)
  const h = parseInt(parts[1], 10)
  const w = parseInt(parts[0], 10)
  if (!h || !w) return Math.round(CANVAS_WIDTH * PREVIEW_SCALE)
  return Math.round((CANVAS_WIDTH * (h / w)) * PREVIEW_SCALE)
}

// ---------------------------------------------------------------------------
// Template renderer — maps template id → component
// ---------------------------------------------------------------------------

interface TemplateRendererProps {
  templateId: string
  entry: Entry
  innerRef: React.Ref<HTMLDivElement>
}

function TemplateRenderer({ templateId, entry, innerRef }: TemplateRendererProps) {
  switch (templateId) {
    case 'night_out_card':
      return <NightOutCard ref={innerRef} entry={entry} />
    case 'mission_carousel':
      return <MissionCarousel ref={innerRef} entry={entry} />
    case 'steak_verdict':
      return <SteakVerdict ref={innerRef} entry={entry} />
    case 'ps5_match_card':
      return <PS5MatchCard ref={innerRef} entry={entry} />
    case 'gathering_invite':
      return <GatheringInviteCard ref={innerRef} entry={entry} />
    case 'countdown':
      return <CountdownCard ref={innerRef} entry={entry} />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface EntryCardProps {
  entry: Entry
  isActive: boolean
  onClick: () => void
}

function EntryCardItem({ entry, isActive, onClick }: EntryCardProps) {
  const meta = ENTRY_TYPE_META[entry.type]

  return (
    <motion.button
      variants={staggerItem}
      type="button"
      onClick={onClick}
      className={[
        'flex-shrink-0 w-44 p-3 rounded-xl text-left transition-all duration-200',
        'bg-slate-mid border',
        isActive
          ? 'border-gold/70 shadow-[0_0_0_1px_rgba(201,168,76,0.25)]'
          : 'border-white/8 hover:border-white/20',
      ].join(' ')}
      style={isActive ? { borderLeftWidth: '3px', borderLeftColor: '#C9A84C' } : {}}
      aria-pressed={isActive}
    >
      {/* Type badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-base leading-none">{meta.icon}</span>
        <span className="text-[10px] font-body tracking-widest uppercase text-ivory-dim">
          {meta.label}
        </span>
      </div>

      {/* Title */}
      <p className="font-display text-sm text-ivory leading-snug line-clamp-2 mb-1.5">
        {entry.title}
      </p>

      {/* Date */}
      <p className="text-[11px] font-mono text-ivory-dim">
        {formatDate(entry.date)}
      </p>
    </motion.button>
  )
}

interface TemplateOptionProps {
  config: TemplateConfig
  isActive: boolean
  onClick: () => void
}

function TemplateOption({ config, isActive, onClick }: TemplateOptionProps) {
  return (
    <motion.button
      variants={staggerItem}
      type="button"
      onClick={onClick}
      className={[
        'p-4 rounded-xl border text-left transition-all duration-200',
        'bg-slate-mid',
        isActive
          ? 'border-gold/70 bg-gold/5'
          : 'border-white/8 hover:border-white/20',
      ].join(' ')}
      aria-pressed={isActive}
    >
      {/* Icon placeholder */}
      <div
        className={[
          'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
          isActive ? 'bg-gold/15' : 'bg-white/5',
        ].join(' ')}
      >
        <ImageIcon
          size={18}
          className={isActive ? 'text-gold' : 'text-ivory-dim'}
          strokeWidth={1.5}
        />
      </div>

      {/* Label */}
      <p
        className={[
          'font-body text-sm font-medium leading-snug mb-1',
          isActive ? 'text-gold' : 'text-ivory',
        ].join(' ')}
      >
        {config.label}
      </p>

      {/* Dimensions */}
      <p className="font-mono text-[11px] text-ivory-dim">{config.dims}</p>
    </motion.button>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Studio() {
  const [searchParams] = useSearchParams()
  const preselectedEntryId = searchParams.get('entry')

  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)

  const templateRef = useRef<HTMLDivElement>(null)

  // Load entries on mount; honour ?entry= param
  useEffect(() => {
    fetchEntries({})
      .then((fetched) => {
        setEntries(fetched)
        if (preselectedEntryId) {
          const match = fetched.find((x) => x.id === preselectedEntryId)
          if (match) {
            setSelectedEntry(match)
            // Auto-select first template for that type if available
            const templates = TEMPLATES_BY_TYPE[match.type] ?? []
            if (templates.length > 0) setSelectedTemplate(templates[0].id)
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [preselectedEntryId])

  // When entry changes, reset template selection (unless same entry)
  function handleSelectEntry(entry: Entry) {
    if (selectedEntry?.id === entry.id) return
    setSelectedEntry(entry)
    const templates = TEMPLATES_BY_TYPE[entry.type] ?? []
    setSelectedTemplate(templates.length > 0 ? templates[0].id : null)
  }

  async function handleExport() {
    if (!templateRef.current || !selectedEntry) return
    setExporting(true)
    try {
      await exportAndShare(
        templateRef.current,
        `codex-${selectedEntry.type}-${selectedEntry.date}.png`,
      )
    } finally {
      setExporting(false)
    }
  }

  const availableTemplates = selectedEntry
    ? (TEMPLATES_BY_TYPE[selectedEntry.type] ?? [])
    : []

  const activeTemplateConfig = selectedTemplate
    ? availableTemplates.find((t) => t.id === selectedTemplate) ?? null
    : null

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <TopBar title="The Studio" />
        <PageWrapper>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Spinner size="lg" />
            <p className="text-sm text-ivory-dim font-body">Loading chronicle…</p>
          </div>
        </PageWrapper>
      </>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: main
  // ---------------------------------------------------------------------------

  return (
    <>
      <TopBar title="The Studio" />

      <PageWrapper padded={false} className="flex flex-col gap-0">

        {/* ------------------------------------------------------------------ */}
        {/* Step 1: Entry selector                                              */}
        {/* ------------------------------------------------------------------ */}

        {/* Only show the full selector if there was no preselected param */}
        {!preselectedEntryId && (
          <motion.section
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="px-4 pt-4 pb-5"
          >
            <p className="text-[11px] font-body tracking-widest uppercase text-gold-muted mb-3">
              01 — Select Entry
            </p>

            {entries.length === 0 ? (
              <p className="text-sm text-ivory-dim font-body py-6 text-center">
                No published entries yet.
              </p>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-0"
              >
                {entries.map((entry) => (
                  <EntryCardItem
                    key={entry.id}
                    entry={entry}
                    isActive={selectedEntry?.id === entry.id}
                    onClick={() => handleSelectEntry(entry)}
                  />
                ))}
              </motion.div>
            )}
          </motion.section>
        )}

        {/* When preselected: show a compact "selected entry" banner */}
        {preselectedEntryId && selectedEntry && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="mx-4 mt-4 mb-5 px-4 py-3 rounded-xl bg-slate-mid border border-white/8 flex items-center gap-3"
          >
            <span className="text-xl leading-none">
              {ENTRY_TYPE_META[selectedEntry.type].icon}
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm text-ivory truncate">
                {selectedEntry.title}
              </p>
              <p className="text-[11px] font-mono text-ivory-dim mt-0.5">
                {formatDate(selectedEntry.date)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Divider */}
        {selectedEntry && (
          <div className="mx-4 border-t border-white/8 mb-0" />
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Step 2: Template picker                                             */}
        {/* ------------------------------------------------------------------ */}

        <AnimatePresence mode="wait">
          {selectedEntry && (
            <motion.section
              key={selectedEntry.id + '-templates'}
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pt-5 pb-5"
            >
              <p className="text-[11px] font-body tracking-widest uppercase text-gold-muted mb-3">
                02 — Choose Template
              </p>

              {availableTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <span className="text-3xl">💭</span>
                  <p className="text-sm text-ivory-dim font-body text-center">
                    No export templates available for{' '}
                    <span className="text-ivory">
                      {ENTRY_TYPE_META[selectedEntry.type].label}
                    </span>{' '}
                    entries yet.
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-2 gap-3"
                >
                  {availableTemplates.map((tpl) => (
                    <TemplateOption
                      key={tpl.id}
                      config={tpl}
                      isActive={selectedTemplate === tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                    />
                  ))}
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ------------------------------------------------------------------ */}
        {/* Step 3: Preview + Export                                            */}
        {/* ------------------------------------------------------------------ */}

        <AnimatePresence mode="wait">
          {selectedEntry && selectedTemplate && activeTemplateConfig && (
            <motion.section
              key={selectedEntry.id + '-' + selectedTemplate}
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pb-8"
            >
              {/* Divider */}
              <div className="border-t border-white/8 mb-5" />

              <p className="text-[11px] font-body tracking-widest uppercase text-gold-muted mb-3">
                03 — Preview
              </p>

              {/* Preview wrapper */}
              <div
                className="w-full rounded-xl overflow-hidden border border-white/8 bg-obsidian mb-5"
                style={{
                  height: previewContainerHeight(activeTemplateConfig.dims),
                }}
              >
                {/* Scaled-down template canvas */}
                <div
                  style={{
                    width: `${CANVAS_WIDTH}px`,
                    transform: `scale(${PREVIEW_SCALE})`,
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                >
                  <TemplateRenderer
                    templateId={selectedTemplate}
                    entry={selectedEntry}
                    innerRef={templateRef}
                  />
                </div>
              </div>

              {/* Dims label */}
              <p className="text-[11px] font-mono text-ivory-dim text-center mb-5">
                {activeTemplateConfig.dims} px · PNG · 3×
              </p>

              {/* Export button */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={exporting}
                onClick={handleExport}
                className="gap-2"
              >
                {!exporting && <Share2 size={16} strokeWidth={2} />}
                {exporting ? 'Exporting…' : 'Export & Share'}
              </Button>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ------------------------------------------------------------------ */}
        {/* Empty state — no entry selected and there were no entries           */}
        {/* ------------------------------------------------------------------ */}

        {!loading && entries.length === 0 && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="flex flex-col items-center justify-center py-24 px-8 gap-4"
          >
            <span className="text-5xl">🎨</span>
            <p className="font-display text-lg text-ivory text-center">
              The Studio is Ready
            </p>
            <p className="text-sm text-ivory-dim text-center font-body leading-relaxed">
              Once you have published entries in The Chronicle, you can craft
              shareable cards and stories here.
            </p>
          </motion.div>
        )}

        {/* Prompt when entries exist but none selected yet */}
        {!loading && entries.length > 0 && !selectedEntry && !preselectedEntryId && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="flex flex-col items-center justify-center py-10 px-8 gap-2"
          >
            <p className="text-sm text-ivory-dim font-body text-center">
              Select an entry above to see available templates.
            </p>
          </motion.div>
        )}

      </PageWrapper>
    </>
  )
}
