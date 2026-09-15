'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma } from '@vibevault/db'
import { normalizeUrl } from '@/lib/url'
import { fetchMetadata } from '@/lib/metadata'
import type { LinkStatus } from '@/types/link'

const MAX_TITLE_LENGTH = 500
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_NOTE_LENGTH = 5000
const MAX_TAGS_PER_LINK = 20

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

const LINK_STATUSES: readonly LinkStatus[] = ['INBOX', 'READING', 'ARCHIVED']

function isLinkStatus(value: unknown): value is LinkStatus {
  return typeof value === 'string' && (LINK_STATUSES as readonly string[]).includes(value)
}

/**
 * 把客户端传来的 tagId 收敛为当前用户真正拥有的标签。
 *
 * Server Action 的入参来自网络而非编译器:直接拿 tagId 建 LinkTag,用户就能把
 * 自己的链接挂到别人的标签上,从而读到他人的标签名与配色。必须先按 userId 过滤。
 */
async function resolveOwnedTagIds(rawTagIds: string[], userId: string): Promise<string[]> {
  const unique = [...new Set(rawTagIds.map((id) => id.trim()).filter(Boolean))]
  if (unique.length === 0) return []

  const owned = await prisma.tag.findMany({
    where: { id: { in: unique.slice(0, MAX_TAGS_PER_LINK) }, userId },
    select: { id: true },
  })
  return owned.map((tag) => tag.id)
}

/** 远端页面内容不可信且可能超长,入库前统一截断;空串按"无值"处理 */
function clampText(value: string | null | undefined, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed.slice(0, max)
}

/** 无效日期会让 Prisma 写入时抛错,解析失败按"无值"处理 */
function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** 把抓取到的元数据整理成可安全写入的字段集合 */
function metadataToPatch(metadata: {
  title: string | null
  description: string | null
  ogImage: string | null
  favicon: string | null
  siteName: string | null
  publishedTime: string | null
}) {
  return {
    title: clampText(metadata.title, MAX_TITLE_LENGTH),
    description: clampText(metadata.description, MAX_DESCRIPTION_LENGTH),
    ogImage: clampText(metadata.ogImage, 2048),
    favicon: clampText(metadata.favicon, 2048),
    siteName: clampText(metadata.siteName, MAX_TITLE_LENGTH),
    publishedTime: parseDate(metadata.publishedTime),
  }
}

export async function createLink(formData: FormData) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  const url = formData.get('url') as string
  const title = ((formData.get('title') as string) || '').slice(0, MAX_TITLE_LENGTH)
  const note = ((formData.get('note') as string) || '').slice(0, MAX_NOTE_LENGTH)
  const rawTagIds = ((formData.get('tagIds') as string) || '').split(',').filter(id => id)
  
  if (!url) {
    return { success: false, error: 'URL is required' }
  }

  try {
    const normalized = normalizeUrl(url)
    if (!normalized.ok) {
      return { success: false, error: normalized.error }
    }

    const tagIds = await resolveOwnedTagIds(rawTagIds, session.user.id)

    // Create link with title and note
    const link = await prisma.link.create({
      data: {
        userId: session.user.id,
        url: normalized.url,
        normalizedUrl: normalized.normalizedUrl,
        domain: normalized.domain,
        title: title || '',
        note: note || '',
        status: 'INBOX',
        metadataStatus: 'PENDING',
        linkTags: tagIds.length > 0 ? {
          create: tagIds.map(tagId => ({
            tagId
          }))
        } : undefined
      },
    })

    // Fire metadata fetch (SSRF-guarded, best effort; failure keeps the link usable)
    const fetchResult = await fetchMetadata(normalized.url)

    const metadataPatch: {
      title?: string
      description?: string
      ogImage?: string
      favicon?: string
      siteName?: string
      publishedTime?: Date
      metadataStatus: 'READY' | 'FAILED'
      metadataError: string | null
    } = {
      metadataStatus: 'FAILED',
      metadataError: fetchResult.error || 'Unknown error',
    }

    if (fetchResult.success && fetchResult.metadata) {
      const fetched = metadataToPatch(fetchResult.metadata)
      Object.assign(metadataPatch, fetched, {
        // 用户手填的标题优先于抓取结果
        title: title || fetched.title || '',
        metadataStatus: 'READY',
        metadataError: null,
      })
    }

    // 带 include 的 update 直接返回最终数据,不必再 findUnique 回查一次
    const updatedLink = await prisma.link.update({
      where: { id: link.id },
      data: metadataPatch,
      include: {
        linkTags: {
          include: { tag: true },
        },
      },
    })

    // Revalidate dashboard page and all related pages
    revalidatePath('/app')
    revalidatePath('/app/graph')

    return { success: true, link: updatedLink }
  } catch (error) {
    console.error('Error creating link:', error)
    return { success: false, error: 'Failed to create link' }
  }
}

export async function listLinks(params: {
  status?: string
  tag?: string
  sortBy?: string
  page?: number
  limit?: number
  search?: string
}) {
  const session = await getServerSession(authOptions)
  
  // If user is not authenticated, return empty list
  if (!session || !session.user) {
    return { links: [], total: 0, page: 1, limit: 20 }
  }

  const { status, tag, sortBy = 'createdAt' } = params

  // 分页参数来自网络:不夹紧的话 limit=10_000_000 就是一次廉价的全表拉取
  const limit = Math.min(Math.max(Math.trunc(Number(params.limit)) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const page = Math.max(Math.trunc(Number(params.page)) || 1, 1)
  const skip = (page - 1) * limit

  const allowedSortFields = ['createdAt', 'lastVisitedAt', 'domain', 'title'] as const
  type SortField = typeof allowedSortFields[number]
  const safeSortBy: SortField = allowedSortFields.includes(sortBy as SortField) ? (sortBy as SortField) : 'createdAt'

  try {
    const where: Prisma.LinkWhereInput = {
      userId: session.user.id,
    }

    if (status) {
      // Convert status to uppercase to match database values (INBOX, READING, ARCHIVED)
      const uppercaseStatus = status.toUpperCase()
      where.status = uppercaseStatus
    }

    if (tag) {
      // Filter links by tag through the LinkTag connection
      where.linkTags = {
        some: {
          tagId: tag,
        },
      }
    }
    // Search functionality is now implemented client-side with Fuse.js
    // to support advanced fuzzy search with keyboard proximity

    const orderBy: Prisma.LinkOrderByWithRelationInput = {
      [safeSortBy]: 'desc',
    }

    // Fetch links with their tags through the LinkTag connection
    const links = await prisma.link.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        linkTags: {
          include: {
            tag: true,
          },
        },
      },
    })

    // Fetch total count
    const count = await prisma.link.count({ where })

    return { links, total: count, page, limit }
  } catch (error) {
    console.error('Error listing links:', error)
    return { links: [], total: 0, page, limit }
  }
}

/**
 * 侧边栏各状态的链接数量。
 * 用三次并行 count 而不是 groupBy:计数条件固定只有三种,
 * 这样不依赖 groupBy 在各适配器上的支持差异。
 */
export async function getStatusCounts(): Promise<{ inbox: number; reading: number; archived: number }> {
  const session = await getServerSession(authOptions)
  const empty = { inbox: 0, reading: 0, archived: 0 }

  if (!session || !session.user) return empty

  try {
    const [inbox, reading, archived] = await Promise.all([
      prisma.link.count({ where: { userId: session.user.id, status: 'INBOX' } }),
      prisma.link.count({ where: { userId: session.user.id, status: 'READING' } }),
      prisma.link.count({ where: { userId: session.user.id, status: 'ARCHIVED' } }),
    ])
    return { inbox, reading, archived }
  } catch (error) {
    console.error('Error counting links by status:', error)
    return empty
  }
}

export async function updateLink(linkId: string, data: {
  title?: string
  description?: string
  note?: string
  favorite?: boolean
  status?: 'INBOX' | 'READING' | 'ARCHIVED'
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  try {
    // Server Action 的入参来自网络,类型标注拦不住多塞的字段。
    // 直接把 data 透传给 Prisma 时,客户端附带一个 userId 就能把链接转移给他人,
    // 附带 metadataStatus 就能伪造抓取状态 —— 因此必须显式挑选允许更新的字段。
    const patch: {
      title?: string
      description?: string
      note?: string
      favorite?: boolean
      status?: LinkStatus
    } = {}

    if (typeof data?.title === 'string') patch.title = data.title.slice(0, MAX_TITLE_LENGTH)
    if (typeof data?.description === 'string') patch.description = data.description.slice(0, MAX_DESCRIPTION_LENGTH)
    if (typeof data?.note === 'string') patch.note = data.note.slice(0, MAX_NOTE_LENGTH)
    if (typeof data?.favorite === 'boolean') patch.favorite = data.favorite
    if (isLinkStatus(data?.status)) patch.status = data.status

    if (Object.keys(patch).length === 0) {
      return { success: false, error: 'No valid fields to update' }
    }

    const updatedLink = await prisma.link.update({
      where: {
        id: linkId,
        userId: session.user.id,
      },
      data: patch,
      include: {
        linkTags: {
          include: {
            tag: true,
          },
        },
      },
    })

    revalidatePath('/app')
    revalidatePath('/app/graph')
    return { success: true, link: updatedLink }
  } catch (error) {
    console.error('Error updating link:', error)
    return { success: false, error: 'Failed to update link' }
  }
}

export async function addTagToLink(linkId: string, tagId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  try {
    // Check if tag exists and belongs to user
    const tag = await prisma.tag.findUnique({
      where: {
        id: tagId,
        userId: session.user.id,
      },
    })

    if (!tag) {
      return { success: false, error: 'Tag not found' }
    }

    // Check if link exists and belongs to user
    const link = await prisma.link.findUnique({
      where: { id: linkId, userId: session.user.id },
    })
    if (!link) {
      return { success: false, error: 'Link not found' }
    }

    // upsert 而非 create:重复打标签是幂等操作,
    // 用 create 会撞 @@id([linkId, tagId]) 抛 P2002,把一个无害的重复请求变成报错
    await prisma.linkTag.upsert({
      where: { linkId_tagId: { linkId, tagId } },
      create: { linkId, tagId },
      update: {},
    })

    revalidatePath('/app')
    revalidatePath('/app/graph')
    return { success: true }
  } catch (error) {
    console.error('Error adding tag to link:', error)
    return { success: false, error: 'Failed to add tag to link' }
  }
}

export async function removeTagFromLink(linkId: string, tagId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  try {
    // Remove link-tag association, ensuring it belongs to the user
    await prisma.linkTag.deleteMany({
      where: {
        linkId,
        tagId,
        // Ensure the link belongs to the user
        link: {
          userId: session.user.id
        },
        // Ensure the tag belongs to the user
        tag: {
          userId: session.user.id
        }
      },
    })

    revalidatePath('/app')
    revalidatePath('/app/graph')
    return { success: true }
  } catch (error) {
    console.error('Error removing tag from link:', error)
    return { success: false, error: 'Failed to remove tag from link' }
  }
}

export async function getLink(linkId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  try {
    const link = await prisma.link.findUnique({
      where: {
        id: linkId,
        userId: session.user.id,
      },
      include: {
        linkTags: {
          include: {
            tag: true,
          },
        },
        visits: {
          orderBy: { visitedAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!link) {
      return { success: false, error: 'Link not found' }
    }

    return { success: true, link }
  } catch (error) {
    console.error('Error fetching link:', error)
    return { success: false, error: 'Failed to fetch link' }
  }
}

export async function deleteLink(linkId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  try {
    // Delete link
    await prisma.link.delete({
      where: {
        id: linkId,
        userId: session.user.id,
      },
    })

    revalidatePath('/app')
    revalidatePath('/app/graph')
    return { success: true }
  } catch (error) {
    console.error('Error deleting link:', error)
    return { success: false, error: 'Failed to delete link' }
  }
}

export async function retryLinkMetadata(linkId: string) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  try {
    const link = await prisma.link.findUnique({
      where: { id: linkId, userId: session.user.id },
    })

    if (!link) {
      return { success: false, error: 'Link not found' }
    }

    const fetchResult = await fetchMetadata(link.url)

    if (fetchResult.success && fetchResult.metadata) {
      const patch = metadataToPatch(fetchResult.metadata)
      // 已有标题视为用户手写,不被抓取结果覆盖(与 createLink 的优先级一致)
      if (link.title && link.title.trim() !== '') {
        delete patch.title
      }

      const updated = await prisma.link.update({
        where: { id: linkId },
        data: {
          ...patch,
          metadataStatus: 'READY',
          metadataError: null,
        },
        include: {
          linkTags: { include: { tag: true } },
          visits: { orderBy: { visitedAt: 'desc' }, take: 10 },
        },
      })
      revalidatePath('/app')
      revalidatePath(`/app/link/${linkId}`)
      return { success: true, link: updated }
    }

    await prisma.link.update({
      where: { id: linkId },
      data: {
        metadataStatus: 'FAILED',
        metadataError: fetchResult.error || 'Unknown error',
      },
    })
    revalidatePath(`/app/link/${linkId}`)
    return { success: false, error: fetchResult.error || 'Failed to fetch metadata' }
  } catch (error) {
    console.error('Error retrying metadata:', error)
    return { success: false, error: 'Failed to fetch metadata' }
  }
}
