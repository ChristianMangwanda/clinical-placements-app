# Clinical Placements Database — Clarkson University

A web-based platform for managing clinical education site data across Clarkson's PT, OT, and PA programs. Features an interactive map with 74K+ geocoded healthcare facilities, an AI-powered query engine, demographic analysis layers, and economic overlays.

## Live App

https://clinical-placements-app.vercel.app

## Documentation

| Doc | Read it when |
|---|---|
| [docs/RUNBOOKS.md](docs/RUNBOOKS.md) | You need to change something. Start here |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema, design decisions, how to rebuild the DB |
| [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md) | Importing or refreshing data |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Accounts, deploys, and known issues |

New here? Read [docs/OPERATIONS.md](docs/OPERATIONS.md) first — it's the honest
list of what's missing and what's owned by whom.

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Map | Leaflet / react-leaflet |
| Database | PostgreSQL via Supabase (direct `pg` connection, not supabase-js) |
| AI Engine | Claude API (text-to-SQL generation) |
| Hosting | Vercel |
| Testing | Jest + React Testing Library |
| Data Sources | HRSA, US Census Bureau, BEA, BLS QCEW |

## Features

### Interactive Map
- Leaflet-based map. Markers load per viewport (map bounds are passed to
  `/api/sites`, capped at 5,000 rows per request) rather than being clustered
- Click markers to view detailed site information
- Fly-to navigation from table and AI results

### Multi-Layer Data Support
Record counts verified against the live database on 2026-07-15.

| Layer | Records | Source | Description |
|-------|---------|--------|-------------|
| HRSA Sites | 74,772 | HRSA | Healthcare facilities with type, beds, FTEs, rural status |
| Active Sites | 805 | Exxat | Clarkson's current clinical placement sites |
| Schools | 858 | HRSA | PT/OT/PA programs at 649 institutions / 655 campuses |
| Post-Secondary Schools | 6,812 | Dept of Education | All US colleges |
| Military Sites | 824 | DoD | Military bases |
| Native American Reserves | 693 | Census | Tribal lands |

### Analysis Layers (Choropleth)
Toggle these in the sidebar under "Analysis Layers" (only one active at a time):

| Layer | Level | Data Source | Description |
|-------|-------|-------------|-------------|
| Population Change | County | US Census | Green = growing, Red = declining |
| Healthcare Coverage | County | Census + HRSA | People per facility ratio |
| GDP Growth | State | BEA Regional API | State economic growth |
| Healthcare Employment | State | BLS QCEW | Healthcare job concentration |

### AI-Powered Chat Assistant
- Natural language queries powered by Claude
- SQL generation with 50+ example patterns
- Map highlighting of query results
- Automatic choropleth layer recommendations

Example queries:
- "Show me HRSA sites in California with more than 100 beds"
- "Which states have no OT programs?"
- "Find underserved counties in Kansas"
- "Which states have the strongest GDP growth?"

### Radius Analysis Tool
Click the compass icon in the top-right, then click anywhere on the map to see:
- Sites within 30 minutes (20 miles)
- Sites within 60 minutes (45 miles)
- Sites within 90 minutes (70 miles)

## Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- A Supabase project. Starting from an empty one? Run
  [`supabase_schema.sql`](supabase_schema.sql) to create the tables, then load
  data per [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md).

### Environment Variables

[`.env.example`](.env.example) is the authoritative list — copy it and fill in
the values:

```bash
cp .env.example .env.local
```

Five variables are needed to run the app (`DATABASE_URL`, `ANTHROPIC_API_KEY`,
`INTERNAL_API_SECRET`, `NEXT_PUBLIC_API_SECRET`, `ALLOWED_DOMAINS`) plus
`BEA_API_KEY` for the economic data import. Each is documented inline in that
file. Set the same variables in the Vercel dashboard for production.

### Install & Run
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Run Tests
```bash
npm test
```

### Deploy
Push to `main` branch — Vercel auto-deploys.

## Database Tables

Counts verified against the live database on 2026-07-15. See
[docs/DATABASE.md](docs/DATABASE.md) for column-level schema and methodology.

| Table | Records | Description |
|-------|---------|-------------|
| hrsa_sites | 74,772 | Healthcare facilities with category, beds, FTEs, rural status |
| active_sites | 805 | Clarkson's clinical placement sites |
| schools | 858 | PT/OT/PA programs (one row per program) |
| post_secondary_schools | 6,812 | All US post-secondary institutions |
| military_sites | 824 | Military bases and installations |
| native_american_reserves | 693 | Tribal reservation locations |
| county_population | 3,144 | County population with YoY change |
| county_coverage | VIEW | Population / facility ratio by county |
| state_economic | 51 | State GDP + healthcare employment |
| layers | 10 | Map layer metadata |
| notes | 0 | Unused. Table exists; no code reads or writes it |

## Architecture

```
src/
├── app/
│   ├── api/           # API routes
│   │   ├── chat/      # AI chatbot endpoint
│   │   ├── economic/  # State economic data
│   │   ├── layers/    # Layer metadata
│   │   ├── population/# County population data
│   │   ├── search/    # Cross-layer search
│   │   └── sites/     # GeoJSON site data (all map layers)
│   ├── dashboard/     # Main app page
│   └── error.tsx      # Global error boundary
├── components/
│   ├── ChatPanel.tsx           # AI chat interface
│   ├── ChoroplethLayer.tsx     # County-level choropleth
│   ├── StateChoroplethLayer.tsx# State-level choropleth
│   ├── DataTable.tsx           # Searchable results table
│   ├── FilterPanel.tsx         # State/profession filters
│   ├── LayerToggle.tsx         # Layer visibility controls
│   ├── MapClient.tsx           # Main map component
│   ├── MapLegend.tsx           # Choropleth legend
│   ├── RadiusOverlay.tsx       # Radius circles
│   └── RadiusResults.tsx       # Radius results panel
├── lib/
│   ├── db.ts                   # PostgreSQL connection
│   ├── geo-utils.ts            # Haversine distance calculations
│   ├── query-validator.ts      # SQL validation (security)
│   ├── agent-system-prompt.ts  # AI agent prompts
│   └── types.ts                # TypeScript interfaces
└── __tests__/                  # Test suite
```

## Data Refresh

Data is imported once and refreshed periodically. Scripts live in
[`scripts/`](scripts/) — see [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md) for
source-data provenance and per-script detail.

| Script | Data Source | Frequency |
|--------|-------------|-----------|
| `import_data_supabase.py` | HRSA export + Excel | As needed |
| `import_active_sites.py` | Exxat export | Semester |
| `import_state_economic.py` | BEA + BLS APIs | Annually (April) |
| `import_hrsa_v3.py` | HRSA Excel export | As needed |
| `import_county_population.py` | Census county estimates | As needed |

### Refresh Economic Data
```bash
export DATABASE_URL="your_connection_string"
export BEA_API_KEY="your_bea_key"
python3 scripts/import_state_economic.py
```

## Access Control

**This app has no authentication and is publicly reachable.** Anyone with the
Vercel URL can use it, including the AI chat, which bills a paid Anthropic API
key. Commit `812f5a9` disabled the domain restriction that previously limited
origins. See [docs/OPERATIONS.md](docs/OPERATIONS.md) for the full picture of
what does and does not protect these endpoints.

## Common Issues

| Issue | Solution |
|-------|----------|
| Nothing loads, every query fails | `DATABASE_URL` unset. `src/lib/db.ts` falls back to localhost instead of erroring. |
| A whole map layer is empty | The route 500'd. Check the dev server log — a `SELECT` naming a column that doesn't exist kills the entire layer, not just that field. See [docs/RUNBOOKS.md](docs/RUNBOOKS.md). |
| Map has no layer toggles | The `layers` table is empty. It's config, not data — populate it. |
| Map tiles not loading | Check internet connection. Tiles come from OpenStreetMap CDN. |
| AI gives wrong answers | Check `src/lib/agent-system-prompt.ts`. It must match the real schema. Add example queries. |
| Choropleth not showing | Check browser console. TopoJSON files come from `cdn.jsdelivr.net`. |
| Coverage blank for AL–CT | FIPS leading-zero loss. Import scripts zero-pad; see [docs/DATABASE.md](docs/DATABASE.md). |
| Site went down for no reason | Supabase free tier paused. Check the keepalive workflow in the Actions tab. |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Proprietary - Clarkson University. All rights reserved.

## Support

For technical support, contact the Clarkson University MSDA program or open an issue in this repository.

---

Built with Next.js | Deployed on Vercel | Database by Supabase
