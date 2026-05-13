'use client'
import { motion, useMotionValue, useTransform, animate, useMotionValueEvent } from 'framer-motion'
import { useEffect, useState } from 'react'

interface TypingHeroTextProps {
  prefix?: string
  words: string[]
  className?: string
}

export default function TypingHeroText({ 
  prefix = "IMMUTABLE", 
  subtitle = "CHECKMATE",
  words = ["YOUR CHAIN", "YOUR STAKE", "YOUR MOVE"],
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
    count.set(0)
    
    const controls = animate(count, words[index].length, {
      type: "tween",
      duration: 1.6, // Slower typing
      ease: "linear",
      onComplete: () => {
        setTimeout(() => {
          animate(count, 0, {
            type: "tween",
            duration: 0.6,
            ease: "easeInOut",
            onComplete: () => {
              setIndex((prev) => (prev + 1) % words.length)
            }
          })
        }, 3000) // Longer pause
      }
    })

    return controls.stop
  }, [index, count, words])

  return (
    <div className={`hero-headline-container flex flex-col items-center select-none ${className}`}>
      <motion.h1 
        className="hero-headline leading-[0.82] tracking-[-0.06em] uppercase text-center" 
        style={{ 
          fontFamily: 'var(--fd)', 
          fontWeight: 900, 
          fontSize: 'clamp(48px, 9vw, 120px)',
          color: 'var(--t1)',
          textShadow: 'var(--hero-text-shadow)'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-1"
        >
          {prefix}
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ color: 'var(--c)', textShadow: 'var(--king-text-shadow)' }}
          className="mb-8"
        >
          {subtitle}
        </motion.div>
        
        <div className="relative flex flex-col items-center min-h-[1.2em]">
          <motion.span 
            className="block text-[0.32em] tracking-[0.2em] font-medium opacity-80"
            style={{ 
              color: 'var(--t1)',
              fontFamily: 'var(--fd)'
            }}
          >
            {displayText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="ml-2 inline-block w-[2px] h-[1em] bg-current align-middle"
              style={{ color: 'var(--c)' }}
            />
          </motion.span>
        </div>
      </motion.h1>
    </div>
  )
}
