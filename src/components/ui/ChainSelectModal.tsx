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
  children: React.ReactNode;
}) {
  const getCardStyles = (
    accentColor: string,
    accentGlow: string,
    delay: number
  ) => ({
    boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.4)`,
    '--c': accentColor,
    '--king-text-shadow': `0 0 10px ${accentGlow}`,
  });

  const getHoverStyles = (accentColor: string) => ({
    borderColor: `${accentColor}30`,
    background: `${accentColor}08`,
  });

  return (
    <motion.button
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 180, damping: 20 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative w-full rounded-[28px] border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden text-left cursor-pointer group transition-all"
      style={getCardStyles(accentColor, accentGlow, delay)}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 80%, ${accentGlow}, transparent 70%)`,
        }}
      />
      {/* 3D Scene */}
      <div className="w-full h-40 md:h-48 relative">
        <Canvas camera={{ position: [0, 0, 4.5], fov: 40 }} gl={{ alpha: true }}>
          <Suspense fallback={null}>
            <ambientLight intensity={1.5} />
            <pointLight position={[5, 5, 5]} intensity={2} color={accentColor} />
            <Environment files="/textures/environment/city.hdr" />
            {children}
          </Suspense>
        </Canvas>
        {/* Gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900/60 to-transparent" />
      </div>
      {/* Body */}
      <div className="px-6 pb-6 pt-1 relative z-10">
        {/* Ecosystem Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 flex items-center justify-center relative bg-white/5 rounded-lg border border-white/10 p-1">
            <img src={iconUrl} alt="chain" className="w-full h-full object-contain" />
          </div>
          <span
            className="text-[9px] font-black tracking-[0.3em] uppercase"
            style={{ color: accentColor, fontFamily: 'var(--fd)' }}
          >
            {ecosystem}
          </span>
        </div>
        {/* Chain Name */}
        <h3
          className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-2"
          style={{ fontFamily: 'var(--fd)' }}
        >
          {name}
        </h3>
        {/* Description */}
        <p className="text-[11px] text-white/40 leading-relaxed mb-4">
          {description}
        </p>
        {/* Connect Indicator */}
        <div
          className="flex items-center gap-2 py-2 px-4 rounded-full border w-fit transition-all group-hover:border-opacity-60"
          style={getHoverStyles(accentColor)}
        >
          <div className="w-1.5 h-1.5 rounded-full group-hover:animate-pulse" style={{ background: accentColor }} />
          <span
            className="text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ color: accentColor, fontFamily: 'var(--fd)' }}
          >
            CONNECT →
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ... (rest of the code remains the same) */