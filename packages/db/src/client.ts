import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * 运行时选择:
 * - Cloudflare Workers (OpenNext):使用 D1 binding (via @prisma/adapter-d1)
 * - 本地开发 / CI (Node):直接使用 PrismaClient (DATABASE_URL, SQLite)
 *
 * 惰性初始化:在首次使用时才构建,避免在模块加载期(Worker 冷启动)
 * 调用 getCloudflareContext —— 它只能在请求生命周期内调用。
 */
function createClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    try {
      // OpenNext 提供 Cloudflare 上下文(在请求内调用安全;这里 try/catch 兜底本地 run)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getCloudflareContext } = require('@opennextjs/cloudflare') as typeof import('@opennextjs/cloudflare')
      const { env } = getCloudflareContext()
      // Binding name may be rewritten by OpenNext deploy (e.g. database_name);
      // accept DB (wrangler.jsonc) or the database_name fallback.
      const envRecord = env as Record<string, unknown>
      const db = envRecord.DB ?? envRecord.vibevault ?? envRecord.d1
      if (db) {
        return new PrismaClient({ adapter: new PrismaD1(db as never) })
      }
    } catch {
      // Not running on Cloudflare — fall through to local PrismaClient
    }
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

/**
 * 惰性单例:Proxy 保证首次属性访问时才初始化,
 * 方法调用时绑定 this,兼容 prisma.$transaction / prisma.link.create 等用法。
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = globalForPrisma.prisma ?? (globalForPrisma.prisma = createClient())
    const value = (client as unknown as Record<PropertyKey, unknown>)[prop]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})

export function getPrisma(): PrismaClient {
  return globalForPrisma.prisma ?? (globalForPrisma.prisma = createClient())
}

export * from '@prisma/client'
