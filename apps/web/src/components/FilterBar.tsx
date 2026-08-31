'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createLink } from '@/actions/linkActions'
import { listTags } from '@/actions/tagActions'
import { toast } from 'sonner'
import { Search, Plus, LayoutGrid, GitBranch, ChevronDown } from 'lucide-react'
import { DEFAULT_TAG_COLOR, tagTextColor } from '@/lib/tagColor'

const FilterBar: React.FC = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [showAddForm, setShowAddForm] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string | null }>>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingTags, setIsLoadingTags] = useState(false)

  // Fetch tags for selection
  useEffect(() => {
    const fetchTags = async () => {
      setIsLoadingTags(true)
      try {
        const fetchedTags = await listTags()
        setTags(fetchedTags)
      } catch (err) {
        console.error('Error fetching tags:', err)
      } finally {
        setIsLoadingTags(false)
      }
    }
    fetchTags()
  }, [])

  const sortOptions = [
    { value: 'createdAt', label: '最新收藏' },
    { value: 'lastVisitedAt', label: '最近访问' },
    { value: 'domain', label: '域名' },
    { value: 'title', label: '标题' },
  ]

  const viewOptions = [
    { value: 'masonry', label: '瀑布流', icon: LayoutGrid },
    { value: 'graph', label: '知识图谱', icon: GitBranch },
  ]

  const isGraphView = searchParams.get('view') === 'graph'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams)
    params.set('sort', e.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleViewChange = (view: string) => {
    // 单页切换视图:保留现有 search/tag/status/sort 参数,仅增删 view
    const params = new URLSearchParams(searchParams)
    if (view === 'graph') {
      params.set('view', 'graph')
    } else {
      params.delete('view')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      toast.error('URL不能为空')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set('url', url)
      formData.set('title', title)
      formData.set('note', note)
      formData.set('tagIds', selectedTags.join(','))
      
      const result = await createLink(formData)
      
      if (result.success) {
        setUrl('')
        setTitle('')
        setNote('')
        setSelectedTags([])
        setShowAddForm(false)
        toast.success('链接已添加')
      } else {
        toast.error(result.error || '添加失败')
      }
    } catch (err) {
      toast.error('添加链接失败，请重试')
      console.error('Error adding link:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative border-b border-border bg-card/95 px-6 py-3 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        {/* Search form */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索链接..."
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="搜索链接"
            />
          </div>
        </form>

        {/* Sort select */}
        <div className="flex items-center gap-2">
          {/* 移动端无可见文案,由 sr-only label 关联(仅此一个 label 关联控件) */}
          <label htmlFor="sort" className="sr-only">排序</label>
          <label aria-hidden="true" className="text-sm font-medium text-muted-foreground hidden md:inline-block">排序：</label>
          <div className="relative">
            <select
              id="sort"
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              value={searchParams.get('sort') || 'createdAt'}
              onChange={handleSortChange}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          {viewOptions.map((option) => {
            const Icon = option.icon
            const isActive = option.value === 'graph' ? isGraphView : !isGraphView
            return (
              <button
                key={option.value}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => handleViewChange(option.value)}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            )
          })}
        </div>

        {/* Add link button(桌面端;移动端由 FAB 承担) */}
        <button
          className="btn btn-primary !hidden md:!inline-flex"
          onClick={() => setShowAddForm(!showAddForm)}
          aria-expanded={showAddForm}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">添加链接</span>
        </button>
      </div>

      {/* 移动端悬浮添加入口(≥48px 触摸目标,见 DESIGN.md) */}
      <button
        className="fab-add md:!hidden"
        onClick={() => setShowAddForm(!showAddForm)}
        aria-label="添加链接"
        aria-expanded={showAddForm}
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Add link form */}
      {showAddForm && (
        <div className="bg-muted/60 border border-border rounded-lg p-4">
          <form onSubmit={handleAddLink} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex-1">
                <label htmlFor="url" className="block text-sm font-medium text-foreground mb-1">URL</label>
                <input
                  type="url"
                  id="url"
                  placeholder="输入URL..."
                  className="input"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  aria-label="输入链接URL"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">标题（可选）</label>
                <input
                  type="text"
                  id="title"
                  placeholder="输入标题..."
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="输入标题"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-foreground mb-1">备注（可选）</label>
              <textarea
                id="note"
                placeholder="输入备注..."
                rows={2}
                className="input h-auto py-2 resize-y"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label="输入备注"
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">标签（可选）</label>
              {isLoadingTags ? (
                <div className="text-sm text-muted-foreground">加载标签中...</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={selectedTags.includes(tag.id)}
                      className="chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={
                        selectedTags.includes(tag.id)
                          ? { backgroundColor: tag.color || DEFAULT_TAG_COLOR, color: tagTextColor(tag.color) }
                          : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                      }
                      onClick={() => {
                        if (selectedTags.includes(tag.id)) {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id))
                        } else {
                          setSelectedTags([...selectedTags, tag.id])
                        }
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddForm(false)
                  setUrl('')
                  setTitle('')
                  setNote('')
                  setSelectedTags([])
                }}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? '添加中...' : '添加'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default FilterBar
