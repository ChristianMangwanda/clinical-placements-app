#!/usr/bin/env python3
"""
import_hrsa_v3.py — Replace hrsa_sites with enriched v3 dataset (now with county FIPS)

Prerequisites:
  pip install pandas openpyxl psycopg2-binary

Usage:
  1. Place your HRSA v3 Excel file (hrsa_v3.xlsx) in the same directory,
     or set HRSA_V3_XLSX to its path
  2. export DATABASE_URL="postgresql://..."   # see .env.example
  3. Run: python3 import_hrsa_v3.py

See ../docs/DATA_PIPELINE.md for where to get the source file.
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import sys, os

# ── CONFIGURATION ──
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit(
        "ERROR: DATABASE_URL environment variable not set.\n"
        "  export DATABASE_URL='postgresql://...'  # see .env.example"
    )

EXCEL_FILE = os.environ.get("HRSA_V3_XLSX", "hrsa_v3.xlsx")
SHEET_NAME = 0
HEADER_ROW = 2  # Headers are on row 3 (0-indexed as row 2)
BATCH_SIZE = 500

DROP_AND_CREATE_SQL = """
DROP TABLE IF EXISTS hrsa_sites CASCADE;

CREATE TABLE hrsa_sites (
  id                              SERIAL PRIMARY KEY,
  site_name                       TEXT,
  site_category                   TEXT,
  state                           CHAR(2) NOT NULL,
  city                            TEXT,
  county_fips                     CHAR(5),
  physician_ftes                  NUMERIC(10,2) DEFAULT 0,
  physician_assistant_ftes        NUMERIC(10,2) DEFAULT 0,
  num_beds                        INTEGER DEFAULT 0,
  is_federally_funded_hc          BOOLEAN DEFAULT FALSE,
  is_hospital_based               BOOLEAN DEFAULT FALSE,
  site_type                       TEXT,
  is_rural_health_clinic          BOOLEAN DEFAULT FALSE,
  rural_status                    TEXT,
  longitude                       NUMERIC(11,7) NOT NULL,
  latitude                        NUMERIC(10,7) NOT NULL,
  source                          TEXT NOT NULL DEFAULT 'HRSA',
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrsa_state ON hrsa_sites (state);
CREATE INDEX idx_hrsa_city ON hrsa_sites (city);
CREATE INDEX idx_hrsa_category ON hrsa_sites (site_category);
CREATE INDEX idx_hrsa_coords ON hrsa_sites (latitude, longitude);
CREATE INDEX idx_hrsa_name ON hrsa_sites (site_name);
CREATE INDEX idx_hrsa_rural ON hrsa_sites (is_rural_health_clinic);
CREATE INDEX idx_hrsa_fqhc ON hrsa_sites (is_federally_funded_hc);
CREATE INDEX idx_hrsa_fips ON hrsa_sites (county_fips);
CREATE INDEX idx_hrsa_rural_status ON hrsa_sites (rural_status);
"""


def parse_boolean(val):
    if pd.isna(val):
        return False
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() in ('true', 'yes', 'y', '1', 't')


def parse_numeric(val, default=0):
    if pd.isna(val):
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def parse_int(val, default=0):
    if pd.isna(val):
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def parse_fips(val):
    """Ensure FIPS is a zero-padded 5-digit string."""
    if pd.isna(val):
        return None
    fips = str(val).strip()
    # Handle numeric FIPS that lost leading zeros (e.g., 1001 → 01001)
    if fips.replace('.', '').replace('0', '').isdigit() or fips.isdigit():
        fips = fips.split('.')[0]  # Remove decimal if read as float
        fips = fips.zfill(5)
    if len(fips) == 5:
        return fips
    return None


def main():
    # Find the file. Looked for in the current directory, then alongside the
    # repo (../..), which is where the source exports normally live.
    search_dirs = [
        os.getcwd(),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
    ]
    candidates = [EXCEL_FILE, "HRSA_v3.xlsx", "HRSA_V3.xlsx", "hrsa_v3.xlsx",
                  "HRSA_V3.csv", "HRSAV3.xlsx", "HRSA V3.xlsx", "HRSA_v3.csv"]

    excel_file = None
    for d in search_dirs:
        for alt in candidates:
            path = alt if os.path.isabs(alt) else os.path.join(d, alt)
            if os.path.exists(path):
                excel_file = path
                break
        if excel_file:
            break

    if not excel_file:
        print(f"✗ File not found: {EXCEL_FILE}")
        print(f"  Looked in: {', '.join(search_dirs)}")
        print("  Set HRSA_V3_XLSX to its path, or see docs/DATA_PIPELINE.md.")
        sys.exit(1)

    # Read
    print(f"Reading {excel_file}...")
    if excel_file.endswith('.csv'):
        df = pd.read_csv(excel_file)
    else:
        df = pd.read_excel(excel_file, sheet_name=SHEET_NAME, header=HEADER_ROW)

    print(f"  Rows: {len(df):,}")
    print(f"  Columns: {list(df.columns)}")

    # Validate
    required = ['Site Name', 'State', 'Longitude', 'Latitude']
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"✗ Missing columns: {missing}")
        sys.exit(1)

    # Find the FIPS column (name may vary)
    fips_col = None
    for candidate in ['State County FIPS Code', 'FIPS', 'County FIPS', 'FIPS Code',
                       'State County FIPS', 'county_fips']:
        if candidate in df.columns:
            fips_col = candidate
            break
    if not fips_col:
        print("⚠ No FIPS column found — county_fips will be NULL for all rows")
    else:
        print(f"  Using FIPS column: {fips_col}")

    # Prepare rows
    print("Preparing data...")
    rows = []
    skipped = 0

    for _, r in df.iterrows():
        try:
            lng = float(r['Longitude'])
            lat = float(r['Latitude'])
        except (ValueError, TypeError):
            skipped += 1
            continue

        row = (
            str(r['Site Name']).strip() if pd.notna(r['Site Name']) else None,
            str(r.get('Site Category', '')).strip() if pd.notna(r.get('Site Category')) else None,
            str(r['State']).strip().upper() if pd.notna(r['State']) else None,
            str(r.get('City', '')).strip() if pd.notna(r.get('City')) else None,
            parse_fips(r.get(fips_col)) if fips_col else None,
            parse_numeric(r.get('# of Physician FTEs', 0)),
            parse_numeric(r.get('# of Physician Assistant FTEs', 0)),
            parse_int(r.get('# of Beds', 0)),
            parse_boolean(r.get('Is Federally Funded Health Center Site', False)),
            parse_boolean(r.get('Is Hospital-Based Site', False)),
            str(r.get('Type', '')).strip() if pd.notna(r.get('Type')) else None,
            parse_boolean(r.get('Is Rural Health Clinic Site', False)),
            str(r.get('Rural Status', '')).strip() if pd.notna(r.get('Rural Status')) else None,
            lng,
            lat,
            'HRSA',
        )
        rows.append(row)

    if skipped > 0:
        print(f"  Skipped {skipped} rows with invalid coordinates")
    print(f"  Prepared {len(rows):,} rows")

    # Connect and rebuild
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("\nDropping old hrsa_sites and creating v3 table...")
    cursor.execute(DROP_AND_CREATE_SQL)
    conn.commit()
    print("  ✓ Table recreated")

    # Insert
    print(f"\nInserting {len(rows):,} rows...")
    insert_sql = """
        INSERT INTO hrsa_sites (
            site_name, site_category, state, city, county_fips,
            physician_ftes, physician_assistant_ftes, num_beds,
            is_federally_funded_hc, is_hospital_based, site_type,
            is_rural_health_clinic, rural_status,
            longitude, latitude, source
        ) VALUES %s
    """

    total = len(rows)
    inserted = 0
    for i in range(0, total, BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        execute_values(cursor, insert_sql, batch)
        conn.commit()
        inserted += len(batch)
        print(f"  [{inserted:,}/{total:,}] ({(inserted/total)*100:.0f}%)")

    # Verify
    print("\n── Verification ──")
    cursor.execute("SELECT COUNT(*) FROM hrsa_sites")
    print(f"  Total rows: {cursor.fetchone()[0]:,}")

    cursor.execute("SELECT COUNT(*) FROM hrsa_sites WHERE county_fips IS NOT NULL")
    fips_count = cursor.fetchone()[0]
    print(f"  Rows with FIPS: {fips_count:,} ({fips_count/total*100:.1f}%)")

    cursor.execute("""
        SELECT site_category, COUNT(*) FROM hrsa_sites
        WHERE site_category IS NOT NULL GROUP BY site_category ORDER BY COUNT(*) DESC LIMIT 10
    """)
    print("\n  Top site categories:")
    for row in cursor.fetchall():
        print(f"    {row[0]:.<50} {row[1]:>6,}")

    cursor.execute("""
        SELECT rural_status, COUNT(*) FROM hrsa_sites
        WHERE rural_status IS NOT NULL GROUP BY rural_status ORDER BY COUNT(*) DESC
    """)
    print("\n  Rural status distribution:")
    for row in cursor.fetchall():
        print(f"    {row[0]:.<20} {row[1]:>6,}")

    cursor.execute("""
        SELECT COUNT(DISTINCT county_fips) FROM hrsa_sites WHERE county_fips IS NOT NULL
    """)
    print(f"\n  Unique counties with HRSA sites: {cursor.fetchone()[0]:,}")

    cursor.close()
    conn.close()
    print("\n✓ HRSA v3 import complete.")


if __name__ == "__main__":
    main()
