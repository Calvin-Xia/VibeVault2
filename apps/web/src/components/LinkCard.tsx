'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { updateLink, deleteLink, addTagToLink, removeTagFromLink } from '@/actions/linkActions'
import { listTags } from '@/actions/tagActions'

interface Tag {
  id: string
  name: string
  color: string | null
}

interface LinkTag {
  tag: Tag
}

interface Link {
  id: string
  title: string
  url: string
  domain: string
  description: string
  note: string
  ogImage: string | null
  favicon: string | null
  siteName: string | null
  createdAt: Date
  updatedAt: Date
  lastVisitedAt: Date | null
  status: 'INBOX' | 'READING' | 'ARCHIVED'
  favorite: boolean
  collectionId: string | null
  metadataStatus: 'PENDING' | 'READY' | 'FAILED'
  metadataError: string | null
  linkTags: LinkTag[]
}

interface LinkCardProps {
  link: Link
}

const LinkCard: React.FC<LinkCardProps> = ({ link }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState(link.title)
  const [description, setDescription] = useState(link.description)
  const [note, setNote] = useState(link.note)
  const [showTagManager, setShowTagManager] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleFavorite = async () => {
    // Toggle favorite status
    try {
      await updateLink(link.id, { favorite: !link.favorite })
      // Update local state
      window.location.reload()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleArchive = async () => {
    // Archive link
    try {
      await updateLink(link.id, { status: 'ARCHIVED' })
      // Update local state
      window.location.reload()
    } catch (error) {
      console.error('Error archiving link:', error)
    }
  }

  const handleOpen = () => {
    // Open the original link
    window.open(link.url, '_blank', 'noopener,noreferrer')
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      await updateLink(link.id, { title, description, note })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating link:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoadTags = async () => {
    setIsLoadingTags(true)
    try {
      const fetchedTags = await listTags()
      setAvailableTags(fetchedTags)
      setShowTagManager(true)
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setIsLoadingTags(false)
    }
  }

  const handleTagToggle = async (tagId: string) => {
    try {
      const isTagAssigned = link.linkTags.some(({ tag: assignedTag }) => assignedTag.id === tagId)
      if (isTagAssigned) {
        await removeTagFromLink(link.id, tagId)
      } else {
        await addTagToLink(link.id, tagId)
      }
      // Update local state
      window.location.reload()
    } catch (error) {
      console.error('Error toggling tag:', error)
    }
  }

  const handleDeleteLink = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteLink(link.id)
      if (result.success) {
        // Link will be automatically removed from the list due to revalidation
      }
    } catch (error) {
      console.error('Error deleting link:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
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
                onClick={handleDeleteLink}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div
        className="glass rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
      {/* Preview image */}
      {link.ogImage && (
        <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
          <Image
            src={link.ogImage}
            alt={link.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {link.favicon ? (
                <Image
                  src={link.favicon}
                  alt={link.siteName || link.domain}
                  width={16}
                  height={16}
                  className="rounded"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                  {link.domain.charAt(0).toUpperCase()}
                </div>
              )}
              {isEditing ? (
                <input
                  type="text"
                  className="flex-1 px-2 py-1 text-lg font-semibold bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              ) : (
                <h3 className="text-lg font-semibold line-clamp-2">
                  {link.title || link.url}
                </h3>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <span className="domain truncate">{link.domain}</span>
              <span>•</span>
              <span className="text-xs">{new Date(link.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={handleFavorite}
            className={`p-1.5 rounded-full transition-colors ${link.favorite ? 'text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            aria-label={link.favorite ? '取消星标' : '添加星标'}
          >
            {link.favorite ? '⭐' : '☆'}
          </button>
        </div>

        {/* Description */}
        {isEditing ? (
          <div className="space-y-2 mb-3">
            <textarea
              className="w-full px-2 py-1 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none"
              rows={2}
              placeholder="描述"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <textarea
              className="w-full px-2 py-1 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none"
              rows={3}
              placeholder="备注"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        ) : (
          <>
            {link.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                {link.description}
              </p>
            )}
            {link.note && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 italic">
                {link.note}
              </p>
            )}
          </>
        )}

        {/* Tags */}
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

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="保存"
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setTitle(link.title)
                  setDescription(link.description)
                  setNote(link.note)
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="取消"
              >
                取消
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleOpen}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                aria-label="打开原始链接"
              >
                <span>🔗</span>
                <span>打开</span>
              </button>
              <div className="flex gap-1">
                <button
                  className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setIsEditing(true)}
                  aria-label="编辑"
                >
                  ✏️
                </button>
                <button
                  className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={handleArchive}
                  aria-label="归档"
                >
                  📦
                </button>
                <button
                  className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={handleLoadTags}
                  aria-label="添加标签"
                >
                  🏷️
                </button>
                <button
                  className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hover:text-red-600 dark:hover:text-red-400"
                  onClick={() => setShowDeleteConfirm(true)}
                  aria-label="删除链接"
                >
                  🗑️
                </button>
              </div>
            </>
          )}
        </div>

        {/* Tag Manager */}
        {showTagManager && (
          <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium mb-2">添加标签</h4>
            {isLoadingTags ? (
              <div className="text-center py-2 text-gray-500 dark:text-gray-400">加载标签中...</div>
            ) : availableTags.length === 0 ? (
              <div className="text-center py-2 text-gray-500 dark:text-gray-400">暂无标签</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isTagAssigned = link.linkTags.some(({ tag: assignedTag }) => assignedTag.id === tag.id)
                  return (
                    <button
                  key={tag.id}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${isTagAssigned ? 'bg-gray-300 dark:bg-gray-700' : `bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600`}`}
                  style={{ 
                    backgroundColor: isTagAssigned ? `${tag.color || '#8b5cf6'}` : `${tag.color || '#8b5cf6'}20`, 
                    color: isTagAssigned ? 'white' : (tag.color || '#8b5cf6') 
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
              className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => setShowTagManager(false)}
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </motion.div>
    </>
  )
}

export default LinkCard
