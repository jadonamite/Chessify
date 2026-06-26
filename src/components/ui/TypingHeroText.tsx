'use client'
import { motion, useMotionValue, useTransform, animate, useMotionValueEvent } from 'framer-motion'
import { useEffect, useState } from 'react'

interface TypingHeroTextProps {
  prefix?: string
  subtitle?: string
  words?: string[]
  className?: string
}

const getHeroHeadlineStyles = (fontSize: string, color: string, textShadow: string, marginBottom?: string) => ({
  fontSize,
  color,
  textShadow,
  whiteSpace: 'nowrap',
  marginBottom,
})

const getTypingTextStyles = (color: string, textShadow: string) => ({
  color,
  textShadow,
  position: 'relative',
})

export default function TypingHeroText({
  prefix = 'THE CHECKMATE',
  subtitle = 'IS VERIFIED',
  words = ['CHAIN', 'STAKE', 'MOVE'],
  className = '',
}: TypingHeroTextProps) {
  const [index, setIndex] = useState(0)
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const displayContext = useTransform(rounded, (latest) => words[index].slice(0, latest))
  const [displayText, setDisplayText] = useState('')

  useMotionValueEvent(displayContext, 'change', (latest) => {
    setDisplayText(latest)
  })

  useEffect(() => {
    count.set(0)
    const controls = animate(
      count,
      words[index].length,
      {
        type: 'tween',
        duration: 1.4,
        ease: 'linear',
        onComplete: () => {
          setTimeout(() => {
            animate(
              count,
              0,
              {
                type: 'tween',
                duration: 0.5,
                ease: 'easeInOut',
                onComplete: () => {
                  setIndex((prev) => (prev + 1) % words.length)
                },
              }
            )
          }, 2000)
        },
      }
    )
    return controls.stop
  }, [index, count, words])

  return (
    <div
      className={`hero-headline-container flex flex-col items-center select-none w-full overflow-hidden px-4 ${className}`}
    >
      <div
        className='flex flex-col items-center text-center w-full uppercase select-none'
        style={{
          fontFamily: 'var(--fd)',
          fontWeight: 900,
          lineHeight: 0.88,
          letterSpacing: '-0.05em',
        }}
      >
        {/* Line 1: 'THE CHECKMATE' */}
        <motion.div
          className='hero-headline w-full text-center'
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={getHeroHeadlineStyles(
            'clamp(22px, 6.8vw, 110px)',
            'var(--t1)',
            'var(--hero-text-shadow)'
          )}
        >
          {prefix}
        </motion.div>
        {/* Line 2: 'IS VERIFIED' */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={getHeroHeadlineStyles(
            'clamp(26px, 8vw, 130px)',
            'var(--c)',
            'var(--king-text-shadow)',
            '0.35em'
          )}
        >
          {subtitle}
        </motion.div>
        {/* Line 3: 'YOUR [word]' */}
        <div
          className='flex items-center justify-center gap-[0.25em]'
          style={{ fontSize: 'clamp(14px, 4.2vw, 56px)', marginTop: '0.1em' }}
        >
          <span style={{ opacity: 0.55, color: 'var(--t1)' }}>YOUR</span>
          <motion.span style={getTypingTextStyles('var(--t1)', '0 0 40px rgba(0,204,255,0.2)')}
          >
            {displayText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              style={{
                display: 'inline-block',
                width: '2px',
                height: '0.85em',
                background: 'var(--c)',
                verticalAlign: 'middle',
                marginLeft: '0.12em',
              }}
            />
          </motion.span>
        </div>
      </div>
    </div>
  )
}
