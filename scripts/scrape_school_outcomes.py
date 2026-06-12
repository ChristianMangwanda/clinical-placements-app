#!/usr/bin/env python3
"""
Scrape school outcome data from accreditation bodies.

Data Sources:
- PT Programs: CAPTE (Commission on Accreditation in Physical Therapy Education)
- OT Programs: ACOTE (Accreditation Council for Occupational Therapy Education)
- PA Programs: ARC-PA (Accreditation Review Commission on Education for the Physician Assistant)

Usage:
    python scrape_school_outcomes.py

Requirements:
    pip install requests beautifulsoup4 pandas psycopg2-binary python-dotenv
"""

import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup
import pandas as pd
from dotenv import load_dotenv
import psycopg2
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

# Supabase connection
DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('SUPABASE_DB_URL')

# Request headers to avoid blocking
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

# Rate limiting
REQUEST_DELAY = 1  # seconds between requests


def get_db_connection():
    """Create database connection."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL not set. Add it to .env file.")
    return psycopg2.connect(DATABASE_URL)


def fetch_page(url, max_retries=3):
    """Fetch a web page with retries."""
    for attempt in range(max_retries):
        try:
            time.sleep(REQUEST_DELAY)
            response = requests.get(url, headers=HEADERS, timeout=30)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            print(f"  Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                raise
    return None


# =============================================================================
# CAPTE (PT Programs) Scraper
# =============================================================================

def scrape_capte_programs():
    """
    Scrape PT program data from CAPTE.

    CAPTE publishes program data at:
    https://www.capteonline.org/programs

    They also publish aggregate outcomes data annually.
    """
    print("\n" + "=" * 60)
    print("Scraping CAPTE (PT Programs)...")
    print("=" * 60)

    programs = []

    # CAPTE has a searchable database - we'll need to use their API or scrape pages
    # The public data includes graduation rates and licensure pass rates

    # Option 1: CAPTE Accreditation Portal API (if available)
    # Option 2: Scrape the program finder pages

    # CAPTE publishes aggregate data in PDF reports
    # Individual program data may require scraping program detail pages

    base_url = "https://www.capteonline.org"
    search_url = f"{base_url}/programs"

    try:
        response = fetch_page(search_url)
        if response:
            soup = BeautifulSoup(response.text, 'html.parser')

            # Look for program listings or data tables
            # Note: CAPTE may use JavaScript to load data, requiring Selenium

            print(f"  Fetched CAPTE page: {response.status_code}")

            # Parse program cards/rows
            # This will need to be adjusted based on actual page structure
            program_elements = soup.find_all('div', class_='program-card') or \
                              soup.find_all('tr', class_='program-row')

            print(f"  Found {len(program_elements)} program elements")

            # If the page uses JavaScript, we might need to use their API directly
            # Let's check for any data endpoints
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and 'api' in script.string.lower():
                    print("  Found potential API reference in script")

    except Exception as e:
        print(f"  Error scraping CAPTE: {e}")

    return programs


# =============================================================================
# ACOTE (OT Programs) Scraper
# =============================================================================

def scrape_acote_programs():
    """
    Scrape OT program data from ACOTE.

    ACOTE directory: https://acoteonline.org/schools/
    """
    print("\n" + "=" * 60)
    print("Scraping ACOTE (OT Programs)...")
    print("=" * 60)

    programs = []

    base_url = "https://acoteonline.org"
    directory_url = f"{base_url}/schools/"

    try:
        response = fetch_page(directory_url)
        if response:
            soup = BeautifulSoup(response.text, 'html.parser')
            print(f"  Fetched ACOTE page: {response.status_code}")

            # Look for program tables or listings
            tables = soup.find_all('table')
            print(f"  Found {len(tables)} tables")

            # Parse program data from tables
            for table in tables:
                rows = table.find_all('tr')
                for row in rows[1:]:  # Skip header
                    cells = row.find_all('td')
                    if len(cells) >= 3:
                        program = {
                            'institution': cells[0].get_text(strip=True),
                            'state': cells[1].get_text(strip=True) if len(cells) > 1 else None,
                            'program_type': cells[2].get_text(strip=True) if len(cells) > 2 else None,
                        }
                        programs.append(program)

            print(f"  Parsed {len(programs)} programs from tables")

    except Exception as e:
        print(f"  Error scraping ACOTE: {e}")

    return programs


# =============================================================================
# ARC-PA (PA Programs) Scraper
# =============================================================================

def scrape_arcpa_programs():
    """
    Scrape PA program data from ARC-PA.

    ARC-PA program directory: https://www.arc-pa.org/entry-level-program/currently-accredited-programs/

    ARC-PA publishes outcome data including:
    - First-time PANCE pass rates
    - Graduation rates
    - Attrition rates
    """
    print("\n" + "=" * 60)
    print("Scraping ARC-PA (PA Programs)...")
    print("=" * 60)

    programs = []

    # ARC-PA has a publicly accessible program directory
    base_url = "https://www.arc-pa.org"
    directory_url = f"{base_url}/entry-level-program/currently-accredited-programs/"

    try:
        response = fetch_page(directory_url)
        if response:
            soup = BeautifulSoup(response.text, 'html.parser')
            print(f"  Fetched ARC-PA page: {response.status_code}")

            # ARC-PA typically lists programs in a table or list format
            # Each program links to a detail page with outcome data

            # Find program links
            program_links = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                if '/wp-content/' not in href and 'program' in href.lower():
                    program_links.append(href)

            print(f"  Found {len(program_links)} potential program links")

            # Parse any tables on the page
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows[1:]:
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        program = {
                            'institution': cells[0].get_text(strip=True),
                            'state': cells[1].get_text(strip=True) if len(cells) > 1 else None,
                        }

                        # Look for links to detail pages
                        detail_link = cells[0].find('a')
                        if detail_link and detail_link.get('href'):
                            program['detail_url'] = detail_link['href']

                        programs.append(program)

            print(f"  Parsed {len(programs)} programs")

    except Exception as e:
        print(f"  Error scraping ARC-PA: {e}")

    return programs


# =============================================================================
# NCCPA PANCE Pass Rate Data (for PA programs)
# =============================================================================

def scrape_pance_pass_rates():
    """
    Scrape PANCE (Physician Assistant National Certifying Exam) pass rates.

    NCCPA publishes pass rate data: https://www.nccpa.net/research/
    """
    print("\n" + "=" * 60)
    print("Fetching PANCE Pass Rate Data...")
    print("=" * 60)

    pass_rates = {}

    # NCCPA publishes aggregate and program-level data
    # This data is often in PDF or requires authentication

    try:
        url = "https://www.nccpa.net/research/"
        response = fetch_page(url)
        if response:
            print(f"  Fetched NCCPA research page: {response.status_code}")
            # Parse for downloadable data files or embedded data

    except Exception as e:
        print(f"  Error fetching PANCE data: {e}")

    return pass_rates


# =============================================================================
# Update Database
# =============================================================================

def update_school_outcomes(conn, scraped_data):
    """Update schools table with scraped outcome data."""
    print("\n" + "=" * 60)
    print("Updating database with scraped data...")
    print("=" * 60)

    cursor = conn.cursor()

    updated_count = 0

    for program in scraped_data:
        # Match by institution name (fuzzy matching would be better)
        institution = program.get('institution', '')

        if not institution:
            continue

        # Build update query
        update_fields = []
        values = []

        if program.get('graduation_rate'):
            update_fields.append('graduation_rate = %s')
            values.append(program['graduation_rate'])

        if program.get('licensure_pass_rate'):
            update_fields.append('licensure_pass_rate = %s')
            values.append(program['licensure_pass_rate'])

        if program.get('employment_rate'):
            update_fields.append('employment_rate = %s')
            values.append(program['employment_rate'])

        if program.get('website_url'):
            update_fields.append('website_url = %s')
            values.append(program['website_url'])

        if program.get('phone'):
            update_fields.append('phone = %s')
            values.append(program['phone'])

        if program.get('email'):
            update_fields.append('email = %s')
            values.append(program['email'])

        if update_fields and values:
            # Use fuzzy matching with ILIKE
            sql = f"""
                UPDATE schools
                SET {', '.join(update_fields)}
                WHERE LOWER(institution_name) LIKE LOWER(%s)
            """
            values.append(f'%{institution}%')

            try:
                cursor.execute(sql, values)
                if cursor.rowcount > 0:
                    updated_count += cursor.rowcount
            except Exception as e:
                print(f"  Error updating {institution}: {e}")

    conn.commit()
    cursor.close()

    print(f"  Updated {updated_count} school records")
    return updated_count


def get_existing_schools(conn):
    """Get list of existing schools from database."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, institution_name, campus_name, state, profession
        FROM schools
        ORDER BY institution_name
    """)
    schools = cursor.fetchall()
    cursor.close()

    return [
        {
            'id': row[0],
            'institution_name': row[1],
            'campus_name': row[2],
            'state': row[3],
            'profession': row[4],
        }
        for row in schools
    ]


# =============================================================================
# Manual CSV Import (Alternative approach)
# =============================================================================

def import_from_csv(csv_path):
    """
    Import school outcome data from a CSV file.

    Expected columns:
    - institution_name (required, for matching)
    - state (optional, helps with matching)
    - profession (optional, PT/OT/PA)
    - graduation_rate (0-100)
    - licensure_pass_rate (0-100)
    - employment_rate (0-100)
    - website_url
    - phone
    - email
    - degree_type
    - program_length_months
    - class_size
    - tuition_resident
    - tuition_nonresident
    """
    print(f"\nImporting from CSV: {csv_path}")

    if not os.path.exists(csv_path):
        print(f"  File not found: {csv_path}")
        return []

    df = pd.read_csv(csv_path)
    print(f"  Loaded {len(df)} rows")

    return df.to_dict('records')


# =============================================================================
# Main
# =============================================================================

def main():
    print("\n" + "=" * 60)
    print("School Outcomes Data Scraper")
    print("=" * 60)

    # Check for CSV import first (easier approach)
    csv_path = os.path.join(os.path.dirname(__file__), 'school_outcomes.csv')
    if os.path.exists(csv_path):
        print("\nFound school_outcomes.csv - using CSV import instead of scraping")
        scraped_data = import_from_csv(csv_path)
    else:
        # Scrape from accreditation body websites
        all_programs = []

        # Scrape each source
        pt_programs = scrape_capte_programs()
        all_programs.extend(pt_programs)

        ot_programs = scrape_acote_programs()
        all_programs.extend(ot_programs)

        pa_programs = scrape_arcpa_programs()
        all_programs.extend(pa_programs)

        # Also try to get pass rate data
        pance_data = scrape_pance_pass_rates()

        scraped_data = all_programs

        print(f"\n  Total programs scraped: {len(scraped_data)}")

    # Connect to database
    if DATABASE_URL:
        try:
            conn = get_db_connection()

            # Show existing schools
            schools = get_existing_schools(conn)
            print(f"\n  Existing schools in database: {len(schools)}")

            # Update with scraped data
            if scraped_data:
                update_school_outcomes(conn, scraped_data)

            conn.close()

        except Exception as e:
            print(f"\nDatabase error: {e}")
            print("Make sure DATABASE_URL is set in .env")
    else:
        print("\nNo DATABASE_URL set - skipping database update")
        print("Scraped data preview:")
        for program in scraped_data[:5]:
            print(f"  - {program}")

    # Save scraped data to JSON for review
    output_path = os.path.join(os.path.dirname(__file__), 'scraped_programs.json')
    with open(output_path, 'w') as f:
        json.dump(scraped_data, f, indent=2)
    print(f"\nSaved scraped data to: {output_path}")

    print("\n" + "=" * 60)
    print("NEXT STEPS:")
    print("=" * 60)
    print("""
1. The accreditation body websites may require JavaScript rendering.
   If the scraper doesn't find data, try using Selenium or Playwright.

2. Alternatively, create a CSV file with the data manually:
   - Save as: scripts/school_outcomes.csv
   - Columns: institution_name, state, profession, graduation_rate,
              licensure_pass_rate, employment_rate, website_url, phone, email

3. Re-run this script to import from CSV.

4. Data sources for manual collection:
   - CAPTE: https://www.capteonline.org/about-capte/find-a-pt-or-pta-program
   - ACOTE: https://acoteonline.org/all-programs/
   - ARC-PA: http://www.arc-pa.org/accreditation/accredited-programs/
   - FSBPT (PT pass rates): https://www.fsbpt.org/
   - NBCOT (OT pass rates): https://www.nbcot.org/
   - NCCPA (PA pass rates): https://www.nccpa.net/research/
""")


if __name__ == '__main__':
    main()
