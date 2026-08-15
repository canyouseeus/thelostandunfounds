import { cn } from './utils'

interface AffiliateProgramNameProps {
  className?: string
  /** Render as a different element. Defaults to 'span'. */
  as?: keyof JSX.IntrinsicElements
}

/**
 * Always renders "THE AFFILIATE PROGRAM" with the same weight/tracking/uppercase
 * convention as <BrandName />: the program name gets the wordmark treatment.
 */
export default function AffiliateProgramName({ className, as: Tag = 'span' }: AffiliateProgramNameProps) {
  return (
    <Tag className={cn('font-black uppercase tracking-wider text-white', className)}>
      THE AFFILIATE PROGRAM
    </Tag>
  )
}
