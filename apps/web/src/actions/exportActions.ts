'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@vibevault/db'
import { z } from 'zod'

const ImportTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

const ImportLinkTagSchema = z.object({
  tag: ImportTagSchema.optional(),
})

const ImportLinkSchema = z.object({
  url: z.string().url(),
  normalizedUrl: z.string().optional(),
  domain: z.string().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  favicon: z.string().nullable().optional(),
  siteName: z.string().nullable().optional(),
  publishedTime: z.string().nullable().optional(),
  status: z.enum(['INBOX', 'READING', 'ARCHIVED']).optional(),
  favorite: z.boolean().optional(),
  collectionId: z.string().nullable().optional(),
  metadataStatus: z.enum(['PENDING', 'READY', 'FAILED']).optional(),
  metadataError: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  lastVisitedAt: z.string().nullable().optional(),
  linkTags: z.array(ImportLinkTagSchema).optional(),
  tags: z.array(ImportTagSchema).optional(),
})

const ImportDataSchema = z.object({
  version: z.string().optional(),
  links: z.array(ImportLinkSchema).optional(),
  tags: z.array(ImportTagSchema).optional(),
  collections: z.array(z.object({
    name: z.string().min(1).max(100),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  })).optional(),
})

export async function exportData() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated', data: null }
  }

  try {
    // Get all links with tags through the LinkTag connection
    const links = await prisma.link.findMany({
      where: { userId: session.user.id },
      include: {
        linkTags: {
          include: {
            tag: true,
          },
        },
      },
    })

    // Get all tags
    const tags = await prisma.tag.findMany({
      where: { userId: session.user.id },
    })

    // Get all collections
    const collections = await prisma.collection.findMany({
      where: { userId: session.user.id },
    })

    // Create export data
    const exportData = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      userId: session.user.id,
      links,
      tags,
      collections,
    }

    return {
      success: true,
      data: exportData,
    }
  } catch (error) {
    console.error('Error exporting data:', error)
    return {
      success: false,
      error: 'Failed to export data',
    }
  }
}

export async function importData(rawData: unknown) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  // Validate with zod
  const parsed = ImportDataSchema.safeParse(rawData)
  if (!parsed.success) {
    return { success: false, error: 'Invalid import data format: ' + parsed.error.issues.map(i => i.message).join(', ') }
  }

  const data = parsed.data

  try {
    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {
      let importedLinks = 0
      let importedTags = 0
      let skippedLinks = 0
      let skippedTags = 0

      // Import tags
      for (const tag of data.tags || []) {
        try {
          await prisma.tag.upsert({
            where: {
              userId_name: {
                userId: session.user.id,
                name: tag.name,
              },
            },
            update: {
              color: tag.color,
            },
            create: {
              userId: session.user.id,
              name: tag.name,
              color: tag.color,
            },
          })
          importedTags++
        } catch (error) {
          console.error('Error importing tag:', error)
          skippedTags++
        }
      }

      // Import links
      for (const link of data.links || []) {
        try {
          // Check if link already exists using composite unique constraint
          const existingLink = await prisma.link.findUnique({
            where: {
              userId_url: {
                userId: session.user.id,
                url: link.url,
              },
            },
          })

          if (existingLink) {
            skippedLinks++
            continue
          }

          // Create link
          const newLink = await prisma.link.create({
            data: {
              userId: session.user.id,
              url: link.url,
              normalizedUrl: link.normalizedUrl || link.url,
              domain: link.domain || new URL(link.url).hostname,
              title: link.title,
              description: link.description,
              note: link.note,
              ogImage: link.ogImage,
              favicon: link.favicon,
              siteName: link.siteName,
              publishedTime: link.publishedTime ? new Date(link.publishedTime) : null,
              status: link.status || 'INBOX',
              favorite: link.favorite ?? false,
              collectionId: link.collectionId,
              metadataStatus: link.metadataStatus || 'PENDING',
              metadataError: link.metadataError,
              createdAt: link.createdAt ? new Date(link.createdAt) : undefined,
              updatedAt: link.updatedAt ? new Date(link.updatedAt) : undefined,
              lastVisitedAt: link.lastVisitedAt ? new Date(link.lastVisitedAt) : null,
            },
          })

          // Associate tags
          for (const linkTag of link.linkTags || []) {
            try {
              const tag = linkTag.tag
              if (!tag) continue
              const existingTag = await prisma.tag.findFirst({
                where: {
                  userId: session.user.id,
                  name: tag.name,
                },
              })

              if (existingTag) {
                await prisma.linkTag.create({
                  data: {
                    linkId: newLink.id,
                    tagId: existingTag.id,
                  },
                })
              }
            } catch (error) {
              console.error('Error associating tag:', error)
            }
          }

          importedLinks++
        } catch (error) {
          console.error('Error importing link:', error)
          skippedLinks++
        }
      }

      return {
        importedLinks,
        importedTags,
        skippedLinks,
        skippedTags,
      }
    })

    return {
      success: true,
      ...result,
    }
  } catch (error) {
    console.error('Error importing data:', error)
    return {
      success: false,
      error: 'Failed to import data',
    }
  }
}
