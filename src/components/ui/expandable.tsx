import * as React from "react"
import { AnimatePresence, motion, MotionConfig, Transition, Variant, Variants } from "framer-motion"
import { cn } from "./utils"
import { useMeasure } from "@uidotdev/usehooks"

interface ExpandableContextType {
  isExpanded: boolean
  toggleExpand: () => void
  expandDirection: "vertical" | "horizontal" | "both"
  expandBehavior: "replace" | "push" | "overlay"
  transition?: Transition
  ease?: string
  initialDelay?: number
  onExpandStart?: () => void
  onExpandEnd?: () => void
  onCollapseStart?: () => void
  onCollapseEnd?: () => void
  controls: any
}

const ExpandableContext = React.createContext<ExpandableContextType | undefined>(
  undefined
)

const useExpandable = () => {
  const context = React.useContext(ExpandableContext)
  if (!context) {
    throw new Error("useExpandable must be used within an Expandable provider")
  }
  return context
}

interface ExpandableProps {
  children: React.ReactNode | ((props: { isExpanded: boolean }) => React.ReactNode)
  expanded?: boolean
  onToggle?: () => void
  transition?: Transition
  ease?: string
  initialDelay?: number
  onExpandStart?: () => void
  onExpandEnd?: () => void
  onCollapseStart?: () => void
  onCollapseEnd?: () => void
  expandDirection?: "vertical" | "horizontal" | "both"
  expandBehavior?: "replace" | "push" | "overlay"
}

const Expandable = ({
  children,
  expanded: controlledExpanded,
  onToggle,
  transition = { type: "spring", damping: 20, stiffness: 300 },
  ease = "easeInOut",
  initialDelay = 0,
  onExpandStart,
  onExpandEnd,
  onCollapseStart,
  onCollapseEnd,
  expandDirection = "vertical",
  expandBehavior = "replace",
}: ExpandableProps) => {
  const [internalExpanded, setInternalExpanded] = React.useState(false)
  const isExpanded = controlledExpanded ?? internalExpanded
  const controls = React.useRef({ isExpanded })

  const toggleExpand = React.useCallback(() => {
    const nextState = !isExpanded
    if (onToggle) {
      onToggle()
    } else {
      setInternalExpanded(nextState)
    }
    
    if (nextState) {
      onExpandStart?.()
    } else {
      onCollapseStart?.()
    }
  }, [isExpanded, onToggle, onExpandStart, onCollapseStart])

  const value = React.useMemo(
    () => ({
      isExpanded,
      toggleExpand,
      expandDirection,
      expandBehavior,
      transition,
      ease,
      initialDelay,
      onExpandStart,
      onExpandEnd,
      onCollapseStart,
      onCollapseEnd,
      controls,
    }),
    [
      isExpanded,
      toggleExpand,
      expandDirection,
      expandBehavior,
      transition,
      ease,
      initialDelay,
      onExpandStart,
      onExpandEnd,
      onCollapseStart,
      onCollapseEnd,
    ]
  )

  return (
    <ExpandableContext.Provider value={value}>
      <MotionConfig transition={transition}>
        {typeof children === "function" ? children({ isExpanded }) : children}
      </MotionConfig>
    </ExpandableContext.Provider>
  )
}

interface ExpandableTriggerProps {
  children: React.ReactNode
}

const ExpandableTrigger = ({ children }: ExpandableTriggerProps) => {
  const { toggleExpand, isExpanded } = useExpandable()
  return (
    <div 
      onClick={(e) => {
        // Don't toggle if clicking on drawer content
        const expandableContent = (e.target as HTMLElement).closest('[data-expandable-content]');
        if (expandableContent) {
          e.stopPropagation();
          return;
        }
        // Don't toggle if clicking anywhere in the drawer toast (header, content, or container)
        const drawerToast = (e.target as HTMLElement).closest('.drawer-toast');
        const drawerHeader = (e.target as HTMLElement).closest('.drawer-header');
        const drawerContent = (e.target as HTMLElement).closest('.drawer-content');
        if (drawerToast || drawerHeader || drawerContent) {
          e.stopPropagation();
          return;
        }
        // Toggle expansion when clicking the trigger area (excluding drawer content)
        toggleExpand();
      }} 
      className=""
    >
      {children}
    </div>
  )
}

interface ExpandableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  collapsedSize?: { width?: number | string; height?: number | string }
  expandedSize?: { width?: number | string; height?: number | string }
  hoverToExpand?: boolean
  expandDelay?: number
  collapseDelay?: number
}

const ExpandableCard = ({
  children,
  className,
  collapsedSize = { width: 320, height: 220 },
  expandedSize = { width: 480, height: undefined },
  hoverToExpand = false,
  expandDelay = 0,
  collapseDelay = 0,
  ...props
}: ExpandableCardProps) => {
  const { isExpanded, toggleExpand, expandDirection, transition, ease } = useExpandable()
  const [ref, bounds] = useMeasure()
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (hoverToExpand && !isExpanded) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        toggleExpand()
      }, expandDelay)
    }
  }

  const handleMouseLeave = () => {
    if (hoverToExpand && isExpanded) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        toggleExpand()
      }, collapseDelay)
    }
  }

  // For percentage/auto heights, use layout animations instead of variants
  const needsLayoutAnimation = 
    expandDirection === 'vertical' && 
    (collapsedSize.height === '100%' || expandedSize.height === 'auto');

  const variants: Variants = needsLayoutAnimation ? {
    collapsed: {
      width: expandDirection === "vertical" ? (collapsedSize.width || "100%") : collapsedSize.width,
    },
    expanded: {
      width: expandDirection === "vertical" ? (expandedSize.width || "100%") : (expandedSize.width || "auto"),
    },
  } : {
    collapsed: {
      width: expandDirection === "vertical" ? (collapsedSize.width || "100%") : collapsedSize.width,
      height: expandDirection === "horizontal" ? (collapsedSize.height || "100%") : collapsedSize.height,
    },
    expanded: {
      width: expandDirection === "vertical" ? (expandedSize.width || "100%") : (expandedSize.width || "auto"),
      height: expandDirection === "horizontal" ? (expandedSize.height || "100%") : (expandedSize.height || "auto"),
    },
  }

  // Exclude conflicting HTML event handlers that conflict with motion props
  const {
    onDrag,
    onDragStart,
    onDragEnd,
    onAnimationStart,
    onAnimationEnd,
    onAnimationIteration,
    ...motionProps
  } = props;
  
  // Set height via style when using layout animations
  const heightStyle = needsLayoutAnimation 
    ? { 
        height: isExpanded 
          ? (expandedSize.height === 'auto' ? 'auto' : expandedSize.height || 'auto')
          : (collapsedSize.height === '100%' ? '100%' : collapsedSize.height || undefined)
      }
    : {};

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative overflow-hidden",
        "rounded-none", // Ensure sharp corners
        "transition-all duration-300",
        className
      )}
      style={heightStyle}
      variants={variants}
      initial="collapsed"
      animate={isExpanded ? "expanded" : "collapsed"}
      transition={transition}
      layout={needsLayoutAnimation}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...(motionProps as any)}
    >
      {children}
    </motion.div>
  )
}

const ExpandableCardHeader = ({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}) => {
  return <div className={cn("p-4", className)} onClick={onClick}>{children}</div>
}

const ExpandableCardContent = ({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}) => {
  return <div className={cn("p-4 pt-0", className)} onClick={onClick}>{children}</div>
}

const ExpandableCardFooter = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return <div className={cn("p-4 pt-0", className)}>{children}</div>
}

interface ExpandableContentProps {
  children: React.ReactNode
  preset?: "fade" | "blur-sm" | "blur-md" | "scale" | "slide-up" | "slide-down" | "slide-left" | "slide-right"
  stagger?: boolean
  staggerChildren?: number
  keepMounted?: boolean
  animateIn?: Variant
  animateOut?: Variant
}

const ExpandableContent = ({
  children,
  preset = "fade",
  stagger = false,
  staggerChildren = 0.1,
  keepMounted = false,
  animateIn,
  animateOut,
}: ExpandableContentProps) => {
  const { isExpanded, initialDelay } = useExpandable()

  const presets: Record<string, { initial: Variant; animate: Variant; exit: Variant }> = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    "blur-sm": {
      initial: { opacity: 0, filter: "blur(4px)" },
      animate: { opacity: 1, filter: "blur(0px)" },
      exit: { opacity: 0, filter: "blur(4px)" },
    },
    "blur-md": {
      initial: { opacity: 0, filter: "blur(8px)" },
      animate: { opacity: 1, filter: "blur(0px)" },
      exit: { opacity: 0, filter: "blur(8px)" },
    },
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },
    "slide-up": {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
    "slide-down": {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    "slide-left": {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
    },
    "slide-right": {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    },
  }

  const selectedPreset = presets[preset]
  
  const containerVariants: Variants = {
    hidden: { 
      transition: { staggerChildren: 0.05, staggerDirection: -1 }
    },
    visible: {
      transition: { 
        delayChildren: initialDelay,
        staggerChildren: stagger ? staggerChildren : 0
      }
    }
  }

  const itemVariants: Variants = {
    hidden: animateOut || selectedPreset.exit,
    visible: animateIn || selectedPreset.animate,
  }

  return (
    <AnimatePresence mode="wait">
      {(isExpanded || keepMounted) && (
        <motion.div
          data-expandable-content
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={containerVariants}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div variants={itemVariants}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const ExpandableCloseButton = ({ 
  children, 
  className 
}: { 
  children?: React.ReactNode
  className?: string 
}) => {
  const { toggleExpand } = useExpandable()
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggleExpand()
      }}
      className={className}
    >
      {children || '×'}
    </button>
  )
}

export {
  Expandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandableCardFooter,
  ExpandableContent,
  ExpandableTrigger,
  ExpandableCloseButton,
  useExpandable,
}

