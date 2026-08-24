<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GLOBAL PROJECT RULE — MANDATORY SERVER-SIDE PAGINATION

All dynamic data grids, tables, listings, archives, history, and record collections in the DukaanAI application MUST follow the centralized server-side pagination system:

1. **Global Default Page Size**: 10 records per page.
2. **Server-Side Range Offset**: Calculate offsets using `from = (page - 1) * pageSize` and `to = from + pageSize - 1` with Supabase `.range(from, to)`.
3. **Database-Level Search & Filtering**: All queries must filter at the database/API level and return `{ data, page, pageSize, totalCount, totalPages }`.
4. **Auto-Reset Page**: Any change in search terms or filter controls must reset `page` to `1`.
5. **Reusable UI & Hook**:
   - Reusable UI component: `src/components/common/Pagination.tsx`
   - Reusable custom hook: `src/hooks/usePagination.ts`
6. **Multi-Tenant Shop Isolation**: Every query MUST enforce `shop_id` scoping to respect authentication and RLS policies.
7. **Future Data Grids**: Every future list or table displaying dynamic records must automatically integrate `Pagination` and `usePagination` by default.

