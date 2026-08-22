import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import LinkGridVirtual from '@/components/LinkGridVirtual'
import FilterBar from '@/components/FilterBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { listLinks } from '@/actions/linkActions'
import { authOptions } from '@/lib/auth'

function DashboardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-48 w-full rounded-xl"
          style={{ height: `${120 + (i % 4) * 40}px` }}
        />
      ))}
    </div>
  )
}

async function LinksGrid({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const params = await searchParams
  const { links } = await listLinks({
    status: typeof params.status === 'string' ? params.status : undefined,
    tag: typeof params.tag === 'string' ? params.tag : undefined,
    search: typeof params.search === 'string' ? params.search : undefined,
    sortBy: typeof params.sort === 'string' ? params.sort : undefined
  })

  return (
    <LinkGridVirtual links={links.map(link => ({
      ...link,
      title: link.title || '',
      description: link.description || '',
      note: link.note || '',
      status: (link.status as 'INBOX' | 'READING' | 'ARCHIVED') || 'INBOX',
      metadataStatus: (link.metadataStatus as 'PENDING' | 'READY' | 'FAILED') || 'PENDING'
    }))} />
  )
}

async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<div className="h-16 border-b border-border bg-card/60" />}>
        <FilterBar />
      </Suspense>
      <main className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<DashboardGridSkeleton />}>
          <LinksGrid searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  )
}

export default Dashboard
