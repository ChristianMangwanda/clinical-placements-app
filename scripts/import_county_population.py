#!/usr/bin/env python3
"""
import_county_population.py — Fetch Census population data and load into Supabase

Tries multiple approaches to get county population data:
1. Direct CSV download from Census Bureau
2. Census API
3. Falls back to manual CSV if provided

Prerequisites:
  pip install pandas psycopg2-binary requests

Usage:
  python import_county_population.py
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import requests
import sys
import os

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit(
        "ERROR: DATABASE_URL environment variable not set.\n"
        "  export DATABASE_URL='postgresql://...'  # see .env.example"
    )

# Census API key (optional, get free at https://api.census.gov/data/key_signup.html)
CENSUS_API_KEY = os.environ.get("CENSUS_API_KEY")

BATCH_SIZE = 500

# State FIPS → abbreviation mapping
STATE_FIPS_TO_ABBR = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
    "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
    "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
    "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
    "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
    "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
    "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
    "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
    "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
    "56": "WY", "72": "PR",
}

CREATE_TABLE_SQL = """
DROP TABLE IF EXISTS county_population CASCADE;

CREATE TABLE county_population (
  id              SERIAL PRIMARY KEY,
  fips            CHAR(5) NOT NULL UNIQUE,
  county_name     TEXT NOT NULL,
  state_fips      CHAR(2) NOT NULL,
  state           CHAR(2) NOT NULL,
  pop_current     INTEGER NOT NULL,
  pop_previous    INTEGER NOT NULL,
  pop_change_pct  NUMERIC(6,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_countypop_fips ON county_population (fips);
CREATE INDEX idx_countypop_state ON county_population (state);
CREATE INDEX idx_countypop_change ON county_population (pop_change_pct);
"""

# The coverage view joins county_population with facility-based HRSA site counts
CREATE_VIEW_SQL = """
DROP VIEW IF EXISTS county_coverage CASCADE;

CREATE VIEW county_coverage AS
SELECT
  cp.fips,
  cp.county_name,
  cp.state_fips,
  cp.state,
  cp.pop_current,
  cp.pop_previous,
  cp.pop_change_pct,
  COUNT(h.id) AS facility_count,
  CASE
    WHEN COUNT(h.id) > 0
    THEN ROUND(cp.pop_current::numeric / COUNT(h.id), 0)
    ELSE NULL
  END AS people_per_facility
FROM county_population cp
LEFT JOIN hrsa_sites h
  ON h.county_fips = cp.fips
  AND h.site_category IN (
    'Hospital',
    'Ambulatory Surgical Center',
    'Comprehensive Outpatient Rehab Facility',
    'Outpatient Physical Therapy/Speech Pathology',
    'Federally Qualified Health Center',
    'Rural Health Clinic',
    'Community Mental Health Center',
    'Skilled Nursing Facility',
    'Skilled Nursing Facilities/Nursing Facility (Distinct Part)',
    'Skilled Nursing Facilities/Nursing Facility (Dually Certified)',
    'Nursing Facility'
  )
GROUP BY cp.fips, cp.county_name, cp.state_fips, cp.state,
         cp.pop_current, cp.pop_previous, cp.pop_change_pct;
"""

# Also add layer entries
ADD_LAYERS_SQL = """
-- Remove old entries if re-running
DELETE FROM layers WHERE layer_key IN ('pop_change', 'coverage_ratio');

INSERT INTO layers (layer_key, display_name, table_name, description, icon, color, default_visible, sort_order)
VALUES
  ('pop_change', 'Population Change', 'county_population',
   'County-level population growth or decline. Green = growing, red = shrinking.',
   'trending-up', '#27AE60', false, 7),
  ('coverage_ratio', 'Healthcare Coverage', 'county_population',
   'People per facility-based HRSA site by county. Red = underserved, green = well-covered.',
   'activity', '#E74C3C', false, 8);
"""


def fetch_census_csv():
    """Try to download the Census Bureau population estimates CSV directly."""
    # Try multiple URLs — Census moves files around
    urls = [
        "https://www2.census.gov/programs-surveys/popest/datasets/2020-2023/counties/totals/co-est2023-alldata.csv",
        "https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv",
    ]

    for url in urls:
        print(f"  Trying: {url}")
        try:
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                # Save locally
                filename = url.split("/")[-1]
                with open(filename, 'wb') as f:
                    f.write(response.content)
                print(f"  ✓ Downloaded {filename}")
                return filename
        except Exception as e:
            print(f"  ✗ Failed: {e}")

    return None


def fetch_census_api():
    """Try the Census API for population data."""
    # Try different year endpoints
    years = [
        ("2023", "POP_2023", "POP_2020"),
        ("2022", "POP_2022", "POP_2020"),
    ]

    for year, current_var, previous_var in years:
        url = f"https://api.census.gov/data/{year}/pep/population"
        params = {
            "get": f"{current_var},{previous_var},NAME",
            "for": "county:*",
        }
        if CENSUS_API_KEY:
            params["key"] = CENSUS_API_KEY

        print(f"  Trying Census API for {year}...")
        try:
            response = requests.get(url, params=params, timeout=30)
            if response.status_code == 200:
                data = response.json()
                # First row is headers, rest is data
                headers = data[0]
                rows = data[1:]
                df = pd.DataFrame(rows, columns=headers)
                print(f"  ✓ Got {len(df)} rows from Census API ({year})")
                return df, current_var, previous_var
        except Exception as e:
            print(f"  ✗ Failed: {e}")

    return None, None, None


def parse_census_csv(filename):
    """Parse the Census Bureau alldata CSV format."""
    df = pd.read_csv(filename, encoding='latin-1')

    # The CSV has STATE and COUNTY FIPS as separate columns
    # SUMLEV 50 = county level (skip state summaries which are SUMLEV 40)
    df = df[df['SUMLEV'] == 50].copy()

    # Build 5-digit FIPS
    df['fips'] = df['STATE'].astype(str).str.zfill(2) + df['COUNTY'].astype(str).str.zfill(3)
    df['state_fips'] = df['STATE'].astype(str).str.zfill(2)
    df['state'] = df['state_fips'].map(STATE_FIPS_TO_ABBR)

    # Find the most recent and a comparison population column
    # Columns are typically: POPESTIMATE2020, POPESTIMATE2021, POPESTIMATE2022, POPESTIMATE2023
    pop_cols = [c for c in df.columns if c.startswith('POPESTIMATE')]
    pop_cols.sort()

    if len(pop_cols) >= 2:
        current_col = pop_cols[-1]   # Most recent
        previous_col = pop_cols[-2]  # Previous year
        print(f"  Using {current_col} (current) vs {previous_col} (previous)")
    else:
        print(f"✗ Cannot find population estimate columns. Found: {pop_cols}")
        sys.exit(1)

    result = pd.DataFrame({
        'fips': df['fips'],
        'county_name': df['CTYNAME'],
        'state_fips': df['state_fips'],
        'state': df['state'],
        'pop_current': pd.to_numeric(df[current_col], errors='coerce').fillna(0).astype(int),
        'pop_previous': pd.to_numeric(df[previous_col], errors='coerce').fillna(0).astype(int),
    })

    # Calculate change percentage
    result['pop_change_pct'] = result.apply(
        lambda r: round(((r['pop_current'] - r['pop_previous']) / r['pop_previous']) * 100, 2)
        if r['pop_previous'] > 0 else 0, axis=1
    )

    return result


def parse_census_api_data(df, current_var, previous_var):
    """Parse data from the Census API response."""
    # API returns 'state' and 'county' as separate FIPS components
    df['fips'] = df['state'].str.zfill(2) + df['county'].str.zfill(3)
    df['state_fips'] = df['state'].str.zfill(2)
    df['state_abbr'] = df['state_fips'].map(STATE_FIPS_TO_ABBR)

    result = pd.DataFrame({
        'fips': df['fips'],
        'county_name': df['NAME'],
        'state_fips': df['state_fips'],
        'state': df['state_abbr'],
        'pop_current': pd.to_numeric(df[current_var], errors='coerce').fillna(0).astype(int),
        'pop_previous': pd.to_numeric(df[previous_var], errors='coerce').fillna(0).astype(int),
    })

    result['pop_change_pct'] = result.apply(
        lambda r: round(((r['pop_current'] - r['pop_previous']) / r['pop_previous']) * 100, 2)
        if r['pop_previous'] > 0 else 0, axis=1
    )

    return result


def main():
    print("=== County Population Import ===\n")

    # Step 1: Get the data
    print("Step 1: Fetching Census population data...")
    pop_df = None

    # Try CSV download first (most reliable, richest data)
    csv_file = fetch_census_csv()
    if csv_file:
        pop_df = parse_census_csv(csv_file)
    else:
        # Fall back to API
        api_df, current_var, previous_var = fetch_census_api()
        if api_df is not None:
            pop_df = parse_census_api_data(api_df, current_var, previous_var)

    if pop_df is None:
        print("\n✗ Could not fetch Census data automatically.")
        print("  Please download the county population CSV manually from:")
        print("  https://www.census.gov/data/datasets/time-series/demo/popest/2020s-counties-total.html")
        print("  Save it in this directory and re-run.")
        sys.exit(1)

    # Filter out rows with no state mapping
    pop_df = pop_df.dropna(subset=['state'])
    print(f"\n  Total counties: {len(pop_df):,}")
    print(f"  States covered: {pop_df['state'].nunique()}")
    print(f"  Growing counties: {(pop_df['pop_change_pct'] > 0).sum():,}")
    print(f"  Declining counties: {(pop_df['pop_change_pct'] < 0).sum():,}")

    # Step 2: Upload to Supabase
    print("\nStep 2: Creating county_population table...")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    cursor.execute(CREATE_TABLE_SQL)
    conn.commit()
    print("  ✓ Table created")

    # Insert
    print(f"\nStep 3: Inserting {len(pop_df):,} rows...")
    insert_sql = """
        INSERT INTO county_population (fips, county_name, state_fips, state,
                                       pop_current, pop_previous, pop_change_pct)
        VALUES %s
        ON CONFLICT (fips) DO UPDATE SET
            pop_current = EXCLUDED.pop_current,
            pop_previous = EXCLUDED.pop_previous,
            pop_change_pct = EXCLUDED.pop_change_pct
    """

    rows = list(pop_df[['fips', 'county_name', 'state_fips', 'state',
                         'pop_current', 'pop_previous', 'pop_change_pct']].itertuples(index=False, name=None))

    total = len(rows)
    inserted = 0
    for i in range(0, total, BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        execute_values(cursor, insert_sql, batch)
        conn.commit()
        inserted += len(batch)
        print(f"  [{inserted:,}/{total:,}] ({(inserted/total)*100:.0f}%)")

    # Step 4: Create the coverage view
    print("\nStep 4: Creating county_coverage view...")
    cursor.execute(CREATE_VIEW_SQL)
    conn.commit()
    print("  ✓ View created")

    # Step 5: Add layer entries
    print("\nStep 5: Adding layer entries...")
    try:
        cursor.execute(ADD_LAYERS_SQL)
        conn.commit()
        print("  ✓ Layers added")
    except Exception as e:
        conn.rollback()
        print(f"  ⚠ Layer insert issue (may already exist): {e}")

    # Step 6: Verify
    print("\n── Verification ──")

    cursor.execute("SELECT COUNT(*) FROM county_population")
    print(f"  Counties in table: {cursor.fetchone()[0]:,}")

    cursor.execute("""
        SELECT state, COUNT(*), SUM(pop_current), ROUND(AVG(pop_change_pct), 2)
        FROM county_population
        GROUP BY state ORDER BY SUM(pop_current) DESC LIMIT 10
    """)
    print("\n  Top 10 states by total population:")
    for row in cursor.fetchall():
        print(f"    {row[0]}: {row[1]} counties, {row[2]:,} people, avg change {row[3]}%")

    # Test the coverage view
    cursor.execute("""
        SELECT COUNT(*) FROM county_coverage
    """)
    print(f"\n  Coverage view rows: {cursor.fetchone()[0]:,}")

    cursor.execute("""
        SELECT county_name, state, pop_current, facility_count, people_per_facility
        FROM county_coverage
        WHERE people_per_facility IS NOT NULL
        ORDER BY people_per_facility DESC
        LIMIT 5
    """)
    print("\n  Most underserved counties (highest people-per-facility):")
    for row in cursor.fetchall():
        print(f"    {row[0]}, {row[1]}: {row[2]:,} people, {row[3]} facilities, {row[4]:,.0f} per facility")

    cursor.execute("""
        SELECT COUNT(*) FROM county_coverage WHERE facility_count = 0
    """)
    print(f"\n  Counties with ZERO facility-based HRSA sites: {cursor.fetchone()[0]:,}")

    cursor.close()
    conn.close()
    print("\n✓ County population import complete.")


if __name__ == "__main__":
    main()
