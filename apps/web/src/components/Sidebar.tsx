'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Inbox, BookOpen, CheckCircle, Folder, Plus } from 'lucide-react'
import { listTags, createTag } from '@/actions/tagActions'

interface SidebarProps {
  statusCounts?: { inbox: number; reading: number; archived: number }
  onClose?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ statusCounts, onClose }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string | null; count: number }>>([])
  const [showAddTagForm, setShowAddTagForm] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#8b5cf6')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const statusFilters = [
    { id: 'inbox', name: '未处理', count: statusCounts?.inbox ?? 0, icon: Inbox },
    { id: 'reading', name: '正在处理', count: statusCounts?.reading ?? 0, icon: BookOpen },
    { id: 'archived', name: '已完成', count: statusCounts?.archived ?? 0, icon: CheckCircle },
  ]

  // Fetch tags on component mount
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
  }, [])

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

  const isStatusActive = (statusId: string) =>
    pathname === '/app' && searchParams.get('status') === statusId

  return (
    <aside className="w-64 h-full border-r border-border bg-card/60 backdrop-blur-[8px] overflow-y-auto">
      <div className="p-4">
        {/* Status filters */}
        <div className="mb-6">
          <h2 className="eyebrow mb-3 px-2">任务状态</h2>
          <div className="space-y-1">
            {statusFilters.map((status) => (
              <Link
                key={status.id}
                href={`/app?status=${status.id}`}
                onClick={() => onClose?.()}
                data-active={isStatusActive(status.id)}
                className={`nav-item ${isStatusActive(status.id) ? '' : ''}`}
              >
                <status.icon className="h-4 w-4" />
                <span>{status.name}</span>
                {status.count > 0 && (
                  <span className="ml-auto text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{status.count}</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Collections */}
        <div className="mb-6">
          <h2 className="eyebrow mb-3 px-2">集合</h2>
          <div className="space-y-1">
            {/* Collection items will be populated from API */}
            <Link
              href="/app"
              onClick={() => onClose?.()}
              data-active={pathname === '/app' && !searchParams.get('collection') && !searchParams.get('status')}
              className="nav-item"
            >
              <Folder className="h-4 w-4" />
              <span>所有链接</span>
            </Link>
          </div>
        </div>

        {/* Tags */}
        <div>
          <h2 className="eyebrow mb-3 px-2">标签</h2>
          <div className="flex flex-wrap gap-2 px-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/app?tag=${tag.id}`}
                onClick={() => onClose?.()}
                data-active={pathname === '/app' && searchParams.get('tag') === tag.id}
                className="chip"
                style={{ backgroundColor: `${tag.color || '#8b5cf6'}20`, color: tag.color || '#8b5cf6' }}
              >
                {tag.name} <span className="opacity-70">({tag.count})</span>
              </Link>
            ))}
          </div>
          
          {/* Add tag form */}
          {showAddTagForm ? (
            <form onSubmit={handleCreateTag} className="mt-3 flex flex-col gap-2 px-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="标签名称"
                  className="input flex-1 h-9 rounded-full text-xs"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                />
                <input
                  type="color"
                  className="w-9 h-9 rounded-full border border-input bg-transparent cursor-pointer"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !tagName.trim()}
                  className="btn btn-primary flex-1 h-9 text-xs rounded-full"
                >
                  <span>{isSubmitting ? '添加中...' : '添加'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary h-9 text-xs rounded-full"
                  onClick={() => setShowAddTagForm(false)}
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            /* Add tag button */
            <button 
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setShowAddTagForm(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>添加标签</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
