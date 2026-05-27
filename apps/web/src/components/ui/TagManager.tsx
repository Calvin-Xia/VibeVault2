'use client'

import { X } from 'lucide-react'
import { Tag } from '@/types/link'

interface TagManagerProps {
  availableTags: Tag[]
  assignedTagIds: string[]
  isLoading: boolean
  onToggle: (tagId: string) => void
  onClose: () => void
}

function SkeletonPill() {
  return (
    <div
      className="h-7 w-20 rounded-full bg-muted animate-pulse"
      aria-hidden="true"
    />
  )
}

export default function TagManager({
  availableTags,
  assignedTagIds,
  isLoading,
  onToggle,
  onClose,
}: TagManagerProps) {
  const assignedSet = new Set(assignedTagIds)

  return (
    <div className="mt-3 p-3 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-card-foreground">
          管理标签
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="关闭标签管理"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-1.5">
          <SkeletonPill />
          <SkeletonPill />
          <SkeletonPill />
        </div>
      ) : availableTags.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          暂无标签
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="可用标签">
          {availableTags.map((tag) => {
            const isAssigned = assignedSet.has(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={isAssigned}
                aria-label={`${isAssigned ? '移除' : '添加'}标签 ${tag.name}`}
                className={`
                  px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer
                  ${
                    isAssigned
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  }
                `}
                onClick={() => onToggle(tag.id)}
              >
                {tag.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export type { TagManagerProps }
