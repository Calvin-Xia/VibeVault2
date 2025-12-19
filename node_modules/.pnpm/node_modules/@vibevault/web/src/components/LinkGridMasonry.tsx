'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import Fuse from 'fuse.js'
import LinkCard from './LinkCard'

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

interface LinkGridMasonryProps {
  links: Link[]
}

const LinkGridMasonry: React.FC<LinkGridMasonryProps> = ({ links }) => {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort') || 'createdAt'

  // Process links based on search query
  const processedLinks = useMemo(() => {
    if (!searchQuery) {
      // No search query, return all links
      return links
    }

    // Configure Fuse.js for advanced search
    const fuseOptions = {
      keys: [
        'title',
        'url',
        'description',
        'note',
        'siteName',
        'domain'
      ],
      threshold: 0.3, // Lower threshold for more precise matching
      includeScore: true,
      includeMatches: true,
      ignoreLocation: false, // Match order matters (for "按顺序" requirement)
      ignoreFieldNorm: true,
      shouldSort: true,
      distance: 100, // Allow some distance between matching characters
      findAllMatches: true
    } as any

    // Initialize Fuse.js
    const fuse = new Fuse(links, fuseOptions)
    
    // Perform search
    const searchResults = fuse.search(searchQuery)
    
    // Extract matched links
    return searchResults.map(result => result.item)
  }, [links, searchQuery])

  // Sort links
  const sortedLinks = [...processedLinks].sort((a, b) => {
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
  })

  return (
    <div className="masonry-grid">
      {sortedLinks.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <div className="text-6xl mb-4">📌</div>
          <h3 className="text-xl font-medium mb-2">暂无链接</h3>
          <p className="text-gray-500 dark:text-gray-400">
            点击右上角的"添加链接"按钮开始收藏链接吧
          </p>
        </div>
      ) : (
        sortedLinks.map((link) => (
          <motion.div
            key={link.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="masonry-item"
          >
            <LinkCard link={link} />
          </motion.div>
        ))
      )}
    </div>
  )
}

export default LinkGridMasonry
