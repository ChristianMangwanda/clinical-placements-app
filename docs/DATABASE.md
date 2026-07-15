# Database

PostgreSQL, hosted on Supabase. The app connects straight to Postgres with the
`pg` driver via `DATABASE_URL` — there is no `supabase-js` and no use of the
Supabase REST API from the app. (The GitHub Actions keepalive is the one
exception; see [OPERATIONS.md](OPERATIONS.md).)

[`../supabase_schema.sql`](../supabase_schema.sql) is the authoritative
structure: 10 tables + 1 view, with indexes and triggers. It was regenerated
from the live database on 2026-07-15 and verified by applying it to a scratch
Postgres and diffing every column. **If you change the database, update that
file in the same commit** — it drifted badly once already and left the database
unreproducible.

## Rebuilding from scratch

```bash
# 1. Create a new Supabase project, then run the schema.
#    Supabase Dashboard > SQL Editor > paste supabase_schema.sql > Run
# 2. Point DATABASE_URL at it (see ../.env.example)
# 3. Load the data — see DATA_PIPELINE.md
```

The schema creates structure only. It contains no data, including the `layers`
table, which the UI needs in order to render any toggles at all — populate it
first or the map will be empty.

## Tables

Counts verified 2026-07-15.

| Table | Rows | Notes |
|---|---:|---|
| `hrsa_sites` | 74,772 | The big one. Facilities with category, beds, FTEs, rural status |
| `post_secondary_schools` | 6,812 | All US post-secondary institutions |
| `county_population` | 3,144 | Census county estimates + YoY change |
| `schools` | 858 | PT/OT/PA programs. **One row per program** — see below |
| `military_sites` | 824 | DoD installations |
| `active_sites` | 805 | Clarkson's own placement sites, from Exxat |
| `native_american_reserves` | 693 | Tribal lands |
| `state_economic` | 51 | BEA GDP + BLS QCEW healthcare employment |
| `layers` | 10 | Config that drives the map toggles |
| `notes` | 0 | Unused — see below |
| `county_coverage` | VIEW | People per facility, by county |

## Design decisions worth knowing

### `schools` is one row per program, not per institution

A university offering PT, OT and PA occupies three rows sharing an
`institution_name`. This makes state × profession filtering a plain `WHERE`
clause, at the cost of needing a `GROUP BY` for anything institution-level.

It also means "how many schools?" has three defensible answers, and you should
say which one you mean:

- **858** — programs (raw row count)
- **649** — distinct institution names
- **655** — distinct campus locations (name + state + coordinates); this is what
  the map draws, since one institution can have campuses in different places

`/api/sites` groups by the campus key to produce one marker per location.

`profession` is a Postgres `ENUM` (`profession_type`), not a string, so a typo
fails at write time rather than silently producing an empty filter.

### `layers` is configuration, not data

Ten rows define every map toggle — display name, colour, icon, sort order,
default visibility. Adding a data source is a new table plus one `INSERT`; the
frontend reads this table and needs no change. `/api/sites` looks up
`layers.table_name` from the `layer_key` query param, which is why layer keys
must match.

### `county_coverage` puts the methodology in the database

The view joins county population to HRSA facilities on 5-digit FIPS and
computes people-per-facility. It counts **only physical, walk-in facility
categories** — home health agencies and hospices are excluded, because they
deliver care at the patient's home and are not places a student can be placed.

Because it's a view rather than application code, the map, the AI agent and any
manual SQL all use one identical definition of "underserved", and it updates
automatically when facility data changes. The exact category allowlist is in
the view definition in `supabase_schema.sql`.

**59 of 3,144 counties have zero qualifying facilities.** Those rows have
`people_per_facility` as `NULL` rather than `0`, so the frontend can
distinguish "no coverage" from "unknown".

### FIPS codes and the Excel trap

County FIPS are `CHAR(5)` and are used as join keys. Excel strips leading zeros
— `01001` becomes `1001` — which silently breaks the join for the eight states
whose FIPS start with `0`. The import scripts re-pad to 5 digits. If coverage
data ever goes mysteriously blank for Alabama through Connecticut, look here
first.

### Indexes follow the UI

Every filter the interface exposes has a supporting index: `state`,
`(latitude, longitude)` for viewport bounds, `site_category` for the clinic-type
filter, `county_fips` for the coverage join, and a composite
`(state, profession)` on `schools`. At 74,772 HRSA rows the coords index is
what keeps map panning usable.

### The `notes` table is unused

It was created for a coordinator-annotation feature that was never built. It
holds 0 rows, nothing reads or writes it, and the `/api/notes` route that once
backed it has been removed (it's in git history if you want it back). The table
is kept so the schema file matches the live database. Drop it if you're sure.

## What is NOT in here

**There is no program outcome data** — no graduation rates, no licensure pass
rates, no employment rates, no tuition, no contacts. Earlier versions of the
API and map popup referenced those columns, but they were never added to the
table and no data was ever collected. The mismatch broke the schools map layer
in production until it was fixed on 2026-07-15.

If you want to build this, the accreditors publish it: CAPTE (PT), ACOTE (OT)
and ARC-PA (PA). It needs a schema migration plus a scraper — real work, not a
config change. See [OPERATIONS.md](OPERATIONS.md) for the rest of the
known-gaps list.
