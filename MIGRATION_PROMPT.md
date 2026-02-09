# MIGRATION_PROMPT.md
# Copy everything below this line and paste it into Claude Code

---

## Task: Migrate Clinical Placements Database from MySQL to Supabase (PostgreSQL)

### Context
I have a working Next.js app deployed on Vercel at https://clinical-placements-app.vercel.app/. It currently connects to a MySQL database at `mysql.clarksonmsda.org`, but that server blocks connections from Vercel's serverless functions (firewall only allows campus IPs). I need to migrate to Supabase (PostgreSQL) so the app works in production.

### Current State
- **App:** Next.js deployed on Vercel
- **Current DB:** MySQL at `mysql.clarksonmsda.org` (database name: `mangwazc_Clinical Database`)
- **Problem:** MySQL server blocks Vercel connections
- **Solution:** Migrate to Supabase (free tier, PostgreSQL)

### Database Schema (currently MySQL, needs to become PostgreSQL)

**7 tables, 90,669 total rows:**

1. `hrsa_sites` (81,477 rows) — Healthcare providers/clinical sites
   - id (INT PK AUTO_INCREMENT), site_name (VARCHAR 500 nullable), state (CHAR 2), longitude (DECIMAL 11,7), latitude (DECIMAL 10,7), source (VARCHAR 50), created_at (TIMESTAMP), updated_at (TIMESTAMP)
   - Indexes on: state, (latitude, longitude), site_name

2. `schools` (858 rows) — PT/OT/PA program institutions
   - id (INT PK AUTO_INCREMENT), program_row_id (INT), institution_name (VARCHAR 300), campus_name (VARCHAR 200 nullable), state (CHAR 2), profession (ENUM 'PT','OT','PA'), program_name (VARCHAR 200), accreditation_body (VARCHAR 20), accreditation_status (VARCHAR 200), address (VARCHAR 500), longitude (DECIMAL 11,7), latitude (DECIMAL 10,7), source (VARCHAR 50), created_at (TIMESTAMP), updated_at (TIMESTAMP)
   - Indexes on: state, profession, (state + profession), (latitude, longitude), institution_name

3. `post_secondary_schools` (6,812 rows) — All US post-secondary institutions
   - id (INT PK AUTO_INCREMENT), original_id (INT), institution_name (VARCHAR 300), state (CHAR 2), latitude (DECIMAL 10,7), longitude (DECIMAL 11,7), source (VARCHAR 50), created_at (TIMESTAMP), updated_at (TIMESTAMP)

4. `military_sites` (824 rows) — Military installations
   - id (INT PK AUTO_INCREMENT), name (VARCHAR 300), state (CHAR 2), component (VARCHAR 50), longitude (DECIMAL 11,7), latitude (DECIMAL 10,7), source (VARCHAR 50), created_at (TIMESTAMP), updated_at (TIMESTAMP)

5. `native_american_reserves` (693 rows) — Reservation locations
   - id (INT PK AUTO_INCREMENT), name (VARCHAR 500), state (CHAR 2), latitude (DECIMAL 10,7), longitude (DECIMAL 11,7), source (VARCHAR 50), created_at (TIMESTAMP), updated_at (TIMESTAMP)

6. `layers` (5 rows) — Layer metadata for frontend toggle UI
   - id (INT PK AUTO_INCREMENT), layer_key (VARCHAR 50 UNIQUE), display_name (VARCHAR 100), table_name (VARCHAR 100), description (TEXT), icon (VARCHAR 50), color (CHAR 7), default_visible (TINYINT/BOOLEAN), sort_order (INT), created_at (TIMESTAMP)

7. `notes` (0 rows) — Coordinator annotations
   - id (INT PK AUTO_INCREMENT), layer_key (VARCHAR 50 nullable), entity_id (INT nullable), state (CHAR 2 nullable), note_text (TEXT), author (VARCHAR 100), created_at (TIMESTAMP), updated_at (TIMESTAMP)

### What You Need To Do

#### Step 1: Create Supabase PostgreSQL schema
Convert the MySQL schema to PostgreSQL. Key differences to handle:
- `AUTO_INCREMENT` → `SERIAL` or `GENERATED ALWAYS AS IDENTITY`
- `ENUM('PT','OT','PA')` → use a CHECK constraint or create a custom TYPE
- `TINYINT(1)` → `BOOLEAN`
- `DECIMAL(11,7)` / `DECIMAL(10,7)` → `NUMERIC(11,7)` / `NUMERIC(10,7)`
- Backtick quoting → double-quote quoting (or just remove)
- `ON UPDATE CURRENT_TIMESTAMP` → needs a trigger function in PostgreSQL
- Index syntax differences

Generate a `supabase_schema.sql` file I can paste into the Supabase SQL editor.

#### Step 2: Create data import script
Create/update `import_data_supabase.py` that:
- Reads from `TRIAL_2.xlsx` (5 sheets: HRSA, Schools, Post Secondary Schools, Military Sites USA [trailing space in sheet name], Native American Reserves)
- Connects to Supabase PostgreSQL using the connection string from env var `DATABASE_URL`
- Uses `psycopg2` (not mysql-connector)
- Batch inserts all data
- Handles the same data cleaning as before (2 null HRSA site names, 301 null campus names, trailing space in Military sheet name)
- Seeds the `layers` table with the 5 layer records
- Prints verification counts

The Supabase connection string format is:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

#### Step 3: Update the Next.js app
Find and update all database connection code in the app:
- Replace `mysql2` with `@supabase/supabase-js` or `pg` (node-postgres) or Prisma with PostgreSQL
- Update the connection config to use Supabase env vars
- Update any raw SQL queries for PostgreSQL syntax (backticks → double quotes, ENUM handling, etc.)
- Update `.env.local` / `.env` to use Supabase credentials instead of MySQL

The env vars needed for Supabase are:
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Also update the Vercel environment variables to match.

#### Step 4: Verify
- All API routes return correct data
- Map loads with all layers
- Filters work
- Search works

### Important Notes
- The source Excel file `TRIAL_2.xlsx` is in the project directory
- The HRSA table is the largest (81K rows) — needs efficient batch insert
- The `layers` table drives the frontend — the layer records must be seeded
- Keep the same table names so frontend code changes are minimal
- The app should work identically after migration — same features, same UI, just different database backend

### Files to create/modify:
1. `supabase_schema.sql` (NEW) — PostgreSQL table creation script
2. `import_data_supabase.py` (NEW) — Data import script for Supabase
3. `src/lib/db.ts` or equivalent (MODIFY) — Database connection code
4. Any API route files using raw SQL (MODIFY) — Fix MySQL → PostgreSQL syntax
5. `.env.local` (MODIFY) — Update env vars
6. `package.json` (MODIFY) — Replace mysql2 with pg or @supabase/supabase-js
