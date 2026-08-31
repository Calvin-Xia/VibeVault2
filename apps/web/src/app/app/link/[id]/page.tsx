'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Pencil,
  Star,
  StarOff,
  Tag,
  Trash2,
} from 'lucide-react'
import { getLink, updateLink, deleteLink, addTagToLink, removeTagFromLink, retryLinkMetadata } from '@/actions/linkActions'
import { listTags } from '@/actions/tagActions'
import { Link, Tag as TagType, LinkStatus } from '@/types/link'
import { Reveal } from '@/components/Reveal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import TagManager from '@/components/ui/TagManager'
import { Skeleton } from '@/components/ui/Skeleton'
import { DEFAULT_TAG_COLOR, tagTextColor } from '@/lib/tagColor'

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
  const [availableTags, setAvailableTags] = useState<TagType[]>([])
  const [showTagManager, setShowTagManager] = useState(false)
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [isRetryingMetadata, setIsRetryingMetadata] = useState(false)

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
          setError(result.error || '加载链接详情失败')
        }
      } catch {
        setError('加载链接详情失败')
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
        toast.success('已保存')
      } else {
        toast.error('保存失败')
      }
    } catch {
      toast.error('保存失败，请重试')
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
        toast.success(link.favorite ? '已取消收藏' : '已收藏')
      } else {
        toast.error('操作失败')
      }
    } catch {
      toast.error('操作失败，请重试')
    }
  }

  const handleStatusChange = async (status: LinkStatus) => {
    if (!link) return
    try {
      const result = await updateLink(link.id, { status })
      if (result.success && result.link) {
        setLink(result.link as unknown as Link)
        toast.success(status === 'ARCHIVED' ? '已归档' : '已取消归档')
      } else {
        toast.error('操作失败')
      }
    } catch {
      toast.error('操作失败，请重试')
    }
  }

  const handleDelete = async () => {
    if (!link) return
    setIsDeleting(true)
    try {
      const result = await deleteLink(link.id)
      if (result.success) {
        toast.success('已删除')
        router.push('/app')
      } else {
        toast.error('删除失败')
      }
    } catch {
      toast.error('删除失败，请重试')
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
      toast.error('加载标签失败')
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
        toast.success(isTagAssigned ? '已移除标签' : '已添加标签')
      } else {
        toast.error('标签操作失败')
      }
    } catch {
      toast.error('标签操作失败，请重试')
    }
  }

  const handleRetryMetadata = async () => {
    if (!link || isRetryingMetadata) return
    setIsRetryingMetadata(true)
    try {
      const result = await retryLinkMetadata(link.id)
      if (result.success && result.link) {
        setLink(result.link as unknown as Link)
        toast.success('元数据已更新')
      } else {
        toast.error(result.error || '抓取失败')
      }
    } catch {
      toast.error('抓取失败，请重试')
    } finally {
      setIsRetryingMetadata(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="glass-static rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="flex gap-3 mt-6">
              <Skeleton className="h-10 w-20 rounded-lg" />
              <Skeleton className="h-10 w-20 rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !link) {
    return (
      <div className="p-6">
        <div className="glass-static rounded-2xl p-6">
          <div className="text-center py-12">
            <ExternalLink className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-medium mb-2">链接未找到</h2>
            <p className="text-muted-foreground mb-4">{error || '该链接不存在或已被删除'}</p>
            <button
              onClick={() => router.push('/app')}
              className="btn btn-primary"
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
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="确认删除"
        description="您确定要删除这个链接吗？此操作无法撤销。"
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        variant="danger"
      />

      {/* Back button */}
      <button
        onClick={() => {
          if (window.history.length > 1) {
            router.back()
          } else {
            router.push('/app')
          }
        }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>返回列表</span>
      </button>

      <div className="glass-static rounded-2xl overflow-hidden">
        {/* Hero image */}
        {link.ogImage && (
          <div className="relative h-64 bg-muted">
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
                <span className="text-sm text-muted-foreground">{link.domain}</span>
                <span className={`badge ${
                  link.status === 'INBOX' ? 'badge--success' :
                  link.status === 'READING' ? 'badge--warning' :
                  'badge--pending'
                }`}>
                  {link.status === 'INBOX' ? '未处理' : link.status === 'READING' ? '正在处理' : '已完成'}
                </span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  className="w-full text-2xl font-semibold bg-transparent border-b border-border pb-1 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="标题"
                />
              ) : (
                <Reveal as="h1" className="text-2xl font-semibold">{link.title || link.url}</Reveal>
              )}
            </div>
            <button
              onClick={handleFavorite}
              aria-label={link.favorite ? '取消收藏' : '收藏'}
              className={`p-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${link.favorite ? 'text-warning hover:bg-warning/10' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {link.favorite ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
            </button>
          </div>

          {/* URL */}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all text-sm mb-4 inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {link.url}
          </a>

          {/* Description & Note */}
          <div className="mt-4 space-y-3">
            {isEditing ? (
              <>
                <textarea
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={3}
                  placeholder="描述"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-label="描述"
                />
                <textarea
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={4}
                  placeholder="备注"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  aria-label="备注"
                />
              </>
            ) : (
              <>
                {link.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">描述</h3>
                    <p className="text-foreground">{link.description}</p>
                  </div>
                )}
                {link.note && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">备注</h3>
                    <p className="text-foreground italic">{link.note}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tags */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">标签</h3>
            <div className="flex flex-wrap gap-2">
              {link.linkTags.length > 0 ? (
                link.linkTags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${tag.color || DEFAULT_TAG_COLOR}20`, color: tagTextColor(tag.color) }}
                  >
                    {tag.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">暂无标签</span>
              )}
              <button
                onClick={handleLoadTags}
                className="px-3 py-1 rounded-full text-sm font-medium text-muted-foreground border border-dashed border-border hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <Tag className="w-3.5 h-3.5" />
                管理标签
              </button>
            </div>

            {showTagManager && (
              <TagManager
                availableTags={availableTags}
                assignedTagIds={link.linkTags.map(({ tag }) => tag.id)}
                isLoading={isLoadingTags}
                onToggle={handleTagToggle}
                onClose={() => setShowTagManager(false)}
              />
            )}
          </div>

          {/* Metadata */}
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">信息</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">创建时间</span>
                <p className="text-foreground">{new Date(link.createdAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">更新时间</span>
                <p className="text-foreground">{new Date(link.updatedAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              {link.lastVisitedAt && (
                <div>
                  <span className="text-muted-foreground">最后访问</span>
                  <p className="text-foreground">{new Date(link.lastVisitedAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">元数据状态</span>
                <p className="text-foreground">
                  {link.metadataStatus === 'READY' ? '已就绪' : link.metadataStatus === 'PENDING' ? '等待中' : '失败'}
                  {link.metadataStatus === 'FAILED' && (
                    <button
                      onClick={handleRetryMetadata}
                      disabled={isRetryingMetadata}
                      className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium border border-border hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {isRetryingMetadata ? '抓取中...' : '重试抓取'}
                    </button>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="btn btn-primary"
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
                  className="btn btn-secondary"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-secondary"
                >
                  <Pencil className="w-4 h-4" />
                  编辑
                </button>
                <button
                  onClick={() => handleStatusChange(link.status === 'ARCHIVED' ? 'INBOX' : 'ARCHIVED')}
                  className="btn btn-secondary"
                >
                  {link.status === 'ARCHIVED' ? (
                    <>
                      <ArchiveRestore className="w-4 h-4" />
                      取消归档
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      归档
                    </>
                  )}
                </button>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <ExternalLink className="w-4 h-4" />
                  打开链接
                </a>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-destructive ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
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
