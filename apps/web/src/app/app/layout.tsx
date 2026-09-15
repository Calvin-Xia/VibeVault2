import AppShell from '@/components/AppShell'
import { PageTransition } from '@/components/PageTransition'
import { getStatusCounts } from '@/actions/linkActions'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 在布局层取数:布局是 Server Component,router.refresh() 会一并重渲染,
  // 因此增删改链接后侧边栏计数能跟着更新
  const statusCounts = await getStatusCounts()

  return (
    <AppShell statusCounts={statusCounts}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  )
}
