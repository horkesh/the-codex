import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Empty-state illustration. Hides on load error so missing assets don't show broken icon.
 * Drop images into public/empty-states/ (see docs/03-architecture/entry_type_image_prompts.md).
 */
interface EmptyStateImageProps {
  src: string
  alt?: string
  className?: string
}

export function EmptyStateImage({ src, alt = '', className }: EmptyStateImageProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={src}
      alt={alt}
      className={cn('w-64 max-w-[85%] h-auto', className)}
      onError={() => setFailed(true)}
    />
  )
}
