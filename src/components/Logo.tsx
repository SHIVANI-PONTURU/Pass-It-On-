// The Pass It On emblem: the Moon and Mars side by side in a night-sky badge (public/logo.svg).
export default function Logo({ size = 64, className = '', decorative = false }: { size?: number; className?: string; decorative?: boolean }) {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt={decorative ? '' : 'Pass It On logo: the Moon and Mars'}
      className={`shrink-0 drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)] ${className}`}
      draggable={false}
    />
  )
}
