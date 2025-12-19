'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createLink } from '@/actions/linkActions'
import { listTags } from '@/actions/tagActions'

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
  const [error, setError] = useState<string | null>(null)

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
    { value: 'masonry', label: '瀑布流', icon: '🖼️' },
    { value: 'graph', label: '知识图谱', icon: '🔗' },
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
      setError('URL不能为空')
      return
    }

    setIsSubmitting(true)
    setError(null)

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
      } else {
        setError(result.error || '添加链接失败')
      }
    } catch (err) {
      setError('添加链接失败，请重试')
      console.error('Error adding link:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border-b bg-white/80 backdrop-blur-md dark:bg-gray-900/80 px-6 py-3 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        {/* Search form */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索链接..."
              className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="搜索链接"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </div>
          </div>
        </form>

        {/* Sort select */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-medium text-gray-500 dark:text-gray-400 hidden md:inline-block">排序：</label>
          <select
            id="sort"
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
            value={searchParams.get('sort') || 'createdAt'}
            onChange={handleSortChange}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname === (option.value === 'graph' ? '/app/graph' : '/app') ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              onClick={() => handleViewChange(option.value)}
            >
              <span>{option.icon}</span>
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Add link button */}
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <span>➕</span>
          <span className="hidden sm:inline">添加链接</span>
        </button>
      </div>

      {/* Add link form */}
      {showAddForm && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <form onSubmit={handleAddLink} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex-1">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                <input
                  type="url"
                  id="url"
                  placeholder="输入URL..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  aria-label="输入链接URL"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题（可选）</label>
                <input
                  type="text"
                  id="title"
                  placeholder="输入标题..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="输入标题"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">备注（可选）</label>
              <textarea
                id="note"
                placeholder="输入备注..."
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label="输入备注"
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">标签（可选）</label>
              {isLoadingTags ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">加载标签中...</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedTags.includes(tag.id) ? `bg-${tag.color || 'blue'}-500 text-white` : `bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600`}`}
                      style={{ backgroundColor: selectedTags.includes(tag.id) ? (tag.color || '#8b5cf6') : undefined, color: selectedTags.includes(tag.id) ? 'white' : undefined }}
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
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                onClick={() => {
                  setShowAddForm(false)
                  setUrl('')
                  setTitle('')
                  setNote('')
                  setSelectedTags([])
                  setError(null)
                }}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '添加中...' : '添加'}
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-2 text-sm text-red-500 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FilterBar
