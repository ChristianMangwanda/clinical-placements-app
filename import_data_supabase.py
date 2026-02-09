#!/usr/bin/env python3
"""
Import data from TRIAL_2.xlsx into Supabase PostgreSQL database.

Usage:
    1. Set DATABASE_URL environment variable with Supabase connection string
    2. Run: python import_data_supabase.py

Dependencies:
    pip install psycopg2-binary pandas openpyxl
"""

import os
import sys
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# Supabase connection configuration
# You can use either DATABASE_URL or explicit parameters
DATABASE_URL = os.environ.get('DATABASE_URL')

# Explicit connection parameters (fallback if DATABASE_URL doesn't work)
DB_CONFIG = {
    'host': 'aws-0-us-west-2.pooler.supabase.com',
    'port': 6543,
    'database': 'postgres',
    'user': 'postgres.cmvhimireghzpyzxzyjs',
    'password': '8WYrP30ck9k6Vmw3',
    'sslmode': 'require'
}

# Path to Excel file
EXCEL_FILE = os.path.join(os.path.dirname(__file__), '..', 'TRIAL_2.xlsx')
if not os.path.exists(EXCEL_FILE):
    EXCEL_FILE = os.path.join(os.path.dirname(__file__), 'TRIAL_2.xlsx')
if not os.path.exists(EXCEL_FILE):
    EXCEL_FILE = '/Users/christianmangwanda/Desktop/Php/TRIAL_2.xlsx'

def get_connection():
    """Create database connection."""
    # Try explicit parameters first (more reliable)
    try:
        print(f"  Trying pooler connection: {DB_CONFIG['host']}:{DB_CONFIG['port']}...")
        return psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        print(f"  Pooler connection failed: {e}")
        if DATABASE_URL:
            print(f"  Trying DATABASE_URL...")
            return psycopg2.connect(DATABASE_URL)
        raise

def clean_value(val):
    """Clean a value for database insertion."""
    if pd.isna(val) or val == '' or val == 'nan':
        return None
    if isinstance(val, str):
        return val.strip()
    return val

def import_hrsa_sites(conn, df):
    """Import HRSA sites data."""
    print(f"Importing {len(df)} HRSA sites...")

    cursor = conn.cursor()

    # Prepare data
    data = []
    for _, row in df.iterrows():
        data.append((
            clean_value(row.get('site_name', row.get('Site Name', row.get('name', None)))),
            clean_value(row.get('state', row.get('State', None))),
            clean_value(row.get('longitude', row.get('Longitude', None))),
            clean_value(row.get('latitude', row.get('Latitude', None))),
            'HRSA'
        ))

    # Batch insert
    sql = """
        INSERT INTO hrsa_sites (site_name, state, longitude, latitude, source)
        VALUES %s
    """
    execute_values(cursor, sql, data, page_size=1000)
    conn.commit()

    # Verify
    cursor.execute("SELECT COUNT(*) FROM hrsa_sites")
    count = cursor.fetchone()[0]
    print(f"  Inserted {count} HRSA sites")
    cursor.close()

def import_schools(conn, df):
    """Import schools data."""
    print(f"Importing {len(df)} schools...")

    cursor = conn.cursor()

    data = []
    for _, row in df.iterrows():
        profession = clean_value(row.get('profession', row.get('Profession', row.get('PROFESSION', None))))
        if profession:
            profession = profession.upper()[:2]  # Normalize to PT, OT, or PA
            if profession not in ('PT', 'OT', 'PA'):
                profession = 'PT'  # Default fallback

        data.append((
            clean_value(row.get('program_row_id', row.get('Program Row ID', None))),
            clean_value(row.get('institution_name', row.get('Institution Name', row.get('INSTITUTION', None)))),
            clean_value(row.get('campus_name', row.get('Campus Name', row.get('CAMPUS', None)))),
            clean_value(row.get('state', row.get('State', row.get('STATE', None)))),
            profession,
            clean_value(row.get('program_name', row.get('Program Name', row.get('PROGRAM', None)))),
            clean_value(row.get('accreditation_body', row.get('Accreditation Body', None))),
            clean_value(row.get('accreditation_status', row.get('Accreditation Status', row.get('STATUS', None)))),
            clean_value(row.get('address', row.get('Address', row.get('ADDRESS', None)))),
            clean_value(row.get('longitude', row.get('Longitude', row.get('LONGITUDE', None)))),
            clean_value(row.get('latitude', row.get('Latitude', row.get('LATITUDE', None)))),
            'Schools'
        ))

    sql = """
        INSERT INTO schools (program_row_id, institution_name, campus_name, state, profession,
                           program_name, accreditation_body, accreditation_status, address,
                           longitude, latitude, source)
        VALUES %s
    """
    execute_values(cursor, sql, data, page_size=500)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM schools")
    count = cursor.fetchone()[0]
    print(f"  Inserted {count} schools")
    cursor.close()

def import_post_secondary_schools(conn, df):
    """Import post-secondary schools data."""
    print(f"Importing {len(df)} post-secondary schools...")

    cursor = conn.cursor()

    data = []
    for _, row in df.iterrows():
        data.append((
            clean_value(row.get('original_id', row.get('ID', row.get('id', None)))),
            clean_value(row.get('institution_name', row.get('Institution Name', row.get('NAME', row.get('name', None))))),
            clean_value(row.get('state', row.get('State', row.get('STATE', None)))),
            clean_value(row.get('latitude', row.get('Latitude', row.get('LATITUDE', None)))),
            clean_value(row.get('longitude', row.get('Longitude', row.get('LONGITUDE', None)))),
            'Post Secondary'
        ))

    sql = """
        INSERT INTO post_secondary_schools (original_id, institution_name, state, latitude, longitude, source)
        VALUES %s
    """
    execute_values(cursor, sql, data, page_size=1000)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM post_secondary_schools")
    count = cursor.fetchone()[0]
    print(f"  Inserted {count} post-secondary schools")
    cursor.close()

def import_military_sites(conn, df):
    """Import military sites data."""
    print(f"Importing {len(df)} military sites...")

    cursor = conn.cursor()

    data = []
    for _, row in df.iterrows():
        data.append((
            clean_value(row.get('name', row.get('Name', row.get('NAME', row.get('site_name', None))))),
            clean_value(row.get('state', row.get('State', row.get('STATE', None)))),
            clean_value(row.get('component', row.get('Component', row.get('COMPONENT', None)))),
            clean_value(row.get('longitude', row.get('Longitude', row.get('LONGITUDE', None)))),
            clean_value(row.get('latitude', row.get('Latitude', row.get('LATITUDE', None)))),
            'Military'
        ))

    sql = """
        INSERT INTO military_sites (name, state, component, longitude, latitude, source)
        VALUES %s
    """
    execute_values(cursor, sql, data, page_size=500)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM military_sites")
    count = cursor.fetchone()[0]
    print(f"  Inserted {count} military sites")
    cursor.close()

def import_native_american_reserves(conn, df):
    """Import Native American reserves data."""
    print(f"Importing {len(df)} Native American reserves...")

    cursor = conn.cursor()

    data = []
    for _, row in df.iterrows():
        data.append((
            clean_value(row.get('name', row.get('Name', row.get('NAME', None)))),
            clean_value(row.get('state', row.get('State', row.get('STATE', None)))),
            clean_value(row.get('latitude', row.get('Latitude', row.get('LATITUDE', None)))),
            clean_value(row.get('longitude', row.get('Longitude', row.get('LONGITUDE', None)))),
            'Native American Reserves'
        ))

    sql = """
        INSERT INTO native_american_reserves (name, state, latitude, longitude, source)
        VALUES %s
    """
    execute_values(cursor, sql, data, page_size=500)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM native_american_reserves")
    count = cursor.fetchone()[0]
    print(f"  Inserted {count} Native American reserves")
    cursor.close()

def main():
    print("=" * 60)
    print("Clinical Placements Database - Supabase Import")
    print("=" * 60)

    # Check Excel file exists
    if not os.path.exists(EXCEL_FILE):
        print(f"Error: Excel file not found at {EXCEL_FILE}")
        sys.exit(1)

    print(f"\nReading Excel file: {EXCEL_FILE}")

    # Read all sheets
    excel = pd.ExcelFile(EXCEL_FILE)
    print(f"Found sheets: {excel.sheet_names}")

    # Connect to database
    print("\nConnecting to Supabase...")
    conn = get_connection()
    print("Connected successfully!")

    try:
        # Clear existing data (optional - comment out if you want to append)
        print("\nClearing existing data...")
        cursor = conn.cursor()
        cursor.execute("TRUNCATE hrsa_sites, schools, post_secondary_schools, military_sites, native_american_reserves RESTART IDENTITY")
        conn.commit()
        cursor.close()

        # Import each table
        print("\n" + "-" * 40)

        # HRSA Sites
        if 'HRSA' in excel.sheet_names:
            df = pd.read_excel(EXCEL_FILE, sheet_name='HRSA')
            import_hrsa_sites(conn, df)

        # Schools
        if 'Schools' in excel.sheet_names:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Schools')
            import_schools(conn, df)

        # Post Secondary Schools
        if 'Post Secondary Schools' in excel.sheet_names:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Post Secondary Schools')
            import_post_secondary_schools(conn, df)

        # Military Sites (note: trailing space in sheet name)
        military_sheet = None
        for sheet in excel.sheet_names:
            if 'Military' in sheet:
                military_sheet = sheet
                break
        if military_sheet:
            df = pd.read_excel(EXCEL_FILE, sheet_name=military_sheet)
            import_military_sites(conn, df)

        # Native American Reserves
        if 'Native American Reserves' in excel.sheet_names:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Native American Reserves')
            import_native_american_reserves(conn, df)

        # Final verification
        print("\n" + "=" * 60)
        print("VERIFICATION - Final row counts:")
        print("=" * 60)
        cursor = conn.cursor()

        tables = [
            ('layers', 5),
            ('hrsa_sites', 81477),
            ('schools', 858),
            ('post_secondary_schools', 6812),
            ('military_sites', 824),
            ('native_american_reserves', 693),
            ('notes', 0)
        ]

        for table, expected in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            status = "✓" if count >= expected * 0.9 else "✗"  # Allow 10% variance
            print(f"  {status} {table}: {count} rows (expected ~{expected})")

        cursor.close()
        print("\n" + "=" * 60)
        print("Import complete!")
        print("=" * 60)

    except Exception as e:
        print(f"\nError during import: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    main()
