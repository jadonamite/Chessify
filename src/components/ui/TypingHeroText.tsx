'use client'
import { motion, useMotionValue, useTransform, animate, useMotionValueEvent } from 'framer-motion'
import { useEffect, useState } from 'react'

interface TypingHeroTextProps {
  prefix?: string
  words: string[]
  className?: string
}

export default function TypingHeroText({ 
  prefix = "THE CHECKMATE", 
  subtitle = "IS VERIFIED",
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
    count.set(0)
    
    const controls = animate(count, words[index].length, {
      type: "tween",
      duration: 1.4,
      ease: "linear",
      onComplete: () => {
        setTimeout(() => {
          animate(count, 0, {
            type: "tween",
            duration: 0.5,
            ease: "easeInOut",
            onComplete: () => {
              setIndex((prev) => (prev + 1) % words.length)
            }
          })
        }, 2000)
      }
    })

    return controls.stop
  }, [index, count, words])

  return (
    <div className={`hero-headline-container flex flex-col items-center select-none w-full max-w-[100vw] overflow-hidden px-4 ${className}`}>
      <motion.h1 
        className="hero-headline leading-[0.85] tracking-[-0.06em] uppercase text-center w-full" 
        style={{ 
          fontFamily: 'var(--fd)', 
          fontWeight: 900, 
          fontSize: 'clamp(40px, 8.2vw, 108px)', 
          color: 'var(--t1)',
          textShadow: 'var(--hero-text-shadow)'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="whitespace-nowrap"
        >
          {prefix}
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ color: 'var(--c)', textShadow: 'var(--king-text-shadow)' }}
          className="mb-8 md:mb-12"
        >
          {subtitle}
        </motion.div>
        
        <div className="relative flex items-center justify-center min-h-[1.2em] w-full gap-[0.3em]">
          <span 
            className="text-[0.42em] tracking-[-0.04em] font-black opacity-60"
            style={{ fontFamily: 'var(--fd)' }}
          >
            YOUR
          </span>
          <motion.span 
            className="text-[0.42em] tracking-[-0.04em] font-black"
            style={{ 
              color: 'var(--t1)',
              fontFamily: 'var(--fd)',
              textShadow: '0 0 40px rgba(0,204,255,0.2)'
            }}
          >
            {displayText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="ml-1 inline-block w-[3px] h-[0.9em] bg-current align-middle"
              style={{ color: 'var(--c)', background: 'var(--c)' }}
            />
          </motion.span>
        </div>
      </motion.h1>
    </div>
  )
}
