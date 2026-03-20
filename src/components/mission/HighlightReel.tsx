import type { EntryPhoto, PhotoAnalysis } from '@/types/app'

interface Props {
  highlightIds: string[]
  photos: EntryPhoto[]
  analyses: Map<string, PhotoAnalysis>
}

export function HighlightReel({ highlightIds, photos, analyses }: Props) {
  if (highlightIds.length === 0) return null

  const highlights = highlightIds
    .map(id => {
      const photo = photos.find(p => p.id === id)
      const analysis = analyses.get(id)
      return photo && analysis ? { photo, analysis } : null
    })
    .filter(Boolean) as { photo: EntryPhoto; analysis: PhotoAnalysis }[]

  if (highlights.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-gold/40">
        Highlight Reel
      </h3>
      <div className="space-y-3">
        {highlights.map(({ photo, analysis }) => (
          <div key={photo.id} className="relative rounded-lg overflow-hidden">
            <img
              src={photo.url}
              alt=""
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              {analysis.highlight_reason && (
                <p className="text-ivory/70 font-body text-xs leading-relaxed">
                  {analysis.highlight_reason}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-gold/50">
                  {analysis.quality_score}/10
                </span>
                {analysis.venue_name && (
                  <span className="text-[10px] font-body text-ivory/30">
                    {analysis.venue_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
