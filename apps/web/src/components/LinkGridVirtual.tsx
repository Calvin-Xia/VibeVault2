'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Pin } from 'lucide-react'
import Fuse, { IFuseOptions } from 'fuse.js'
import LinkCard from './LinkCard'
import { Link } from '@/types/link'

// DESIGN.md 瀑布流规范:容器 max-width 1600px,卡片 min 300px,gap 20px → 1/2/3/4 列
const GRID_GAP = 20
const MIN_COLUMN_WIDTH = 300
const MAX_COLUMNS = 4
// 入场动画预算(仅可视区首批),均摊到各列(DESIGN.md 性能红线)
const ANIMATE_BUDGET = 12

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

interface VirtualColumnProps {
  items: Link[]
  scrollElement: HTMLElement | null
  scrollMargin: number
  animateCount: number
}

function VirtualColumn({ items, scrollElement, scrollMargin, animateCount }: VirtualColumnProps) {
  // 每列一个 virtualizer,共享同一个页面级滚动元素(见 LinkGridVirtual 的 data-scroll-root)
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: (index) => estimateCardHeight(items[index]),
    overscan: 5,
    scrollMargin,
  })

  return (
    <div
      className="relative flex-1 min-w-0"
      style={{ height: `${rowVirtualizer.getTotalSize()}px`, contain: 'layout' }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const link = items[virtualRow.index]
        // 仅各列首批卡片做 stagger 入场,其余滚动入场即时(见 DESIGN.md 性能红线)
        const animate = virtualRow.index < animateCount
        // virtualizer 的 start 含 scrollMargin(页面内容偏移),渲染时换算回列内坐标
        const rowStyle = {
          top: `${virtualRow.start - scrollMargin}px`,
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
            ref={rowVirtualizer.measureElement}
          >
            {rowContent}
          </motion.div>
        ) : (
          <div
            key={link.id}
            className="absolute left-0 right-0"
            style={rowStyle}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
          >
            {rowContent}
          </div>
        )
      })}
    </div>
  )
}

const LinkGridVirtual: React.FC<LinkGridVirtualProps> = ({ links }) => {
  const gridRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort') || 'createdAt'

  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const [columnCount, setColumnCount] = useState(1)

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

  // 列数:随容器宽度 1/2/3/4 列(卡片 min 300px,gap 20px)
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const update = () => {
      const width = grid.clientWidth
      const next = Math.min(
        MAX_COLUMNS,
        Math.max(1, Math.floor((width + GRID_GAP) / (MIN_COLUMN_WIDTH + GRID_GAP)))
      )
      setColumnCount((prev) => (prev === next ? prev : next))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [])

  // 页面级滚动根(Dashboard 的 data-scroll-root 容器,而非内部固定高度盒子)
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const scroller =
      (grid.closest('[data-scroll-root]') as HTMLElement | null) ??
      (document.querySelector('[data-scroll-root]') as HTMLElement | null)
    setScrollElement(scroller)
    if (!scroller) return

    // grid 在滚动内容中的偏移(react-virtual 的 scrollMargin),
    // 用 rect 差值 + scrollTop 计算,避免依赖 offsetParent。
    // 滚动根自身尺寸变化(FilterBar 换行/展开表单/窗口缩放)时重新对齐。
    const measure = () => {
      const gridRect = grid.getBoundingClientRect()
      const scrollerRect = scroller.getBoundingClientRect()
      setScrollMargin(gridRect.top - scrollerRect.top + scroller.scrollTop)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // 最短列优先分配(按估算高度累计),列数或数据变化时重算
  const columns = useMemo<Link[][]>(() => {
    const cols: Link[][] = Array.from({ length: columnCount }, () => [])
    const heights = new Array<number>(columnCount).fill(0)
    for (const link of sortedLinks) {
      let shortest = 0
      for (let i = 1; i < columnCount; i++) {
        if (heights[i] < heights[shortest]) shortest = i
      }
      cols[shortest].push(link)
      heights[shortest] += estimateCardHeight(link)
    }
    return cols
  }, [sortedLinks, columnCount])

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
      ref={gridRef}
      className="w-full max-w-[1600px] mx-auto flex items-start gap-5"
      style={{ contain: 'layout' }}
    >
      {columns.map((columnItems, columnIndex) => (
        <VirtualColumn
          key={columnIndex}
          items={columnItems}
          scrollElement={scrollElement}
          scrollMargin={scrollMargin}
          animateCount={Math.max(1, Math.floor(ANIMATE_BUDGET / columnCount))}
        />
      ))}
    </div>
  )
}

export default LinkGridVirtual
