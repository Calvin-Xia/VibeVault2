import LinkGridMasonry from '@/components/LinkGridMasonry'
import FilterBar from '@/components/FilterBar'
import { listLinks } from '@/actions/linkActions'

async function Dashboard({ searchParams }: { searchParams: Record<string, string | string[]> }) {
  // Get links from server with filters
  const { links } = await listLinks({
    status: typeof searchParams.status === 'string' ? searchParams.status : undefined,
    tag: typeof searchParams.tag === 'string' ? searchParams.tag : undefined,
    search: typeof searchParams.search === 'string' ? searchParams.search : undefined,
    sortBy: typeof searchParams.sort === 'string' ? searchParams.sort : undefined
  })

  return (
    <div className="flex flex-col h-full">
      <FilterBar />
      <main className="flex-1 overflow-y-auto p-6">
        <LinkGridMasonry links={links.map(link => ({ 
          ...link, 
          title: link.title || '', 
          description: link.description || '', 
          note: link.note || '',
          status: (link.status as 'INBOX' | 'READING' | 'ARCHIVED') || 'INBOX',
          metadataStatus: (link.metadataStatus as 'PENDING' | 'READY' | 'FAILED') || 'PENDING'
        }))} />
      </main>
    </div>
  )
}

export default Dashboard
