import React, {
  type ComponentPropsWithoutRef,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { AnimatePresence, motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

export function AnimatedListItem({ children, isNew = false }: { children: React.ReactNode; isNew?: boolean }) {
  const animations: MotionProps = {
    initial: isNew ? { scale: 0, opacity: 0, y: -50 } : { scale: 1, opacity: 1 },
    animate: { scale: 1, opacity: 1, y: 0, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  }

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  )
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  delay?: number
}

export const AnimatedList = React.memo(
  ({ children, className, ...props }: AnimatedListProps) => {
    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children]
    )
    
    // Garder une trace des clés déjà vues pour identifier les nouveaux éléments
    const seenKeysRef = useRef<Set<React.Key>>(new Set())
    
    // Identifier les nouveaux éléments (ceux qui n'ont pas encore été vus)
    const itemsWithNewFlag = useMemo(() => {
      const currentKeys = new Set<React.Key>()
      const items = childrenArray.map((item) => {
        const key = (item as React.ReactElement).key
        const isNew = key !== null && !seenKeysRef.current.has(key)
        if (key !== null) {
          currentKeys.add(key)
        }
        return { item, isNew, key }
      })
      return items
    }, [childrenArray])
    
    // Mettre à jour les clés vues après le render
    useEffect(() => {
      itemsWithNewFlag.forEach(({ key }) => {
        if (key !== null) {
          seenKeysRef.current.add(key)
        }
      })
    }, [itemsWithNewFlag])

    return (
      <div
        className={cn(`flex flex-col items-center gap-4`, className)}
        {...props}
      >
        <AnimatePresence mode="popLayout">
          {itemsWithNewFlag.map(({ item, isNew, key }) => (
            <AnimatedListItem key={key} isNew={isNew}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    )
  }
)

AnimatedList.displayName = "AnimatedList"
