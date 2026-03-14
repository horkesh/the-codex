import type { Story } from '@/types/app'

interface StoryCardProps {
  story: Story
  onClick: () => void
}

export function StoryCard({ story, onClick }: StoryCardProps) {
  return (
    <button onClick={onClick} className="w-full text-left">
      <div className="bg-slate-dark border border-white/5 rounded-xl overflow-hidden hover:border-gold/20 transition-colors">
        {/* Cover */}
        {story.cover_url ? (
          <div className="h-40 relative overflow-hidden">
            <img src={story.cover_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-dark/80 to-transparent" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-slate-mid to-obsidian flex items-center justify-center">
            <div className="w-12 h-px bg-gold/40" />
          </div>
        )}
        {/* Content */}
        <div className="p-4">
          <h3 className="font-display text-ivory text-base leading-tight">{story.title}</h3>
          {story.subtitle && (
            <p className="text-ivory-dim text-xs italic mt-1 font-body">{story.subtitle}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-ivory-dim font-body">
              {story.entry_ids.length} moment{story.entry_ids.length !== 1 ? 's' : ''}
            </span>
            {story.status === 'draft' && (
              <span className="text-[10px] tracking-widest uppercase text-gold/50 font-body">Draft</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
