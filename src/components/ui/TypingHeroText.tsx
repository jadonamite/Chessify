'use client'
import { motion, useMotionValue, useTransform, animate, useMotionValueEvent } from 'framer-motion'
import { useEffect, useState } from 'react'

interface TypingHeroTextProps {
  prefix?: string
  words: string[]
  className?: string
}

export default function TypingHeroText({ 
  prefix = "YOUR", 
  words = ["CHAIN", "STAKE", "MOVE"],
  className = "" 
}: TypingHeroTextProps) {
  const [index, setIndex] = useState(0)
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const displayContext = useTransform(rounded, (latest) => 
    words[index].slice(0, latest)
  )

  const [displayText, setDisplayText] = useState("")

  useMotionValueEvent(displayContext, "change", (latest) => {
    setDisplayText(latest)
  })

  useEffect(() => {
    // Reset count for new word
    count.set(0)
    
    const controls = animate(count, words[index].length, {
      type: "tween",
      duration: 0.8,
      ease: "easeOut",
      onComplete: () => {
        // Hold for 2.5 seconds then cycle
        setTimeout(() => {
          // Fade out the count before switching
          animate(count, 0, {
            type: "tween",
            duration: 0.4,
            ease: "easeIn",
            onComplete: () => {
              setIndex((prev) => (prev + 1) % words.length)
            }
          })
        }, 2500)
      }
    })

    return controls.stop
  }, [index, count, words])

  return (
    <div className={`hero-headline-container flex flex-col items-center select-none ${className}`}>
      <motion.h1 
        className="hero-headline leading-[0.86] tracking-[-0.05em] uppercase text-center" 
        style={{ 
          fontFamily: 'var(--fd)', 
          fontWeight: 900, 
          fontSize: 'clamp(56px, 10vw, 142px)',
          color: 'var(--t1)',
          textShadow: 'var(--hero-text-shadow)'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="opacity-70 text-[0.45em] tracking-[0.1em] mb-2"
        >
          {prefix}
        </motion.div>
        
        <div className="relative flex flex-col items-center">
          <motion.span 
            className="block"
            style={{ 
              color: 'var(--c)', 
              textShadow: 'var(--king-text-shadow, 0 0 60px rgba(0,204,255,0.35))' 
            }}
          >
            {displayText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
              className="ml-2 inline-block translate-y-[-0.05em]"
              style={{ color: 'var(--c)', textShadow: 'none' }}
            >
              _
            </motion.span>
          </motion.span>
        </div>
      </motion.h1>
    </div>
  )
}
