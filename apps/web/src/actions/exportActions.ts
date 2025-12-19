'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@vibevault/db'

export async function exportData() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    throw new Error('User not authenticated')
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

export async function importData(data: any) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    throw new Error('User not authenticated')
  }

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
          // Check if link already exists
          const existingLink = await prisma.link.findUnique({
            where: {
              url: link.url,
              userId: session.user.id,
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
              normalizedUrl: link.normalizedUrl,
              domain: link.domain,
              title: link.title,
              description: link.description,
              note: link.note,
              ogImage: link.ogImage,
              favicon: link.favicon,
              siteName: link.siteName,
              publishedTime: link.publishedTime,
              status: link.status,
              favorite: link.favorite,
              collectionId: link.collectionId,
              metadataStatus: link.metadataStatus,
              metadataError: link.metadataError,
              createdAt: link.createdAt,
              updatedAt: link.updatedAt,
              lastVisitedAt: link.lastVisitedAt,
            },
          })

          // Associate tags
          for (const tag of link.tags || []) {
            try {
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
