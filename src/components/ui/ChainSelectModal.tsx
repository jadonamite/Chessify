/* ... (rest of the code remains the same) */

/* ── Chain Card ── */
function ChainCard({
  name,
  ecosystem,
  description,
  accentColor,
  accentGlow,
  iconUrl,
  onClick,
  delay = 0,
  children,
}: {
  name: string;
  ecosystem: string;
  description: string;
  accentColor: string;
  accentGlow: string;
  iconUrl: string;
  onClick: () => void;
  delay?: number;
  children: React.ReactNode
}) {
  const getCardStyles = (
    accentColor: string,
    accentGlow: string,
    delay: number
  ) => ({
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { delay, type: 'spring', stiffness: 180, damping: 20 },
    whileHover: { scale: 1.02, y: -4 },
    whileTap: { scale: 0.98 },
    boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.4)`,
    background: `radial-gradient(ellipse at 50% 80%, ${accentGlow}, transparent 70%)`,
    borderColor: `${accentColor}30`,
    backgroundColor: `${accentColor}08`,
  });

  const cardStyles = getCardStyles(accentColor, accentGlow, delay);

  return (
    <motion.button
      initial={cardStyles.initial}
      animate={cardStyles.animate}
      transition={cardStyles.transition}
      whileHover={cardStyles.whileHover}
      whileTap={cardStyles.whileTap}
      onClick={onClick}
      className="relative w-full rounded-[28px] border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden text-left cursor-pointer group transition-all"
      style={cardStyles}
    >
      {/* ... (rest of the component remains the same) */}
    </motion.button>
  );
}

/* ... (rest of the code remains the same) */