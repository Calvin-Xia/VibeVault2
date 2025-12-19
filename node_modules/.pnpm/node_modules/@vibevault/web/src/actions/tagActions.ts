'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@vibevault/db'

export async function listTags() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return []
  }

  try {
    return await prisma.tag.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        // Count how many links use this tag
        _count: {
          select: {
            linkTags: true,
          },
        },
      },
    })
  } catch (error) {
    console.error('Error listing tags:', error)
    return []
  }
}

export async function createTag(data: { name: string; color?: string }) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  if (!data.name.trim()) {
    return { success: false, error: 'Tag name is required' }
  }

  try {
    const tag = await prisma.tag.create({
      data: {
        userId: session.user.id,
        name: data.name.trim(),
        color: data.color || '#8b5cf6',
      },
    })

    revalidatePath('/app')
    return { success: true, tag }
  } catch (error) {
    console.error('Error creating tag:', error)
    return { success: false, error: 'Failed to create tag' }
  }
}

export async function deleteTag(tagId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  try {
    // Delete link-tag associations first (cascade would handle this, but explicit is safer)
    await prisma.linkTag.deleteMany({
      where: {
        tagId,
        tag: {
          userId: session.user.id,
        },
      },
    })

    // Delete the tag itself
    await prisma.tag.delete({
      where: {
        id: tagId,
        userId: session.user.id,
      },
    })

    revalidatePath('/app')
    return { success: true }
  } catch (error) {
    console.error('Error deleting tag:', error)
    return { success: false, error: 'Failed to delete tag' }
  }
}

export async function updateTag(tagId: string, data: { name: string; color?: string }) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'User not authenticated' }
  }

  if (!data.name.trim()) {
    return { success: false, error: 'Tag name is required' }
  }

  try {
    const tag = await prisma.tag.update({
      where: {
        id: tagId,
        userId: session.user.id,
      },
      data: {
        name: data.name.trim(),
        color: data.color || '#8b5cf6',
      },
    })

    revalidatePath('/app')
    return { success: true, tag }
  } catch (error) {
    console.error('Error updating tag:', error)
    return { success: false, error: 'Failed to update tag' }
  }
}
