'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/Skeleton'

// reactflow 依赖浏览器 API,仅客户端加载,加载期间以 Skeleton 回退
const GraphCanvas = dynamic(() => import('./graph/GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <Skeleton className="h-8 w-32 mb-4 rounded-lg" />
      <div className="glass-static rounded-2xl p-6">
        <Skeleton className="h-[min(600px,70dvh)] w-full rounded-xl" />
      </div>
    </div>
  ),
})

export default function GraphView() {
  return <GraphCanvas />
}
