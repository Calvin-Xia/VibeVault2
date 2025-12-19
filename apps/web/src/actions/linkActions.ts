'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@vibevault/db'

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
    // Validate and normalize URL
    let normalizedUrl: string
    let domain: string
    
    try {
      const parsedUrl = new URL(url)
      normalizedUrl = parsedUrl.toString().split('#')[0]
      domain = parsedUrl.hostname
    } catch (urlError) {
      return { success: false, error: 'Invalid URL format' }
    }

    // Create link with title and note
    const link = await prisma.link.create({
      data: {
        userId: session.user.id,
        url,
        normalizedUrl,
        domain,
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

    // Revalidate dashboard page and all related pages
    revalidatePath('/app')
    revalidatePath('/app/graph')

    return { success: true, link }
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

  const { status, tag, sortBy = 'createdAt', page = 1, limit = 20, search } = params
  const skip = (page - 1) * limit

  try {
    // Build where clause
    const where: any = {
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

    // Build sort clause
    const orderBy: any = {
      [sortBy]: 'desc',
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
