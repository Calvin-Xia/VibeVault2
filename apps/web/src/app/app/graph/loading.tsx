import { Skeleton } from '@/components/ui/Skeleton'

export default function GraphLoading() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-32 mb-4" />
      <div className="rounded-2xl p-6 bg-muted/50">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    </div>
  )
}
