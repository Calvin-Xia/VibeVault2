'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createLink } from '@/actions/linkActions'
import { listTags } from '@/actions/tagActions'
import { toast } from 'sonner'
import { Search, Plus, LayoutGrid, GitBranch, ChevronDown } from 'lucide-react'

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
    if (view === 'graph') {
      router.push('/app/graph')
    } else {
      router.push('/app')
    }
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
    <div className="border-b border-border bg-card/80 backdrop-blur-md px-6 py-3 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        {/* Search form */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索链接..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="搜索链接"
            />
          </div>
        </form>

        {/* Sort select */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-medium text-muted-foreground hidden md:inline-block">排序：</label>
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
            return (
              <button
                key={option.value}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === (option.value === 'graph' ? '/app/graph' : '/app')
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

        {/* Add link button */}
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">添加链接</span>
        </button>
      </div>

      {/* Add link form */}
      {showAddForm && (
        <div className="bg-muted rounded-lg p-4">
          <form onSubmit={handleAddLink} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex-1">
                <label htmlFor="url" className="block text-sm font-medium text-foreground mb-1">URL</label>
                <input
                  type="url"
                  id="url"
                  placeholder="输入URL..."
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selectedTags.includes(tag.id) ? (tag.color || '#8b5cf6') : undefined,
                        color: selectedTags.includes(tag.id) ? 'white' : undefined,
                        ...(selectedTags.includes(tag.id) ? {} : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }),
                      }}
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
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
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
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
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
