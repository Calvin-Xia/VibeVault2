import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          <Skeleton className="h-40 w-full break-inside-avoid" />
          <Skeleton className="h-60 w-full break-inside-avoid" />
          <Skeleton className="h-48 w-full break-inside-avoid" />
          <Skeleton className="h-56 w-full break-inside-avoid" />
          <Skeleton className="h-44 w-full break-inside-avoid" />
          <Skeleton className="h-52 w-full break-inside-avoid" />
        </div>
      </main>
    </div>
  )
}
