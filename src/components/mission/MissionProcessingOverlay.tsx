import { motion } from 'framer-motion'

export type ProcessingStage =
  | 'uploading'
  | 'extracting_exif'
  | 'clustering_scenes'
  | 'analyzing_photos'
  | 'generating_narrative'
  | 'building_intel'
  | 'complete'

const STAGE_LABELS: Record<ProcessingStage, string> = {
  uploading: 'Uploading photos to vault...',
  extracting_exif: 'Extracting location & time data...',
  clustering_scenes: 'Identifying scenes...',
  analyzing_photos: 'AI analyzing each photo...',
  generating_narrative: 'Generating mission narrative...',
  building_intel: 'Assembling intelligence dossier...',
  complete: 'Mission dossier ready.',
}

const STAGE_ORDER: ProcessingStage[] = [
  'uploading', 'extracting_exif', 'clustering_scenes',
  'analyzing_photos', 'generating_narrative', 'building_intel', 'complete',
]

interface Props {
  stage: ProcessingStage
  photoProgress?: { done: number; total: number }
  analysisProgress?: { done: number; total: number }
}

export function MissionProcessingOverlay({ stage, photoProgress, analysisProgress }: Props) {
  const stageIdx = STAGE_ORDER.indexOf(stage)

  return (
    <div className="fixed inset-0 z-50 bg-obsidian/95 flex items-center justify-center">
      <div className="max-w-sm w-full px-6">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo-gold.webp" alt="" className="w-16 h-16 animate-pulse" />
        </div>

        {/* Stage list */}
        <div className="space-y-3">
          {STAGE_ORDER.slice(0, -1).map((s, i) => {
            const isActive = i === stageIdx
            const isDone = i < stageIdx
            const isPending = i > stageIdx

            return (
              <motion.div
                key={s}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isPending ? 0.3 : 1, x: 0 }}
                className="flex items-center gap-3"
              >
                {/* Status indicator */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  isDone ? 'bg-gold' :
                  isActive ? 'bg-gold animate-pulse' :
                  'bg-ivory/20'
                }`} />

                {/* Label */}
                <span className={`text-xs font-body tracking-wide ${
                  isDone ? 'text-gold/60' :
                  isActive ? 'text-ivory' :
                  'text-ivory/30'
                }`}>
                  {STAGE_LABELS[s]}
                </span>

                {/* Progress detail */}
                {isActive && s === 'uploading' && photoProgress && (
                  <span className="text-[10px] text-gold/50 font-mono ml-auto">
                    {photoProgress.done}/{photoProgress.total}
                  </span>
                )}
                {isActive && s === 'analyzing_photos' && analysisProgress && (
                  <span className="text-[10px] text-gold/50 font-mono ml-auto">
                    {analysisProgress.done}/{analysisProgress.total}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Bottom progress bar */}
        <div className="mt-8 h-0.5 bg-ivory/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gold/60 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(stageIdx / (STAGE_ORDER.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}
