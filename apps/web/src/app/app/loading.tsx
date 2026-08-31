import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
