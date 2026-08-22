'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma } from '@vibevault/db'
import { normalizeUrl } from '@/lib/url'
import { fetchMetadata } from '@/lib/metadata'

export async function createLink(formData: FormData) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  const url = formData.get('url') as string
  const title = formData.get('title') as string
  const note = formData.get('note') as string
  const tagIds = (formData.get('tagIds') as string || '').split(',').filter(id => id)
  
  if (!url) {
    return { success: false, error: 'URL is required' }
  }

  try {
    const normalized = normalizeUrl(url)
    if (!normalized.ok) {
      return { success: false, error: normalized.error }
    }

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
      include: {
        linkTags: {
          include: {
            tag: true
          }
        }
      }
    })

    // Fire metadata fetch (SSRF-guarded, best effort; failure keeps the link usable)
    const fetchResult = await fetchMetadata(normalized.url)
    if (fetchResult.success && fetchResult.metadata) {
      const m = fetchResult.metadata
      await prisma.link.update({
        where: { id: link.id },
        data: {
          title: title || m.title || '',
          description: m.description ?? undefined,
          ogImage: m.ogImage ?? undefined,
          favicon: m.favicon ?? undefined,
          siteName: m.siteName ?? undefined,
          publishedTime: m.publishedTime ? new Date(m.publishedTime) : undefined,
          metadataStatus: 'READY',
          metadataError: null,
        },
      })
    } else {
      await prisma.link.update({
        where: { id: link.id },
        data: {
          metadataStatus: 'FAILED',
          metadataError: fetchResult.error || 'Unknown error',
        },
      })
    }

    // Revalidate dashboard page and all related pages
    revalidatePath('/app')
    revalidatePath('/app/graph')

    const updatedLink = await prisma.link.findUnique({
      where: { id: link.id },
      include: {
        linkTags: {
          include: { tag: true },
        },
      },
    })

    return { success: true, link: updatedLink ?? link }
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

  const { status, tag, sortBy = 'createdAt', page = 1, limit = 20 } = params
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
    const updatedLink = await prisma.link.update({
      where: {
        id: linkId,
        userId: session.user.id,
      },
      data,
      include: {
        linkTags: {
          include: {
            tag: true,
          },
        },
      },
    })

    revalidatePath('/app')
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

    // Create link-tag association
    await prisma.linkTag.create({
      data: {
        linkId,
        tagId,
      },
    })

    revalidatePath('/app')
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
      const m = fetchResult.metadata
      const updated = await prisma.link.update({
        where: { id: linkId },
        data: {
          title: m.title ?? undefined,
          description: m.description ?? undefined,
          ogImage: m.ogImage ?? undefined,
          favicon: m.favicon ?? undefined,
          siteName: m.siteName ?? undefined,
          publishedTime: m.publishedTime ? new Date(m.publishedTime) : undefined,
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
