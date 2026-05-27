import { Skeleton } from '@/components/ui/Skeleton'

export default function LinkDetailLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Skeleton className="h-5 w-20 mb-4" />
      <div className="rounded-2xl overflow-hidden bg-muted/50">
        <Skeleton className="h-64 w-full rounded-none" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-3/4" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full mb-4" />
          <div className="space-y-3 mt-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="mt-4">
            <Skeleton className="h-4 w-10 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-14 rounded-full" />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <Skeleton className="h-4 w-10 mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border flex gap-3">
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
