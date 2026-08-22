import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// D1 binding 无需在此声明:Cloudflare bindings(见 wrangler.jsonc 的 d1_databases)
// 会由 OpenNext 自动注入 getCloudflareContext().env(应用侧经 @prisma/adapter-d1 使用)。
export default defineCloudflareConfig({})
