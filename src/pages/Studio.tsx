import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { fetchAllStats } from '@/data/stats'
import { useThresholds } from '@/hooks/useThresholds'
import type { GentStats, GentAlias } from '@/types/app'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageIcon, Share2, Sparkles, Camera } from 'lucide-react'

import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { Button, Spinner, OnboardingTip } from '@/components/ui'
import { fetchEntries } from '@/data/entries'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { PhotoFilterContext, getFilter } from '@/lib/photoFilters'
import { getStoredFilter } from '@/hooks/useEntryFilter'
import { formatDate } from '@/lib/utils'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animations'
import { exportAndShare } from '@/export/exporter'
import { generateTemplateBg } from '@/ai/templateBg'
import type { Entry } from '@/types/app'

// Template imports
import { NightOutCard } from '@/export/templates/NightOutCard'
import { MissionCarousel } from '@/export/templates/MissionCarousel'
import { SteakVerdict } from '@/export/templates/SteakVerdict'
import { PS5MatchCard } from '@/export/templates/PS5MatchCard'
import { GatheringInviteCard } from '@/export/templates/GatheringInviteCard'
import { CountdownCard } from '@/export/templates/CountdownCard'
import { ToastCard } from '@/export/templates/ToastCard'
import { InterludeCard } from '@/export/templates/InterludeCard'
import { PassportPageExport } from '@/export/templates/PassportPageExport'
import { GatheringRecap } from '@/export/templates/GatheringRecap'
import { WrappedCard } from '@/export/templates/WrappedCard'
import { RivalryCard } from '@/export/templates/RivalryCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TemplateId =
  | 'night_out_card'
  | 'mission_carousel'
  | 'steak_verdict'
  | 'ps5_match_card'
  | 'gathering_invite'
  | 'countdown'
  | 'toast_card'
  | 'interlude_card'
  | 'passport_page'
  | 'gathering_recap'
  | 'wrapped_card'
  | 'rivalry_card'

interface TemplateConfig {
  id: TemplateId
  label: string
  dims: string
  /** Which aspect ratio to pass when generating an AI background */
  bgAspect?: '1:1' | '3:4' | '9:16'
}

// ---------------------------------------------------------------------------
// Template map — which templates are available per entry type
// ---------------------------------------------------------------------------

const TEMPLATES_BY_TYPE: Record<string, TemplateConfig[]> = {
  night_out:   [{ id: 'night_out_card',   label: 'Night Out Card',  dims: '1080×1350', bgAspect: '3:4' }],
  mission:     [
    { id: 'mission_carousel', label: 'Mission Card',   dims: '1080×1350', bgAspect: '3:4' },
    { id: 'passport_page',    label: 'Passport Page',  dims: '1080×1350', bgAspect: '3:4' },
  ],
  steak:       [{ id: 'steak_verdict',    label: 'Steak Verdict',   dims: '1080×1350', bgAspect: '3:4' }],
  playstation: [{ id: 'ps5_match_card',   label: 'Battle Card',     dims: '1080×1350', bgAspect: '3:4' }],
  gathering:   [
    { id: 'gathering_invite', label: 'Invite Card',      dims: '1080×1350', bgAspect: '3:4' },
    { id: 'countdown',        label: 'Countdown Card',   dims: '1080×1350', bgAspect: '3:4' },
    { id: 'gathering_recap',  label: 'Gathering Recap',  dims: '1080×1350', bgAspect: '3:4' },
  ],
  toast:       [{ id: 'toast_card',       label: 'Toast Card',      dims: '1080×1350', bgAspect: '3:4' }],
  interlude:   [{ id: 'interlude_card',   label: 'Interlude Card',  dims: '1080×1350', bgAspect: '3:4' }],
  // annual is a standalone type for year-in-review exports (no entry required)
  annual:      [{ id: 'wrapped_card',     label: 'Wrapped Card',    dims: '1080×1350', bgAspect: '3:4' }],
  // comparison is a standalone type — no entry required (driven by ?comparison= param)
  comparison:  [{ id: 'rivalry_card',     label: 'The Rivalry',     dims: '1080×1350', bgAspect: '3:4' }],
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
  templateId: TemplateId
  entry: Entry
  innerRef: React.Ref<HTMLDivElement>
  backgroundUrl?: string
  rewardKeys?: Set<string>
  comparisonParam?: string
}

function RivalryCardWrapper({
  innerRef,
  backgroundUrl,
  comparisonParam,
}: {
  innerRef: React.Ref<HTMLDivElement>
  backgroundUrl?: string
  comparisonParam?: string
}) {
  const [stats, setStats] = useState<GentStats[]>([])
  useEffect(() => {
    fetchAllStats().then(setStats).catch(() => {})
  }, [])
  const parts = (comparisonParam ?? 'keys:bass').split(':')
  const aliasA = (parts[0] ?? 'keys') as GentAlias
  const aliasB = (parts[1] ?? 'bass') as GentAlias
  const statA = stats.find((s) => s.alias === aliasA)
  const statB = stats.find((s) => s.alias === aliasB)
  if (!statA || !statB) {
    return (
      <div
        ref={innerRef as React.RefObject<HTMLDivElement>}
        style={{ width: '1080px', height: '1350px', backgroundColor: '#0D0B0F' }}
      />
    )
  }
  return <RivalryCard ref={innerRef} gentA={statA} gentB={statB} backgroundUrl={backgroundUrl} />
}

function TemplateRenderer({ templateId, entry, innerRef, backgroundUrl, rewardKeys, comparisonParam }: TemplateRendererProps) {
  switch (templateId) {
    case 'night_out_card':
      return <NightOutCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'mission_carousel':
      return <MissionCarousel ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} />
    case 'steak_verdict':
      return <SteakVerdict ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} />
    case 'ps5_match_card':
      return <PS5MatchCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'gathering_invite':
      return <GatheringInviteCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} />
    case 'countdown':
      return <CountdownCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'toast_card':
      return <ToastCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'interlude_card':
      return <InterludeCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'passport_page':
      return <PassportPageExport ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'gathering_recap':
      return <GatheringRecap ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'wrapped_card':
      return (
        <WrappedCard
          ref={innerRef}
          year={new Date().getFullYear()}
          totalMissions={0}
          totalCountries={0}
          totalSteaks={0}
          totalNightsOut={0}
          totalToasts={0}
        />
      )
    case 'rivalry_card':
      return <RivalryCardWrapper innerRef={innerRef} backgroundUrl={backgroundUrl} comparisonParam={comparisonParam} />
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
        <meta.Icon size={14} aria-hidden="true" className="text-ivory-dim shrink-0" />
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
  const comparisonParam = searchParams.get('comparison')

  const { rewardKeys } = useThresholds()

  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null)
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [generatingBg, setGeneratingBg] = useState(false)

  const templateRef = useRef<HTMLDivElement>(null)

  // Load entries on mount; honour ?entry= and ?comparison= params
  useEffect(() => {
    // Comparison mode — no entries needed
    if (comparisonParam) {
      setSelectedTemplate('rivalry_card')
      setLoading(false)
      return
    }
    let cancelled = false
    fetchEntries({})
      .then((fetched) => {
        if (cancelled) return
        setEntries(fetched)
        if (preselectedEntryId) {
          const match = fetched.find((x) => x.id === preselectedEntryId)
          if (match) {
            setSelectedEntry(match)
            if (match.cover_image_url) {
              setBgUrl(match.cover_image_url)
            }
            // Auto-select first template for that type if available
            const templates = TEMPLATES_BY_TYPE[match.type] ?? []
            if (templates.length > 0) setSelectedTemplate(templates[0].id)
          }
        }
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [preselectedEntryId, comparisonParam])

  // When entry changes, reset template selection and use cover image as default background
  function handleSelectEntry(entry: Entry) {
    if (selectedEntry?.id === entry.id) return
    setSelectedEntry(entry)
    setBgUrl(entry.cover_image_url ?? null)
    const templates = TEMPLATES_BY_TYPE[entry.type] ?? []
    setSelectedTemplate(templates.length > 0 ? templates[0].id : null)
  }

  // When template changes, keep the current background (cover or AI)
  function handleSelectTemplate(templateId: TemplateId) {
    setSelectedTemplate(templateId)
  }

  async function handleGenerateBg() {
    if (!selectedEntry || !activeTemplateConfig) return
    setGeneratingBg(true)
    try {
      const url = await generateTemplateBg(selectedEntry, activeTemplateConfig.bgAspect ?? '3:4')
      if (url) setBgUrl(url)
    } finally {
      setGeneratingBg(false)
    }
  }

  function handleUseCoverImage() {
    if (!selectedEntry?.cover_image_url) return
    setBgUrl(selectedEntry.cover_image_url)
  }

  async function handleExport() {
    if (!templateRef.current) return
    setExporting(true)
    const filename = comparisonParam
      ? `codex-rivalry-${comparisonParam}.png`
      : `codex-${selectedEntry?.type ?? 'export'}-${selectedEntry?.date ?? Date.now()}.png`
    try {
      await exportAndShare(templateRef.current, filename)
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

  const bgSource: 'cover' | 'ai' | null = useMemo(() => {
    if (!bgUrl) return null
    return bgUrl === selectedEntry?.cover_image_url ? 'cover' : 'ai'
  }, [bgUrl, selectedEntry?.cover_image_url])

  const filterContextValue = useMemo(
    () => getFilter(getStoredFilter(selectedEntry?.id)).css,
    [selectedEntry?.id],
  )

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <TopBar title="Studio" />
        <SectionNav />
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
      <TopBar title="Studio" />
      <SectionNav />

      <PageWrapper padded={false} className="flex flex-col gap-0">

        <OnboardingTip
          tipKey="studio"
          title="The Studio"
          body="Pick any entry from the list below to generate a shareable export card. AI backgrounds are generated per entry type. Use Export to Studio from any entry detail page to jump straight here."
        />

        {/* ------------------------------------------------------------------ */}
        {/* Step 1: Entry selector                                              */}
        {/* ------------------------------------------------------------------ */}

        {/* Comparison mode banner */}
        {comparisonParam && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="mx-4 mt-4 mb-5 px-4 py-3 rounded-xl bg-slate-mid border border-white/8 flex items-center gap-3"
          >
            <div className="min-w-0">
              <p className="font-display text-sm text-ivory">The Rivalry</p>
              <p className="text-[11px] font-mono text-ivory-dim mt-0.5">
                {comparisonParam.replace(':', ' vs ')}
              </p>
            </div>
          </motion.div>
        )}

        {/* Only show the full selector if there was no preselected param */}
        {!preselectedEntryId && !comparisonParam && (
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

        {/* When preselected: show a compact "selected entry" banner (not in comparison mode) */}
        {preselectedEntryId && !comparisonParam && selectedEntry && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="mx-4 mt-4 mb-5 px-4 py-3 rounded-xl bg-slate-mid border border-white/8 flex items-center gap-3"
          >
            {(() => { const { Icon: EntryIcon } = ENTRY_TYPE_META[selectedEntry.type]; return <EntryIcon size={20} aria-hidden="true" className="shrink-0 text-ivory-muted" /> })()}
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
        {(selectedEntry || comparisonParam) && (
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
                      onClick={() => handleSelectTemplate(tpl.id)}
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
          {(selectedEntry || comparisonParam) && selectedTemplate && (activeTemplateConfig || comparisonParam) && (
            <motion.section
              key={(selectedEntry?.id ?? 'comparison') + '-' + selectedTemplate}
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
                className="w-full rounded-xl overflow-hidden border border-white/8 bg-obsidian mb-4"
                style={{
                  height: previewContainerHeight(activeTemplateConfig?.dims ?? '1080×1350'),
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
                  <PhotoFilterContext.Provider value={filterContextValue}>
                    <TemplateRenderer
                      templateId={selectedTemplate}
                      entry={selectedEntry ?? ({} as Entry)}
                      innerRef={templateRef}
                      backgroundUrl={bgUrl ?? undefined}
                      rewardKeys={rewardKeys}
                      comparisonParam={comparisonParam ?? undefined}
                    />
                  </PhotoFilterContext.Provider>
                </div>
              </div>

              {/* Dims label */}
              <p className="text-[11px] font-mono text-ivory-dim text-center mb-4">
                {activeTemplateConfig?.dims ?? '1080×1350'} px · PNG · 3×
              </p>

              {/* Background source picker */}
              <div className="flex gap-2 mb-3">
                {/* Cover image button — only if entry has a cover */}
                {selectedEntry?.cover_image_url && (
                  <Button
                    variant="ghost"
                    size="md"
                    fullWidth
                    onClick={handleUseCoverImage}
                    className={[
                      'gap-2 border transition-all',
                      bgSource === 'cover'
                        ? 'border-gold/50 bg-gold/8 text-gold'
                        : 'border-white/10 hover:border-white/25',
                    ].join(' ')}
                  >
                    <Camera size={14} strokeWidth={1.5} />
                    Cover Photo
                  </Button>
                )}
                {/* AI background button */}
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  loading={generatingBg}
                  onClick={handleGenerateBg}
                  className={[
                    'gap-2 border transition-all',
                    bgSource === 'ai'
                      ? 'border-gold/50 bg-gold/8 text-gold'
                      : 'border-white/10 hover:border-gold/30',
                  ].join(' ')}
                >
                  {!generatingBg && <Sparkles size={14} strokeWidth={1.5} className="text-gold" />}
                  {generatingBg ? 'Generating…' : bgSource === 'ai' ? 'AI Styled' : selectedEntry?.cover_image_url ? 'AI Restyle' : 'Generate AI'}
                </Button>
              </div>

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
