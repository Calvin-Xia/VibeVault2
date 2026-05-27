import AppShell from '@/components/AppShell'
import { PageTransition } from '@/components/PageTransition'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  )
}
