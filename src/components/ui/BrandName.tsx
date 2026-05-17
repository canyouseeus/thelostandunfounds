import { cn } from './utils'

interface BrandNameProps {
  className?: string
  /** Render as a different element. Defaults to 'span'. */
  as?: keyof JSX.IntrinsicElements
}

/**
 * Always renders "THE LOST+UNFOUNDS" with correct brand typography.
 * Use wherever the brand name appears inline in body copy or headings.
 */
export default function BrandName({ className, as: Tag = 'span' }: BrandNameProps) {
  return (
    <Tag className={cn('font-black uppercase tracking-wider text-white', className)}>
      THE LOST+UNFOUNDS
    </Tag>
  )
}
