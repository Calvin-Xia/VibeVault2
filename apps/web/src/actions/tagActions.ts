'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@vibevault/db'
import { DEFAULT_TAG_COLOR } from '@/lib/tagColor'

const MAX_TAG_NAME_LENGTH = 50
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

/**
 * @@unique([userId, name]) 冲突。按 code 判断而不是 instanceof,
 * 这样不依赖具体适配器抛出的错误类身份。
 */
function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
}

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

  const name = typeof data?.name === 'string' ? data.name.trim() : ''
  if (!name) {
    return { success: false, error: 'Tag name is required' }
  }
  if (name.length > MAX_TAG_NAME_LENGTH) {
    return { success: false, error: `标签名称不能超过 ${MAX_TAG_NAME_LENGTH} 个字符` }
  }

  try {
    const safeColor = data.color && HEX_COLOR.test(data.color) ? data.color : DEFAULT_TAG_COLOR
    const tag = await prisma.tag.create({
      data: {
        userId: session.user.id,
        name,
        color: safeColor,
      },
    })

    revalidatePath('/app')
    revalidatePath('/app/graph')
    return { success: true, tag }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: '已存在同名标签' }
    }
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

  const name = typeof data?.name === 'string' ? data.name.trim() : ''
  if (!name) {
    return { success: false, error: 'Tag name is required' }
  }
  if (name.length > MAX_TAG_NAME_LENGTH) {
    return { success: false, error: `标签名称不能超过 ${MAX_TAG_NAME_LENGTH} 个字符` }
  }

  try {
    const safeColor = data.color && HEX_COLOR.test(data.color) ? data.color : DEFAULT_TAG_COLOR
    const tag = await prisma.tag.update({
      where: {
        id: tagId,
        userId: session.user.id,
      },
      data: {
        name,
        color: safeColor,
      },
    })

    revalidatePath('/app')
    revalidatePath('/app/graph')
    return { success: true, tag }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, error: '已存在同名标签' }
    }
    console.error('Error updating tag:', error)
    return { success: false, error: 'Failed to update tag' }
  }
}
