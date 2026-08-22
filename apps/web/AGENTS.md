# APPS/WEB — NEXT.JS APPLICATION

## OVERVIEW

Next.js 15 App Router app. All data flows through Server Actions (no REST API routes). All UI components are Client Components. Deploys to Cloudflare Workers via OpenNext (see `open-next.config.ts` + `wrangler.jsonc`); DB = D1 in prod (via `@prisma/adapter-d1`), SQLite locally.

## DEPLOYMENT FILES (in this directory)

- `open-next.config.ts` — OpenNext Cloudflare config (D1 无需在此声明)
- `wrangler.jsonc` — Worker config: D1 binding `DB`, assets, nodejs_compat;`database_id` 占位符需回填
- `d1/schema.sql` — D1 初始 DDL(一次性 `wrangler d1 execute --file=./d1/schema.sql`),由 `prisma migrate diff` 生成

## ROUTING

```
src/
├── middleware.ts          # withAuth — protects /app/:path*
├── actions/               # Server Actions: linkActions, tagActions, exportActions, otpActions
├── lib/                   # auth.ts + resend.ts + metadata.ts + url.ts + otp.ts (+ *.test.ts)
└── app/
    ├── layout.tsx         # Root: Providers (SessionProvider) + Toaster
    ├── page.tsx           # "/" — OTP sign-in page (Client)
    ├── error.tsx          # Error boundary
    ├── globals.css        # CSS vars + glassmorphism + masonry grid
    ├── api/auth/[...nextauth]/route.ts  # NextAuth handler (only API route)
    └── app/
        ├── layout.tsx     # AppShell + PageTransition
        ├── page.tsx       # "/app" — Dashboard (Server Component, virtualized grid)
        ├── loading.tsx
        ├── graph/page.tsx # "/app/graph" — Knowledge graph (ReactFlow, Client, inline GraphView)
        ├── settings/page.tsx # "/app/settings" — Import/export + tag CRUD (Client)
        └── link/[id]/page.tsx # "/app/link/:id" — Link detail (Client, implemented)
```

## DATA LAYER

All mutations via Server Actions in `src/actions/`:
- `linkActions.ts` — createLink, listLinks, getLink, updateLink, deleteLink, addTagToLink, removeTagFromLink, retryLinkMetadata (元数据重试)
- `tagActions.ts` — listTags, createTag, updateTag, deleteTag
- `exportActions.ts` — exportData, importData (uses Prisma `$transaction`)
- `otpActions.ts` — sendOtp, verifyOtp (email OTP code, via Resend; hash in `src/lib/otp.ts`)

Auth check: `getServerSession(authOptions)` in every action; `middleware.ts` guards `/app/:path*`.

Pure helpers in `src/lib/` (unit-tested with Vitest):
- `metadata.ts` — 元数据抓取 (SSRF 防护 + HTML 解析);`createLink` 后自动执行,失败可重试
- `url.ts` — URL 规范化
- `otp.ts` — OTP 哈希(纯函数)

## COMPONENTS

| Component | Role | Notes |
|-----------|------|-------|
| `Providers.tsx` | SessionProvider wrapper | `'use client'` |
| `AppShell.tsx` | Layout shell (header + sidebar + main) | `'use client'` |
| `PageTransition.tsx` | Framer Motion page transition wrapper | `'use client'` |
| `Sidebar.tsx` | Status filters, collections, tag cloud | `'use client'` |
| `FilterBar.tsx` | Search, sort, view toggle, add-link form | `'use client'` |
| `LinkCard.tsx` | Card with CRUD, tag mgmt, delete modal | `'use client'` |
| `LinkGridVirtual.tsx` | Virtualized masonry grid + Fuse.js fuzzy search | `'use client'` |
| `ui/` | ConfirmDialog, EmptyState, MobileSheet, Skeleton, TagManager | all `'use client'` |

## CONVENTIONS

- **New data mutation** → add Server Action in `src/actions/`, NOT an API route
- **New page** → add under `src/app/app/` (all app pages live under `/app` URL prefix)
- **New component** → add in `src/components/`, mark `'use client'`; shared primitives in `src/components/ui/`
- **Imports**: use `@/*` for local, `@vibevault/db` for database access
- **Types**: `src/types/link.ts` (Link, LinkTag, Tag, LinkStatus, MetadataStatus)
- **Styling**: Tailwind utility classes with HSL CSS variable tokens only
- **Tests**: Vitest (`pnpm test`) — 纯函数层必测:元数据解析、URL 规范化、OTP 哈希

## ANTI-PATTERNS

- Do NOT add API routes for data operations — use Server Actions
- Do NOT add Server Components to `src/components/` — all are Client Components
- Do NOT use CSS Modules — Tailwind only
- Do NOT use `window.location.reload()` — use `router.refresh()` or React state
