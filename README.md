# Clinical Placements Database

A Next.js web application built for Clarkson University's clinical placement coordinators to explore, search, and manage clinical placement site data across the United States.

## Overview

This application provides an interactive map interface with over 81,000 clinical placement sites, including HRSA healthcare facilities, educational institutions, military bases, and Native American reserves. The platform enables clinical coordinators to filter by state, healthcare profession (PT/OT/PA), and data layer to identify suitable placement locations for students.

## Features

### Interactive Map
- Leaflet-based map with marker clustering for efficient visualization of 81,000+ sites
- Viewport-based data loading for optimal performance
- Click markers to view detailed site information
- Hover tooltips for quick identification

### Multi-Layer Data Support
The application aggregates data from five distinct sources:
- **HRSA Sites**: 81,000+ healthcare facilities from the Health Resources and Services Administration
- **Schools**: Physical Therapy, Occupational Therapy, and Physician Assistant programs
- **Post-Secondary Schools**: Higher education institutions
- **Military Sites**: Military installations across the US
- **Native American Reserves**: Tribal reservation locations

### Advanced Filtering
- Multi-state selection with checkbox interface
- Profession filter for PT/OT/PA programs
- Real-time filter application

### Searchable Data Table
- Tabular view of filtered results
- Sortable columns (Name, State, Type)
- Real-time search within results
- Click-to-navigate integration with map

### AI-Powered Chat Assistant
- Natural language queries for database exploration
- Powered by Claude AI (Anthropic)
- Example queries:
  - "How many HRSA sites are in California?"
  - "Which states have no OT programs?"
  - "List military sites in Texas"

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Map | React Leaflet + Marker Clustering |
| Database | MySQL |
| AI | Anthropic Claude API |
| Testing | Jest + React Testing Library |
| Deployment | Vercel |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/          # AI chatbot endpoint
│   │   ├── layers/        # Layer metadata endpoint
│   │   ├── notes/         # Notes CRUD operations
│   │   ├── search/        # Cross-layer search
│   │   └── sites/         # GeoJSON site data
│   ├── dashboard/         # Main application interface
│   └── page.tsx           # Landing page
├── components/
│   ├── ChatPanel.tsx      # AI chat interface
│   ├── DataTable.tsx      # Searchable results table
│   ├── FilterPanel.tsx    # State/profession filters
│   ├── LayerToggle.tsx    # Map layer visibility controls
│   ├── MapClient.tsx      # Leaflet map component
│   └── NotesPanel.tsx     # Site annotations
├── lib/
│   ├── db.ts              # MySQL connection pool
│   └── types.ts           # TypeScript interfaces
└── __tests__/             # Test suite
```

## Installation

### Prerequisites
- Node.js 18 or higher
- npm, yarn, or pnpm
- MySQL database access credentials

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/[organization]/clinical-placements-app.git
   cd clinical-placements-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the environment configuration:
   ```bash
   cp .env.example .env.local
   ```

4. Edit `.env.local` with the appropriate database credentials and API keys (see Environment Variables section)

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Access the application at `http://localhost:3000`

## Environment Variables

The application requires the following environment variables in `.env.local`:

```env
# Database Configuration
DB_HOST=mysql.clarksonmsda.org
DB_PORT=3306
DB_USER=[database_username]
DB_PASSWORD=[database_password]
DB_NAME=[database_name]

# AI Chatbot (Optional)
ANTHROPIC_API_KEY=[anthropic_api_key]
```

**Security Note**: The `.env.local` file is excluded from version control via `.gitignore`. Credentials should never be committed to the repository.

## Database Schema

The application connects to a MySQL database containing the following tables:

| Table | Description | Approximate Records |
|-------|-------------|---------------------|
| `layers` | Layer metadata and display configuration | 5 |
| `hrsa_sites` | HRSA healthcare facilities | 81,000 |
| `schools` | PT/OT/PA educational programs | 1,500 |
| `post_secondary_schools` | Post-secondary institutions | 7,000 |
| `military_sites` | Military installations | 400 |
| `native_american_reserves` | Native American reservations | 500 |
| `notes` | User annotations for sites | Variable |

### Common Table Columns
- `id` - Primary key (integer)
- `name` - Site/institution name (varchar)
- `state` - Two-letter state code (char)
- `latitude` - Geographic latitude (decimal)
- `longitude` - Geographic longitude (decimal)

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint code analysis |

## Deployment

### Vercel Deployment (Recommended)

1. Push the repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Configure the following environment variables in the Vercel dashboard:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `ANTHROPIC_API_KEY` (if using AI chat feature)
4. Deploy

The repository includes `vercel.json` with pre-configured settings including security headers and regional optimization.

### Manual Deployment

```bash
npm run build
npm run start
```

## Application Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with feature overview |
| `/dashboard` | Main application with map, filters, and data table |

## Usage

### Landing Page
The landing page (`/`) provides an introduction to the application with feature highlights and navigation to the main dashboard.

### Dashboard
The dashboard (`/dashboard`) contains the main application interface:

- **Layer Controls** (left sidebar): Toggle data layers on/off using the eye icon
- **Filters** (left sidebar): Select states and filter by profession (PT/OT/PA)
- **Map** (center): Interactive map with clustered markers. Click markers to view details.
- **Data Table** (bottom): Sortable, searchable table of filtered results. Click rows to navigate to locations.
- **AI Chat** (bottom right): Natural language interface for querying the database

## Testing

The project includes a comprehensive test suite with 39 tests covering:
- Database utility functions
- Filter panel interactions
- Data table functionality
- Layer toggle behavior

Run tests:
```bash
npm test
```

## Browser Compatibility

- Google Chrome 90+
- Mozilla Firefox 88+
- Apple Safari 14+
- Microsoft Edge 90+

## License

Proprietary - Clarkson University. All rights reserved.

## Support

For technical support or questions, contact the Clarkson University MSDA program.

---

Built with Next.js | Deployed on Vercel
