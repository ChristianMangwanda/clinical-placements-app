# Runbooks

Step-by-step for the changes you're most likely to be asked for. These follow
the grain of the existing code — if a change feels like it needs more steps than
this, check you're not fighting the architecture.

## Orientation

| Path | What it does |
|---|---|
| `src/app/dashboard/page.tsx` | The main app. Owns filter state and layer visibility |
| `src/components/MapClient.tsx` | Leaflet map, markers, popups, choropleths |
| `src/components/Sidebar.tsx` → `FilterPanel.tsx` | Filter controls |
| `src/components/DataTable.tsx` | Results table, CSV export, print, favourites |
| `src/components/ChatPanel.tsx` | AI chat UI |
| `src/app/api/sites/route.ts` | GeoJSON for **every** map layer |
| `src/lib/agent-system-prompt.ts` | What the AI knows about the schema |
| `src/lib/types.ts` | Shared types + `SITE_CATEGORIES`, `US_STATES` |

`MapClient` is loaded via `dynamic()` in `MapWrapper.tsx` with SSR off — Leaflet
touches `window` and cannot server-render. Keep it that way.

## Add a new filter

1. Add the state to `dashboard/page.tsx`.
2. Thread it through `Sidebar.tsx` → `FilterPanel.tsx` for the control.
3. Thread it through `MapWrapper.tsx` → `MapClient.tsx` so the map refetches.
4. Handle the query param in `src/app/api/sites/route.ts`.

In step 4, add the condition as a parameterised clause (`$1`, `$2`, …) the way
the `state`/`clinicTypes` filters already do. Never interpolate a value into the
SQL string. If you're filtering on a new column, add an index for it — see
[DATABASE.md](DATABASE.md).

## Add a field to a map popup

1. Add the column to the `SELECT` in `src/app/api/sites/route.ts`, in the branch
   for that layer (`isSchools` / `isHrsa` / `isActiveSites` / the default).
2. Add it to the local row interface in the same file, and to the `properties`
   object the feature is built with.
3. Add it to `SiteProperties` in `MapClient.tsx`.
4. Add the display JSX in that layer's popup section, guarded so it renders
   nothing when absent.

**Confirm the column actually exists before you add it to the `SELECT`.** This
is the exact mistake that broke the schools layer for months: the query asked
for 11 columns that were never added to the table, Postgres rejected the whole
query with `42703`, the route's `catch` turned that into a 500, and the layer
silently rendered zero markers. A guarded `{x && <div>…}` in the popup hides a
missing field, but a bad `SELECT` takes down the entire layer.

Check first:

```sql
select column_name from information_schema.columns
where table_name = 'schools' order by ordinal_position;
```

## Add a new map layer

1. Create and populate the table.
2. `INSERT` a row into `layers` (`layer_key`, `display_name`, `table_name`,
   `color`, `icon`, `sort_order`, `default_visible`). The UI reads this table,
   so the toggle appears with no frontend change.
3. Add the table's name column to `NAME_COLUMNS` in
   `src/app/api/sites/route.ts` if it isn't `name`.
4. If it needs more than `id/name/state/latitude/longitude`, add a branch to the
   `SELECT` and a matching `features` mapping.
5. Update `src/lib/agent-system-prompt.ts` so the AI knows the layer exists.

## Add a new choropleth layer

1. Add the data source — an API route or, better, a database view (see how
   `county_coverage` encodes its methodology in SQL).
2. Add it to `ChoroplethLayer.tsx` (county-level) or `StateChoroplethLayer.tsx`
   (state-level).
3. Add the layer key to the `choroplethLayers` array in `dashboard/page.tsx`.
4. Handle it in `handleLayerToggle` — only one choropleth is active at a time.

## Change the database schema

1. Make the change in Supabase.
2. **Update `supabase_schema.sql` in the same commit.** It is the only record of
   the structure; it has drifted before and left the database unrebuildable.
3. Update `src/lib/agent-system-prompt.ts` — the AI generates SQL from what that
   prompt says the schema is. Stale prompt, wrong answers.
4. Grep for the affected table in `src/app/api/` — routes declare their own row
   shapes, so nothing will type-error at you if they drift.

## Refresh the data

See [DATA_PIPELINE.md](DATA_PIPELINE.md).

## Before you push

```bash
npm run build        # production build, includes typecheck
npx jest --ci        # tests
npx tsc --noEmit     # typecheck alone
```

Pushing to `main` deploys to production immediately. There is no staging.
