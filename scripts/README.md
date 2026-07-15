# Data Import Scripts

Python scripts for importing and refreshing data in the Clinical Placements Database.

> Full pipeline documentation — source provenance, where to get the input files,
> refresh cadence — is in [../docs/DATA_PIPELINE.md](../docs/DATA_PIPELINE.md).
> This file is the quick reference.

## Prerequisites

```bash
pip install psycopg2-binary pandas openpyxl requests
```

Every script reads `DATABASE_URL` from the environment and exits if it is unset.
None of them contain credentials; keep it that way.

## Scripts

### import_data_supabase.py

Imports HRSA sites, schools, military sites, and Native American reserves from Excel files.

**Usage:**
```bash
export DATABASE_URL="postgresql://..."
python3 import_data_supabase.py
```

**Input:** `TRIAL_2.xlsx` (HRSA export with multiple sheets). Expected one level
above `scripts/`; override with the `TRIAL_2_XLSX` environment variable. The
file is not in the repo — see [../docs/DATA_PIPELINE.md](../docs/DATA_PIPELINE.md).

---

### import_active_sites.py

Imports Clarkson's active clinical placement sites from Exxat export.

**Usage:**
```bash
export DATABASE_URL="postgresql://..."
python3 import_active_sites.py
```

**Input:** CSV/Excel file from Exxat

**Frequency:** Run each semester when Exxat data is updated.

---

### import_state_economic.py

Fetches state-level economic data from federal APIs:
- **GDP Growth:** BEA Regional API (SAGDP2 table)
- **Healthcare Employment:** BLS QCEW API (NAICS 62)

**Usage:**
```bash
export DATABASE_URL="postgresql://..."
export BEA_API_KEY="your_api_key"
python3 import_state_economic.py
```

**Frequency:** Run annually in April when federal data is refreshed.

**Features:**
- Multiple fallback methods (BEA API → bulk CSV → FRED → sample data)
- Automatic parsing of BLS QCEW aggregation levels
- Calculates healthcare share percentage

---

## Environment Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string | All scripts |
| `BEA_API_KEY` | Bureau of Economic Analysis API key | import_state_economic.py |

## Data Sources

| Source | URL | Data |
|--------|-----|------|
| HRSA | https://data.hrsa.gov | Healthcare facilities |
| BEA | https://apps.bea.gov/api | State GDP |
| BLS QCEW | https://www.bls.gov/cew/downloadable-data-files.htm | Employment by industry |
| Census | https://www.census.gov | County population |
