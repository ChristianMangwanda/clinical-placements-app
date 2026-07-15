# Data pipeline

How data gets into the database, and where it comes from.

All imports are idempotent — safe to re-run. They validate coordinates before
loading and insert in batches.

## Prerequisites

```bash
pip install psycopg2-binary pandas openpyxl requests
export DATABASE_URL="postgresql://..."   # see ../.env.example
```

Every script reads `DATABASE_URL` from the environment and exits if it's unset.
None of them contain credentials — if you ever find one that does, that's a bug
worth fixing immediately (one of them did until 2026-07-15, and the password
ended up public on GitHub as a result).

## Source → table

| Source | What | Script | Rows | Refresh |
|---|---|---|---:|---|
| HRSA (US DHHS) | Healthcare facilities | `import_hrsa_v3.py` | 74,772 | On new HRSA export |
| HRSA / accreditors | PT/OT/PA programs | `import_data_supabase.py` | 858 | On new export |
| US Dept. of Education | Post-secondary institutions | `import_data_supabase.py` | 6,812 | On new export |
| US DoD | Military installations | `import_data_supabase.py` | 824 | On new export |
| US Census | Native American reserves | `import_data_supabase.py` | 693 | On new export |
| US Census PEP | County population + change | `import_county_population.py` | 3,144 | Automated — pulls latest Census data |
| BEA + BLS QCEW | State GDP + healthcare employment | `import_state_economic.py` | 51 | Automated — pulls latest year from both APIs |
| Clarkson (Exxat) | Active clinical sites | `import_active_sites.py` | 805 | Each semester |

## Source data files

The bulk imports read Excel/CSV exports that are **not in this repo** — they're
large, and a fresh export from the source is usually what you want anyway.

| File | Used by | Where to get it |
|---|---|---|
| `TRIAL_2.xlsx` | `import_data_supabase.py` | HRSA export, multiple sheets. https://data.hrsa.gov |
| `hrsa_v3.xlsx` | `import_hrsa_v3.py` | HRSA facility export. https://data.hrsa.gov |
| `co-est2023-alldata.csv` | `import_county_population.py` | Census PEP county estimates. https://www.census.gov |
| Exxat export | `import_active_sites.py` | Clarkson coordinators. `active_sites_geocoded.csv` in the repo root is the geocoded result |

By default the scripts look for these one level above `scripts/`. Override the
path with the `TRIAL_2_XLSX` environment variable if yours lives elsewhere.

Ask the outgoing maintainer for the current copies, or re-download from source.

## The scripts

### `import_data_supabase.py`
Bulk import of HRSA sites, schools, military sites and reserves from
`TRIAL_2.xlsx`.

```bash
export DATABASE_URL="postgresql://..."
python3 scripts/import_data_supabase.py
```

### `import_hrsa_v3.py`
The current HRSA facility importer (v3 supersedes an earlier v2). Re-pads county
FIPS to 5 digits — Excel strips the leading zero on `01001` and silently breaks
the coverage join for eight states.

### `import_county_population.py`
County population estimates from the Census. Same FIPS zero-padding.

### `import_active_sites.py`
Clarkson's own placement sites from the Exxat export.

```bash
export DATABASE_URL="postgresql://..."
python3 scripts/import_active_sites.py
```

**Frequency:** each semester, when coordinators send an updated list.

### `import_state_economic.py`
State GDP from the BEA Regional API (SAGDP2) and healthcare employment from BLS
QCEW (NAICS 62). Falls back through BEA API → bulk CSV → FRED → sample data if a
source is unavailable, so check the output actually says what you expect.

```bash
export DATABASE_URL="postgresql://..."
export BEA_API_KEY="your_key"    # https://apps.bea.gov/API/signup/
python3 scripts/import_state_economic.py
```

**Frequency:** annually in April, when the federal data refreshes.

## Data sources

| Source | URL | Data |
|---|---|---|
| HRSA | https://data.hrsa.gov | Healthcare facilities |
| US Census | https://www.census.gov | County population, tribal lands |
| BEA | https://apps.bea.gov/api | State GDP |
| BLS QCEW | https://www.bls.gov/cew/downloadable-data-files.htm | Employment by industry |
| Dept. of Education | https://nces.ed.gov | Post-secondary institutions |
| DoD | | Military installations |

All reference layers are federal sources. Clarkson's active-site list is the
only institutional one.
