interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-muted ${className || ''}`} style={style} />
}
