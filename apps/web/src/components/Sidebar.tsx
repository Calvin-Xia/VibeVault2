'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { listTags, createTag } from '@/actions/tagActions'

interface SidebarProps {
  statusCounts?: { inbox: number; reading: number; archived: number }
}

const Sidebar: React.FC<SidebarProps> = ({ statusCounts }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string | null; count: number }>>([])
  const [showAddTagForm, setShowAddTagForm] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#8b5cf6')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const statusFilters = [
    { id: 'inbox', name: '未处理', count: statusCounts?.inbox ?? 0, icon: '📥' },
    { id: 'reading', name: '正在处理', count: statusCounts?.reading ?? 0, icon: '📝' },
    { id: 'archived', name: '已完成', count: statusCounts?.archived ?? 0, icon: '✅' },
  ]

  // Fetch tags on component mount and when pathname changes
  useEffect(() => {
    const fetchTags = async () => {
      const fetchedTags = await listTags()
      // Use the count from _count.linkTags
      setTags(fetchedTags.map(tag => ({
        ...tag,
        count: tag._count?.linkTags || 0
      })))
    }
    fetchTags()
  }, [pathname])

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tagName.trim()) return
    
    setIsSubmitting(true)
    try {
      const result = await createTag({ name: tagName, color: tagColor })
      if (result.success && result.tag) {
        setTags(prev => [...prev, { ...result.tag, count: 0 }])
        setTagName('')
        setTagColor('#8b5cf6')
        setShowAddTagForm(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <aside className="w-64 border-r bg-white/80 backdrop-blur-md dark:bg-gray-900/80 overflow-y-auto">
      <div className="p-4">
        {/* Status filters */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">任务状态</h2>
          <div className="space-y-1">
            {statusFilters.map((status) => (
              <Link
                key={status.id}
                href={`/app?status=${status.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${pathname === '/app' && searchParams.get('status') === status.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
              >
                <span>{status.icon}</span>
                <span>{status.name}</span>
                {status.count > 0 && (
                  <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{status.count}</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Collections */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">集合</h2>
          <div className="space-y-1">
            {/* Collection items will be populated from API */}
            <Link
              href="/app"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${pathname === '/app' && !searchParams.get('collection') ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
            >
              <span>📁</span>
              <span>所有链接</span>
            </Link>
          </div>
        </div>

        {/* Tags */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">标签</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/app?tag=${tag.id}`}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${pathname === '/app' && searchParams.get('tag') === tag.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : `bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`}`}
                style={{ backgroundColor: `${tag.color || '#8b5cf6'}20`, color: tag.color || '#8b5cf6' }}
              >
                {tag.name} <span className="opacity-70">({tag.count})</span>
              </Link>
            ))}
          </div>
          
          {/* Add tag form */}
          {showAddTagForm ? (
            <form onSubmit={handleCreateTag} className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="标签名称"
                  className="flex-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                />
                <input
                  type="color"
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 cursor-pointer"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !tagName.trim()}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isSubmitting ? '添加中...' : '添加'}</span>
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                  onClick={() => setShowAddTagForm(false)}
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            /* Add tag button */
            <button 
              className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setShowAddTagForm(true)}
            >
              <span>➕</span>
              <span>添加标签</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
