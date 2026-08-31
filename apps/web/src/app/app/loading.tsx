import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {/* 瀑布流骨架:按典型宽度近似 1/2/3/4 列 */}
        <div className="w-full max-w-[1600px] mx-auto columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
          <Skeleton className="mb-5 h-48 w-full rounded-xl break-inside-avoid" />
          <Skeleton className="mb-5 h-60 w-full rounded-xl break-inside-avoid" />
          <Skeleton className="mb-5 h-44 w-full rounded-xl break-inside-avoid" />
          <Skeleton className="mb-5 h-56 w-full rounded-xl break-inside-avoid" />
          <Skeleton className="mb-5 h-40 w-full rounded-xl break-inside-avoid" />
          <Skeleton className="mb-5 h-52 w-full rounded-xl break-inside-avoid" />
          <Skeleton className="mb-5 h-64 w-full rounded-xl break-inside-avoid" />
          <Skeleton className="mb-5 h-44 w-full rounded-xl break-inside-avoid" />
        </div>
      </div>
    </div>
  )
}
