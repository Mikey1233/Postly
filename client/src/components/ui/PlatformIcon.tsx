import type { Platform } from '../../lib/platformLimits'
import { PLATFORM_LABELS } from '../../lib/platformLimits'
import linkedinIcon from '../../assets/linkedin.svg'
import facebookIcon from '../../assets/round-facebook.svg'
import redditIcon   from '../../assets/sharp-reddit.svg'
import xIcon        from '../../assets/x-solid.svg'

const ICONS: Record<Platform, string> = {
  linkedin: linkedinIcon,
  facebook: facebookIcon,
  reddit:   redditIcon,
  x:        xIcon,
}

interface Props {
  platform: Platform
  size?: number
  className?: string
}

export default function PlatformIcon({ platform, size = 20, className = '' }: Props) {
  return (
    <img
      src={ICONS[platform]}
      alt={PLATFORM_LABELS[platform]}
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  )
}
