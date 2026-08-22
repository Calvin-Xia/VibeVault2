# PROJECT KNOWLEDGE BASE

**Generated:** 2026-08-22
**Commit:** ee32b7f
**Branch:** main

## OVERVIEW

VibeVault2 — visual link bookmark/collection app (可视化链接收藏夹). pnpm monorepo with Next.js 15 App Router + TypeScript strict + TailwindCSS + Prisma (SQLite dev / **D1 prod via @prisma/adapter-d1**) + NextAuth (OTP email code via Resend). Deploys to **Cloudflare Workers via OpenNext** (GitHub Pages 路线已移除:NextAuth 无法静态导出)。

## STRUCTURE

```
VibeVault2/
├── apps/web/              # Next.js 15 app (@vibevault/web)
│   ├── open-next.config.ts  # OpenNext Cloudflare config
│   ├── wrangler.jsonc       # Worker/D1 binding/vars (部署前需填 database_id)
│   ├── d1/schema.sql        # D1 初始 DDL(一次性执行,由 prisma migrate diff 生成)
│   ├── src/actions/       # Server Actions (4 files — ALL data mutations here)
│   ├── src/app/           # App Router pages + API route
│   ├── src/components/    # Client Components (12 files, incl. ui/ subdir)
│   ├── src/lib/           # auth.ts + resend.ts + metadata.ts + url.ts + otp.ts (+ *.test.ts)
│   ├── src/middleware.ts  # withAuth — protects /app/:path*
│   └── src/types/         # link.ts + next-auth.d.ts augmentation
└── packages/db/           # Prisma package (@vibevault/db)
    ├── prisma/schema.prisma  # 8 models: User, Link, Tag, LinkTag, Collection, LinkVisit, Job, OTPVerification
    └── src/               # client.ts (D1 adapter / local sqlite 双模式) + barrel
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new data mutation | `apps/web/src/actions/` | Server Actions only — NO API routes |
| Mail / OTP auth logic | `apps/web/src/actions/otpActions.ts` + `src/lib/resend.ts` | sendOtp, verifyOtp |
| Add new page/route | `apps/web/src/app/app/` | All app pages under `/app` prefix |
| Add new component | `apps/web/src/components/` | All are `'use client'` |
| Modify auth | `apps/web/src/lib/auth.ts` + `src/middleware.ts` | CredentialsProvider (OTP), JWT strategy, route guard |
| Modify schema | `packages/db/prisma/schema.prisma` | Then `pnpm generate && pnpm push` |
| Add DB models | `packages/db/prisma/schema.prisma` | cuid() IDs, cascade deletes |
| Modify build/deploy | Root `package.json` + `apps/web/open-next.config.ts` + `apps/web/wrangler.jsonc` + `.github/workflows/` | OpenNext build → `wrangler deploy`(main 自动) |

## CONVENTIONS

- **TypeScript strict** — both `apps/web` and `packages/db`
- **Path aliases**: `@/*` → `./src/*`, `@vibevault/db` → `../../packages/db/src` (raw source, not dist)
- **Styling**: Tailwind utility classes only. Theme uses shadcn/ui HSL CSS variables (`hsl(var(--primary))`, etc.)
- **No CSS Modules** — zero `.module.css` files
- **Components**: PascalCase files (e.g. `LinkCard.tsx`); Server Actions camelCase (`linkActions.ts`)
- **Commits**: Conventional Commits (feat/fix/docs/style/refactor/test/chore) — not enforced by hooks
- **Package manager**: pnpm@10.26.1 pinned in root `packageManager`

## ANTI-PATTERNS (THIS PROJECT)

- **No Prettier** — not installed; lint is ESLint only
- **No git hooks** — no husky, no lint-staged, no commitlint
- **Do NOT edit** `next-env.d.ts`
- **Tests are allowed**:Vitest 单测已建立(纯函数层 — `src/lib/*.test.ts`、`src/actions/otp.test.ts`;共 25 tests)

## KNOWN ISSUES

- `packages/db` imports raw TS source via path alias instead of built dist
- `apps/web/wrangler.jsonc` 的 `d1_databases[0].database_id` 为占位符 — 部署前需 `wrangler d1 create vibevault` 并回填
- Windows 本地跑 OpenNext 完整构建失败于符号链接权限(需开发者模式);CI(Linux)无此限制
- `.sisyphus/ralph-loop.local.md` 被 git 跟踪(2026-05-27 ralph-loop 会话残留 — 待用户决定删除)
- CI 已于本次改造,但首个 push 后需确认 build/deploy workflow 通过(依赖 GitHub secrets:CLOUDFLARE_API_TOKEN、CLOUDFLARE_ACCOUNT_ID、NEXTAUTH_SECRET、RESEND_API_KEY)

## COMMANDS

```bash
# Install
pnpm install

# Database
cd packages/db && pnpm generate && pnpm push

# Dev
cd apps/web && pnpm dev

# Build (root — OpenNext, for Cloudflare Workers)
pnpm run build

# Test
pnpm -F @vibevault/web test

# Lint
cd apps/web && pnpm lint
```

## NOTES

- `apps/web/src/server/` no longer exists (was empty/reserved, removed)
- All UI components and the sign-in page are Client Components; only Dashboard (`/app/page.tsx`) and root `layout.tsx` are Server Components
- `Link.status` uses string values (INBOX, READING, ARCHIVED) via `types/link.ts` `LinkStatus`; `metadataStatus` uses PENDING/READY/FAILED via `MetadataStatus` — not Prisma enums
- Auth: email OTP via Resend (no password, no GitHub OAuth), JWT sessions, `middleware.ts` guards `/app/:path*`; users auto-created on first successful OTP
- 元数据抓取已实现(`src/lib/metadata.ts`):创建链接后立即懒抓取 og:title/og:description/og:image/favicon/siteName/publishedTime,`metadataStatus` PENDING→READY/FAILED,详情页支持手动重试;SSRF 防护(拒绝内网/保留 IP、非 http(s)、超时与大小限制)
- Knowledge graph is inline in `graph/page.tsx` (`GraphView` is not a separate component file); masonry grid uses `LinkGridVirtual` (@tanstack/react-virtual) + Fuse.js search
- 视觉设计规范见根目录 `DESIGN.md`(暗夜宝库 Dark Vault):暗色为默认(`<html class="dark">`),亮色为白昼变体;新 UI 必须遵守其 Color Palette(仅 CSS 变量)、Typography(Noto Sans SC + Space Grotesk + JetBrains Mono,via next/font)、组件类(`.btn*/.card/.chip/.badge/.input/.nav-item` 等)与性能红线(零 `filter: blur()` 于移动元素、聚光灯 rAF 节流、`prefers-reduced-motion` 降级);`tailwind.config.js` 颜色已升级为 `<alpha-value>` 模式(`bg-card/80` 等透明度修饰符有效)
