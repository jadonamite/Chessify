export const blobClasses = (color: string, opacity: number) => `absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-[${color}] blur-[120px] rounded-full opacity-[${opacity}]`;

export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className={blobClasses('var(--c)', 0.04)} />
      <div className={blobClasses('#783cdc', 0.03)} style={{
        top: 'auto',
        right: 'auto',
        bottom: '10%',
        left: '10%',
      }} />
    </div>
  )
}