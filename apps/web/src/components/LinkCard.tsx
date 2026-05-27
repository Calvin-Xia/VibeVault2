'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Star, ExternalLink, Pencil, Archive, Tag as TagIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateLink, deleteLink, addTagToLink, removeTagFromLink } from '@/actions/linkActions'
import { listTags } from '@/actions/tagActions'
import { Link, Tag } from '@/types/link'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import TagManager from '@/components/ui/TagManager'

interface LinkCardProps {
  link: Link
}

const LinkCard: React.FC<LinkCardProps> = ({ link }) => {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState(link.title ?? '')
  const [description, setDescription] = useState(link.description ?? '')
  const [note, setNote] = useState(link.note ?? '')
  const [showTagManager, setShowTagManager] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleFavorite = async () => {
    try {
      await updateLink(link.id, { favorite: !link.favorite })
      toast.success(link.favorite ? '已取消收藏' : '已收藏')
      router.refresh()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleArchive = async () => {
    try {
      await updateLink(link.id, { status: 'ARCHIVED' })
      toast.success('已归档')
      router.refresh()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      await updateLink(link.id, { title, description, note })
      setIsEditing(false)
      toast.success('已保存')
    } catch {
      toast.error('操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoadTags = async () => {
    setShowTagManager(true)
    setIsLoadingTags(true)
    try {
      setAvailableTags(await listTags())
    } catch {
      toast.error('加载标签失败')
    } finally {
      setIsLoadingTags(false)
    }
  }

  const handleTagToggle = async (tagId: string) => {
    try {
      const isAssigned = link.linkTags.some(({ tag }) => tag.id === tagId)
      if (isAssigned) await removeTagFromLink(link.id, tagId)
      else await addTagToLink(link.id, tagId)
      toast.success('标签已更新')
      router.refresh()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleDeleteLink = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteLink(link.id)
      if (result.success) toast.success('已删除')
    } catch {
      toast.error('操作失败')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setTitle(link.title ?? '')
    setDescription(link.description ?? '')
    setNote(link.note ?? '')
  }

  const actionBtnClass = 'p-1.5 rounded-full text-muted-foreground hover:bg-accent transition-colors'

  return (
    <>
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="确认删除"
        description="您确定要删除这个链接吗？此操作无法撤销。"
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={handleDeleteLink}
        isConfirming={isDeleting}
        variant="danger"
      />

      <motion.div
        className="glass rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        {link.ogImage && (
          <div className="relative h-48 bg-muted">
            <Image src={link.ogImage} alt={link.title} fill className="object-cover" />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {link.favicon ? (
                  <Image src={link.favicon} alt={link.siteName || link.domain} width={16} height={16} className="rounded" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    {link.domain.charAt(0).toUpperCase()}
                  </div>
                )}
                {isEditing ? (
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 text-lg font-semibold bg-transparent border-b border-border focus:outline-none"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                ) : (
                  <h3 className="text-lg font-semibold line-clamp-2">{link.title || link.url}</h3>
                )}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="truncate">{link.domain}</span>
                <span>•</span>
                <span className="text-xs">{new Date(link.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={handleFavorite}
              className={`p-1.5 rounded-full transition-colors ${
                link.favorite
                  ? 'text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
              aria-label={link.favorite ? '取消星标' : '添加星标'}
            >
              <Star className={`w-4 h-4 ${link.favorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-2 mb-3">
              <textarea
                className="w-full px-2 py-1 text-sm bg-transparent border border-border rounded-lg focus:outline-none"
                rows={2} placeholder="描述" value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <textarea
                className="w-full px-2 py-1 text-sm bg-transparent border border-border rounded-lg focus:outline-none"
                rows={3} placeholder="备注" value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          ) : (
            <>
              {link.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{link.description}</p>
              )}
              {link.note && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2 italic">{link.note}</p>
              )}
            </>
          )}

          {link.linkTags.length > 0 && !isEditing && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {link.linkTags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${tag.color || '#8b5cf6'}20`, color: tag.color || '#8b5cf6' }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave} disabled={isSubmitting}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>打开</span>
                </button>
                <div className="flex gap-1">
                  <button className={actionBtnClass} onClick={() => setIsEditing(true)} aria-label="编辑">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className={actionBtnClass} onClick={handleArchive} aria-label="归档">
                    <Archive className="w-4 h-4" />
                  </button>
                  <button className={actionBtnClass} onClick={handleLoadTags} aria-label="添加标签">
                    <TagIcon className="w-4 h-4" />
                  </button>
                  <button
                    className={`${actionBtnClass} hover:text-destructive`}
                    onClick={() => setShowDeleteConfirm(true)} aria-label="删除链接"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
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
      </motion.div>
    </>
  )
}

export default LinkCard
