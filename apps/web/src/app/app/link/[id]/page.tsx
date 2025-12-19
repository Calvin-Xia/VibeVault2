'use client'

import { useParams } from 'next/navigation'

function LinkDetail() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">链接详情</h1>
      <div className="glass rounded-2xl p-6">
        <p className="text-gray-600 dark:text-gray-300">链接 ID: {id}</p>
        <p className="text-gray-600 dark:text-gray-300 mt-2">这是链接详情页面，当前使用 mock 数据。</p>
      </div>
    </div>
  )
}

export default LinkDetail
