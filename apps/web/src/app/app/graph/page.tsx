import { redirect } from 'next/navigation'

// 图谱视图已合并进工作台(/app?view=graph);
// 旧 /app/graph 路由重定向,保留 search/tag/status/sort 过滤参数
export default async function GraphRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>
}) {
  const params = await searchParams
  const preserved = new URLSearchParams()
  for (const key of ['search', 'tag', 'status', 'sort']) {
    const value = params[key]
    if (typeof value === 'string' && value) {
      preserved.set(key, value)
    }
  }
  preserved.set('view', 'graph')
  redirect(`/app?${preserved.toString()}`)
}
