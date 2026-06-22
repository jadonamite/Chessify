'use client'
import { avatarSvgUrl } from '@/lib/avatar'

interface ChessAvatarProps {
  address: string
  size?: number
  className?: string
}

const getAltText = (address: string) => `${address.slice(0, 6)} avatar`;
const getStyle = (size: number) => ({
  borderRadius: '22%',
  display: 'block',
  width: size,
  height: size,
});

export default function ChessAvatar({ address, size = 40, className = '' }: ChessAvatarProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarSvgUrl(address)}
      alt={getAltText(address)}
      className={className}
      style={getStyle(size)}
    />
  );
}