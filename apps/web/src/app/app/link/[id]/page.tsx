'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getLink, updateLink, deleteLink, addTagToLink, removeTagFromLink } from '@/actions/linkActions'
import { listTags } from '@/actions/tagActions'

interface Tag {
  id: string
  name: string
  color: string | null
}

interface LinkTag {
  tag: Tag
}

interface LinkVisit {
  id: string
  visitedAt: Date
}

interface Link {
  id: string
  title: string
  url: string
  domain: string
  description: string | null
  note: string | null
  ogImage: string | null
  favicon: string | null
  siteName: string | null
  createdAt: Date
  updatedAt: Date
  lastVisitedAt: Date | null
  status: 'INBOX' | 'READING' | 'ARCHIVED'
  favorite: boolean
  metadataStatus: 'PENDING' | 'READY' | 'FAILED'
  metadataError: string | null
  linkTags: LinkTag[]
  visits?: LinkVisit[]
}

function LinkDetail() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [link, setLink] = useState<Link | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [showTagManager, setShowTagManager] = useState(false)
  const [isLoadingTags, setIsLoadingTags] = useState(false)

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const result = await getLink(id)
        if (result.success && result.link) {
          setLink(result.link as unknown as Link)
          setTitle(result.link.title || '')
          setDescription(result.link.description || '')
          setNote(result.link.note || '')
        } else {
          setError(result.error || 'Failed to load link')
        }
      } catch {
        setError('Failed to load link')
      } finally {
        setIsLoading(false)
      }
    }
    fetchLink()
  }, [id])

  const handleSave = async () => {
    if (!link) return
    setIsSubmitting(true)
    try {
      const result = await updateLink(link.id, { title, description, note })
      if (result.success && result.link) {
        setLink(result.link as unknown as Link)
        setIsEditing(false)
      }
    } catch {
      console.error('Error updating link')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFavorite = async () => {
    if (!link) return
    try {
      const result = await updateLink(link.id, { favorite: !link.favorite })
      if (result.success && result.link) {
        setLink(result.link as unknown as Link)
      }
    } catch {
      console.error('Error toggling favorite')
    }
  }

  const handleStatusChange = async (status: 'INBOX' | 'READING' | 'ARCHIVED') => {
    if (!link) return
    try {
      const result = await updateLink(link.id, { status })
      if (result.success && result.link) {
        setLink(result.link as unknown as Link)
      }
    } catch {
      console.error('Error updating status')
    }
  }

  const handleDelete = async () => {
    if (!link) return
    setIsDeleting(true)
    try {
      const result = await deleteLink(link.id)
      if (result.success) {
        router.push('/app')
      }
    } catch {
      console.error('Error deleting link')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleLoadTags = async () => {
    setIsLoadingTags(true)
    try {
      const fetchedTags = await listTags()
      setAvailableTags(fetchedTags)
      setShowTagManager(true)
    } catch {
      console.error('Error fetching tags')
    } finally {
      setIsLoadingTags(false)
    }
  }

  const handleTagToggle = async (tagId: string) => {
    if (!link) return
    try {
      const isTagAssigned = link.linkTags.some(({ tag }) => tag.id === tagId)
      if (isTagAssigned) {
        await removeTagFromLink(link.id, tagId)
      } else {
        await addTagToLink(link.id, tagId)
      }
      const result = await getLink(id)
      if (result.success && result.link) {
        setLink(result.link as unknown as Link)
      }
    } catch {
      console.error('Error toggling tag')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="glass rounded-2xl p-6">
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">加载中...</div>
        </div>
      </div>
    )
  }

  if (error || !link) {
    return (
      <div className="p-6">
        <div className="glass rounded-2xl p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔗</div>
            <h2 className="text-xl font-medium mb-2">链接未找到</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{error || '该链接不存在或已被删除'}</p>
            <button
              onClick={() => router.push('/app')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full mb-3">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">确认删除</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">您确定要删除这个链接吗？此操作无法撤销。</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => router.push('/app')}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
      >
        <span>←</span>
        <span>返回列表</span>
      </button>

      <div className="glass rounded-2xl overflow-hidden">
        {/* Hero image */}
        {link.ogImage && (
          <div className="relative h-64 bg-gray-100 dark:bg-gray-800">
            <Image
              src={link.ogImage}
              alt={link.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {link.favicon && (
                  <Image
                    src={link.favicon}
                    alt={link.siteName || link.domain}
                    width={24}
                    height={24}
                    className="rounded"
                  />
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400">{link.domain}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  link.status === 'INBOX' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  link.status === 'READING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {link.status === 'INBOX' ? '未处理' : link.status === 'READING' ? '正在处理' : '已完成'}
                </span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  className="w-full text-2xl font-semibold bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-none pb-1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              ) : (
                <h1 className="text-2xl font-semibold">{link.title || link.url}</h1>
              )}
            </div>
            <button
              onClick={handleFavorite}
              className={`p-2 rounded-full transition-colors ${link.favorite ? 'text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              {link.favorite ? '⭐' : '☆'}
            </button>
          </div>

          {/* URL */}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all text-sm mb-4 inline-block"
          >
            {link.url}
          </a>

          {/* Description & Note */}
          <div className="mt-4 space-y-3">
            {isEditing ? (
              <>
                <textarea
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none"
                  rows={3}
                  placeholder="描述"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <textarea
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none"
                  rows={4}
                  placeholder="备注"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </>
            ) : (
              <>
                {link.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">描述</h3>
                    <p className="text-gray-700 dark:text-gray-300">{link.description}</p>
                  </div>
                )}
                {link.note && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">备注</h3>
                    <p className="text-gray-700 dark:text-gray-300 italic">{link.note}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tags */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">标签</h3>
            <div className="flex flex-wrap gap-2">
              {link.linkTags.length > 0 ? (
                link.linkTags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${tag.color || '#8b5cf6'}20`, color: tag.color || '#8b5cf6' }}
                  >
                    {tag.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">暂无标签</span>
              )}
              <button
                onClick={handleLoadTags}
                className="px-3 py-1 rounded-full text-sm font-medium text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
              >
                + 管理标签
              </button>
            </div>

            {/* Tag Manager */}
            {showTagManager && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium mb-2">选择标签</h4>
                {isLoadingTags ? (
                  <div className="text-center py-2 text-gray-500">加载中...</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => {
                      const isAssigned = link.linkTags.some(({ tag: t }) => t.id === tag.id)
                      return (
                        <button
                          key={tag.id}
                          className="px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity"
                          style={{
                            backgroundColor: isAssigned ? (tag.color || '#8b5cf6') : `${tag.color || '#8b5cf6'}20`,
                            color: isAssigned ? 'white' : (tag.color || '#8b5cf6'),
                          }}
                          onClick={() => handleTagToggle(tag.id)}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                )}
                <button
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowTagManager(false)}
                >
                  关闭
                </button>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">信息</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">创建时间</span>
                <p className="text-gray-700 dark:text-gray-300">{new Date(link.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">更新时间</span>
                <p className="text-gray-700 dark:text-gray-300">{new Date(link.updatedAt).toLocaleString()}</p>
              </div>
              {link.lastVisitedAt && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">最后访问</span>
                  <p className="text-gray-700 dark:text-gray-300">{new Date(link.lastVisitedAt).toLocaleString()}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500 dark:text-gray-400">元数据状态</span>
                <p className="text-gray-700 dark:text-gray-300">
                  {link.metadataStatus === 'READY' ? '已就绪' : link.metadataStatus === 'PENDING' ? '等待中' : '失败'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setTitle(link.title || '')
                    setDescription(link.description || '')
                    setNote(link.note || '')
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  ✏️ 编辑
                </button>
                <button
                  onClick={() => handleStatusChange(link.status === 'ARCHIVED' ? 'INBOX' : 'ARCHIVED')}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {link.status === 'ARCHIVED' ? '📥 取消归档' : '📦 归档'}
                </button>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔗 打开链接
                </a>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors ml-auto"
                >
                  🗑️ 删除
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LinkDetail
