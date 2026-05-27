# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-27 20:51
**Commit:** 2efe0ce6
**Branch:** main

## OVERVIEW

VibeVault2 — visual link bookmark/collection app (可视化链接收藏夹). pnpm monorepo with Next.js 14 App Router + TypeScript + TailwindCSS + Prisma (SQLite) + NextAuth. Deploys to Cloudflare Workers via OpenNext.

## STRUCTURE

```
VibeVault2/
├── apps/web/              # Next.js 14 app (@vibevault/web)
│   ├── src/actions/       # Server Actions (3 files — ALL data mutations here)
│   ├── src/app/           # App Router pages + API route
│   ├── src/components/    # Client Components (6 files)
│   ├── src/lib/           # Auth config (auth.ts)
│   ├── src/server/        # Empty (reserved)
│   └── src/types/         # next-auth.d.ts type augmentation
└── packages/db/           # Prisma package (@vibevault/db)
    ├── prisma/schema.prisma  # 7 models: User, Link, Tag, LinkTag, Collection, LinkVisit, Job
    └── src/               # client.ts singleton + barrel export
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new data mutation | `apps/web/src/actions/` | Server Actions only — NO API routes |
| Add new page/route | `apps/web/src/app/app/` | All app pages under `/app` prefix |
| Add new component | `apps/web/src/components/` | All are `'use client'` |
| Modify auth | `apps/web/src/lib/auth.ts` | CredentialsProvider, JWT strategy |
| Modify schema | `packages/db/prisma/schema.prisma` | Then `pnpm generate && pnpm push` |
| Add DB models | `packages/db/prisma/schema.prisma` | cuid() IDs, cascade deletes |
| Modify build/deploy | Root `package.json` | `opennextjs-cloudflare build` |

## CONVENTIONS

- **TypeScript strict** — both `apps/web` and `packages/db`
- **Path aliases**: `@/*` → `./src/*`, `@vibevault/db` → `../../packages/db/src` (raw source, not dist)
- **Styling**: Tailwind utility classes only. Theme uses shadcn/ui HSL CSS variables (`hsl(var(--primary))`, etc.)
- **No CSS Modules** — zero `.module.css` files
- **Components**: PascalCase. Files: kebab-case per README (though actual files use PascalCase)
- **Commits**: Conventional Commits (feat/fix/docs/style/refactor/test/chore) — not enforced by hooks
- **Package manager**: pnpm@10.26.1 pinned in root `packageManager`

## ANTI-PATTERNS (THIS PROJECT)

- **No tests exist** — zero test files, zero test configs, zero test deps
- **No Prettier** — README claims ESLint + Prettier but Prettier is not installed
- **No git hooks** — no husky, no lint-staged, no commitlint
- **No middleware.ts** — auth is per-Server-Action, not route-level
- **No `'use client'` / `'use server'` directives** in source files
- **Do NOT edit** `next-env.d.ts`
- **Do NOT cancel** in-progress CI deployments (`.github/workflows/nextjs.yml` line 23)

## KNOWN ISSUES

- `apps/web/src/app/app/link/[id]/page.tsx` — stub, shows mock text only
- `LinkCard.tsx` uses `window.location.reload()` after mutations instead of `router.refresh()`
- `exportActions.ts` line 143: iterates `link.tags` but Prisma returns `linkLinks` — potential import bug
- `graph/page.tsx` has duplicate `style` property on edge objects
- CI: `nextjs.yml` has conflicting package manager detection (ignores pnpm)
- README mentions GitHub OAuth but `auth.ts` only implements Credentials (email-only)
- `packages/db` imports raw TS source via path alias instead of built dist

## COMMANDS

```bash
# Install
pnpm install

# Database
cd packages/db && pnpm generate && pnpm push

# Dev
cd apps/web && pnpm dev

# Build (root — Cloudflare Workers)
pnpm run build

# Lint
cd apps/web && pnpm lint
```

## NOTES

- `src/server/` directory exists but is empty — reserved for future use
- All UI components are Client Components; only the Dashboard page (`/app/page.tsx`) is a Server Component
- `Link.status` uses string values (INBOX, READING, ARCHIVED) not Prisma enums
- Auth auto-creates users on first email login (no password required)
- Knowledge graph uses ReactFlow; masonry grid uses custom CSS + Fuse.js search
