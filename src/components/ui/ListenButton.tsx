import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import { useNarration } from '@/hooks/useNarration'

interface ListenButtonProps {
  cacheKey: string
  text: string
  size?: 'sm' | 'md'
}

export function ListenButton({ cacheKey, text, size = 'sm' }: ListenButtonProps) {
  const { audioUrl, generating, playing, generate, play } = useNarration(cacheKey)

  function handleClick() {
    if (audioUrl) play()
    else generate(text)
  }

  const px = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={generating}
      className={`flex items-center gap-1 ${px} rounded-full bg-gold/10 border border-gold/20 ${textSize} font-body text-gold hover:bg-gold/15 transition-colors disabled:opacity-40`}
    >
      {generating ? (
        <Loader2 size={10} className="animate-spin" />
      ) : playing ? (
        <VolumeX size={10} />
      ) : (
        <Volume2 size={10} />
      )}
      {generating ? 'Generating...' : playing ? 'Stop' : 'Listen'}
    </button>
  )
}
