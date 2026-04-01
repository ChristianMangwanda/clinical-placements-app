# Clinical Placements Database - Project Guide

## Overview
Interactive map-based clinical placements database for Clarkson University's PT, OT, and PA programs. Built with Next.js 16, React, Leaflet, and Supabase (PostgreSQL).

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Map**: Leaflet + React-Leaflet
- **AI**: Claude API for natural language queries
- **Styling**: Tailwind CSS with Clarkson branding (green #00533E, gold #FAC922)

## Key Files

### Core Components
- `src/app/dashboard/page.tsx` - Main dashboard with map, filters, data table
- `src/components/MapClient.tsx` - Leaflet map with markers, popups, choropleths
- `src/components/FilterPanel.tsx` - State, profession, clinic type filters
- `src/components/DataTable.tsx` - Results table with export, print, favorites
- `src/components/ChatPanel.tsx` - AI chat interface for natural language queries

### API Routes
- `/api/sites` - Fetch site markers with layer, state, clinicType filters
- `/api/search` - Full-text search across all layers
- `/api/layers` - Get layer metadata (colors, visibility)
- `/api/chat` - AI query processing
- `/api/schools` - School-specific data with programs
- `/api/economic` - State economic data for choropleths

### Hooks
- `src/hooks/useFavorites.ts` - localStorage-based watchlist/favorites

### Types
- `src/lib/types.ts` - All TypeScript interfaces, SITE_CATEGORIES, US_STATES constants

## Database Tables

### Main Data Tables
- `hrsa_sites` - HRSA healthcare facilities (~75K records)
- `schools` - PT/OT/PA educational programs (~858 records)
- `post_secondary_schools` - Community colleges
- `military_sites` - Military healthcare facilities
- `native_american_reserves` - Tribal health facilities
- `active_sites` - Clarkson's active clinical sites

### Metadata Tables
- `layers` - Layer configuration (colors, display names, visibility)
- `state_population` - Population data for choropleths
- `state_economic` - GDP, employment data for choropleths
- `county_coverage` - Healthcare coverage ratios

## Features

### Implemented
- Multi-layer map with 6+ data sources
- State filter (multi-select, 50 states + territories)
- Profession filter (PT/OT/PA toggle)
- Clinic type filter (Hospital, FQHC, Rural Health, etc.)
- Choropleth layers (population change, coverage ratio, GDP growth, healthcare employment)
- Radius analysis tool (click map to find sites within radius)
- AI chat for natural language queries
- Export to CSV
- Print view (Clarkson-branded)
- Watchlist/Favorites (localStorage)
- Star sites from map popups

### HRSA Site Categories
```
Hospital, Community Health Center, FQHC, Rural Health Clinic,
Skilled Nursing Facility, Ambulatory Surgical Center, Home Health Agency,
School-Based Health Center, Migrant Health Center, Homeless Health Center,
Indian Health Service, Public Housing Primary Care
```

## Common Tasks

### Add a new filter
1. Add state to `dashboard/page.tsx`
2. Pass to `Sidebar.tsx` → `FilterPanel.tsx`
3. Update `MapWrapper.tsx` → `MapClient.tsx`
4. Update `/api/sites` route to handle filter

### Add data to map popup
1. Update SQL query in `/api/sites/route.ts` to include field
2. Add to `SiteProperties` interface in `MapClient.tsx`
3. Add display JSX in popup section of `MapClient.tsx`

### Add new choropleth layer
1. Add data source (API route or database view)
2. Add to `StateChoroplethLayer.tsx` or `ChoroplethLayer.tsx`
3. Add layer key to `choroplethLayers` array in `dashboard/page.tsx`
4. Add toggle handling in `handleLayerToggle`

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

## Scripts
- `scripts/import_data_supabase.py` - Import HRSA/schools data
- `scripts/import_active_sites.py` - Import Clarkson active sites
- `scripts/import_state_economic.py` - Import economic data

## Testing
```bash
npm test                    # Run all tests
npm run build              # Build (includes type check)
npx tsc --noEmit           # Type check only
```

## Deployment
Hosted on Vercel. Push to `main` triggers auto-deploy.

## Future Enhancements
- School data: graduation rates, pass rates, contact info, tuition
- Additional programs: SLP, AT, Nursing
- Placement tracking
- Affiliation agreement status
- Distance from Clarkson campus
