"""
Import geocoded active sites data into Supabase.
Creates the active_sites table and adds layer metadata.
"""

import os
import sys
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / "active_sites_geocoded.csv"


def get_db_connection():
    """Get database connection from DATABASE_URL environment variable."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        sys.exit("ERROR: DATABASE_URL environment variable not set.")
    return psycopg2.connect(database_url)


def create_table(conn):
    """Create the active_sites table."""
    create_sql = """
    DROP TABLE IF EXISTS active_sites CASCADE;

    CREATE TABLE active_sites (
        id              SERIAL PRIMARY KEY,
        site_name       TEXT NOT NULL,
        address         TEXT,
        city            TEXT,
        state           TEXT,
        programs        TEXT,
        has_ot          BOOLEAN DEFAULT FALSE,
        has_pt          BOOLEAN DEFAULT FALSE,
        has_pa          BOOLEAN DEFAULT FALSE,
        longitude       NUMERIC(11,7) NOT NULL,
        latitude        NUMERIC(10,7) NOT NULL,
        source          TEXT NOT NULL DEFAULT 'Exxat Active Sites',
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_active_state ON active_sites (state);
    CREATE INDEX idx_active_coords ON active_sites (latitude, longitude);
    CREATE INDEX idx_active_name ON active_sites (site_name);
    CREATE INDEX idx_active_programs ON active_sites (has_ot, has_pt, has_pa);
    """
    with conn.cursor() as cur:
        cur.execute(create_sql)
    conn.commit()
    print("Created active_sites table with indexes.")


def insert_data(conn, df):
    """Batch insert data into active_sites table."""
    columns = [
        "site_name", "address", "city", "state", "programs",
        "has_ot", "has_pt", "has_pa", "longitude", "latitude"
    ]

    # Prepare data tuples
    data = []
    for _, row in df.iterrows():
        data.append((
            row["site_name"],
            row["address"],
            row["city"],
            row["state"],
            row["programs"],
            bool(row["has_ot"]),
            bool(row["has_pt"]),
            bool(row["has_pa"]),
            float(row["longitude"]),
            float(row["latitude"])
        ))

    insert_sql = """
    INSERT INTO active_sites (site_name, address, city, state, programs, has_ot, has_pt, has_pa, longitude, latitude)
    VALUES %s
    """

    with conn.cursor() as cur:
        execute_values(cur, insert_sql, data, page_size=100)
    conn.commit()
    print(f"Inserted {len(data)} rows into active_sites.")


def add_layer_metadata(conn):
    """Add entry to layers table for active_sites."""
    # Check if layers table exists
    check_sql = """
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'layers'
    );
    """

    with conn.cursor() as cur:
        cur.execute(check_sql)
        exists = cur.fetchone()[0]

        if not exists:
            print("Warning: layers table does not exist. Skipping layer metadata.")
            return

        # Delete existing entry if present
        cur.execute("DELETE FROM layers WHERE layer_key = 'active_sites'")

        # Insert new entry
        insert_sql = """
        INSERT INTO layers (layer_key, display_name, table_name, description, icon, color, default_visible, sort_order)
        VALUES (
            'active_sites',
            'Active Clarkson Sites',
            'active_sites',
            'Current active clinical placement sites used by Clarkson University programs',
            'star',
            '#9B59B6',
            true,
            0
        );
        """
        cur.execute(insert_sql)
    conn.commit()
    print("Added active_sites to layers table.")


def verify_import(conn):
    """Print verification summary."""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM active_sites")
        total = cur.fetchone()[0]

        cur.execute("SELECT COUNT(DISTINCT state) FROM active_sites")
        states = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM active_sites WHERE has_ot = TRUE")
        ot_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM active_sites WHERE has_pt = TRUE")
        pt_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM active_sites WHERE has_pa = TRUE")
        pa_count = cur.fetchone()[0]

    print("\n=== Verification ===")
    print(f"Total rows in active_sites: {total}")
    print(f"Unique states: {states}")
    print(f"Sites with OT: {ot_count}")
    print(f"Sites with PT: {pt_count}")
    print(f"Sites with PA: {pa_count}")


def main():
    print(f"Reading: {INPUT_FILE}")
    df = pd.read_csv(INPUT_FILE)
    print(f"Total rows: {len(df)}")

    # Filter to rows with coordinates
    df = df[df["latitude"].notna() & df["longitude"].notna()]
    print(f"Rows with coordinates: {len(df)}")

    if len(df) == 0:
        sys.exit("ERROR: No rows with coordinates found.")

    conn = get_db_connection()

    try:
        create_table(conn)
        insert_data(conn, df)
        add_layer_metadata(conn)
        verify_import(conn)
        print("\nImport complete!")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
