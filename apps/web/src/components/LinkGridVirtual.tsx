'use client'

import React, { useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Pin } from 'lucide-react'
import Fuse, { IFuseOptions } from 'fuse.js'
import LinkCard from './LinkCard'
import { Link } from '@/types/link'

interface LinkGridVirtualProps {
  links: Link[]
}

function estimateCardHeight(link: Link): number {
  let height = 32
  height += 60

  if (link.ogImage) {
    height += 192
  }

  if (link.description) {
    height += 40
  }

  if (link.note) {
    height += 40
  }

  if (link.linkTags?.length > 0) {
    height += 24
  }

  height += 32
  height += 8

  return height
}

const LinkGridVirtual: React.FC<LinkGridVirtualProps> = ({ links }) => {
  const parentRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort') || 'createdAt'

  // Process links based on search query
  const processedLinks = useMemo(() => {
    if (!searchQuery) {
      return links
    }

    const fuseOptions: IFuseOptions<Link> = {
      keys: [
        'title',
        'url',
        'description',
        'note',
        'siteName',
        'domain'
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
      ignoreLocation: false,
      ignoreFieldNorm: true,
      shouldSort: true,
      distance: 100,
      findAllMatches: true
    }

    const fuse = new Fuse(links, fuseOptions)
    const searchResults = fuse.search(searchQuery)
    return searchResults.map(result => result.item)
  }, [links, searchQuery])

  // Sort links
  const sortedLinks = useMemo(() =>
    [...processedLinks].sort((a, b) => {
      switch (sortBy) {
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'lastVisitedAt':
          return new Date(b.lastVisitedAt || 0).getTime() - new Date(a.lastVisitedAt || 0).getTime()
        case 'domain':
          return a.domain.localeCompare(b.domain)
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    }),
    [processedLinks, sortBy]
  )

  const virtualizer = useVirtualizer({
    count: sortedLinks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => estimateCardHeight(sortedLinks[index]),
    overscan: 5,
  })

  if (sortedLinks.length === 0) {
    return (
      <div className="empty-state max-w-2xl mx-auto">
        <div className="empty-state__icon">
          <Pin className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-medium mb-1">暂无链接</h3>
        <p className="text-muted-foreground">
          点击&quot;添加链接&quot;按钮开始收藏
        </p>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100dvh-12rem)] overflow-y-auto pr-2"
      style={{ contain: 'strict' }}
    >
      <div
        className="w-full max-w-2xl mx-auto"
        style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const link = sortedLinks[virtualRow.index]
          // 仅首批 12 行做入场动画,其余行渲染普通 div(见 DESIGN.md 性能红线)
          const animate = virtualRow.index < 12
          const rowStyle = {
            top: `${virtualRow.start}px`,
            height: `${virtualRow.size}px`,
          }
          const rowContent = (
            <div className="pb-4">
              <LinkCard link={link} />
            </div>
          )
          return animate ? (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                delay: virtualRow.index * 0.04,
              }}
              className="absolute left-0 right-0"
              style={rowStyle}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
            >
              {rowContent}
            </motion.div>
          ) : (
            <div
              key={link.id}
              className="absolute left-0 right-0"
              style={rowStyle}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
            >
              {rowContent}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LinkGridVirtual
