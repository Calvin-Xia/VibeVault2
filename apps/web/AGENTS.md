# APPS/WEB — NEXT.JS APPLICATION

## OVERVIEW

Next.js 14 App Router app. All data flows through Server Actions (no REST API routes). All UI components are Client Components.

## ROUTING

```
src/app/
├── layout.tsx           # Root: Providers (SessionProvider) + AppShell
├── page.tsx             # "/" — redirects to /app
├── globals.css          # CSS vars + glassmorphism + masonry grid
├── api/auth/[...nextauth]/route.ts  # NextAuth handler (only API route)
└── app/
    ├── page.tsx         # "/app" — Dashboard (Server Component, masonry grid)
    ├── graph/page.tsx   # "/app/graph" — Knowledge graph (ReactFlow, Client)
    ├── settings/page.tsx # "/app/settings" — Import/export + tag CRUD (Client)
    └── link/[id]/page.tsx # "/app/link/:id" — STUB (not implemented)
```

## DATA LAYER

All mutations via Server Actions in `src/actions/`:
- `linkActions.ts` — createLink, listLinks, updateLink, deleteLink, addTagToLink, removeTagFromLink
- `tagActions.ts` — listTags, createTag, updateTag, deleteTag
- `exportActions.ts` — exportData, importData (uses Prisma `$transaction`)

Auth check: `getServerSession(authOptions)` in every action.

## COMPONENTS

| Component | Role | Notes |
|-----------|------|-------|
| `Providers.tsx` | SessionProvider wrapper | `'use client'` |
| `AppShell.tsx` | Layout shell (header + sidebar + main) | `'use client'` |
| `Sidebar.tsx` | Status filters, collections, tag cloud | `'use client'` |
| `FilterBar.tsx` | Search, sort, view toggle, add-link form | `'use client'` |
| `LinkCard.tsx` | Card with CRUD, tag mgmt, delete modal | Uses `window.location.reload()` — should use `router.refresh()` |
| `LinkGridMasonry.tsx` | Masonry grid + Fuse.js fuzzy search | Client-side search only |

## CONVENTIONS

- **New data mutation** → add Server Action in `src/actions/`, NOT an API route
- **New page** → add under `src/app/app/` (all app pages live under `/app` URL prefix)
- **New component** → add in `src/components/`, mark `'use client'`
- **Imports**: use `@/*` for local, `@vibevault/db` for database access
- **Styling**: Tailwind utility classes with HSL CSS variable tokens only

## ANTI-PATTERNS

- Do NOT add API routes for data operations — use Server Actions
- Do NOT add Server Components to `src/components/` — all are Client Components
- Do NOT use CSS Modules — Tailwind only
- Do NOT use `window.location.reload()` — use `router.refresh()` or React state
