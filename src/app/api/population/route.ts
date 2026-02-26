import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface CountyData {
  fips: string;
  county_name: string;
  state: string;
  pop_current: number;
  pop_previous: number;
  pop_change_pct: number;
  facility_count: number;
  people_per_facility: number | null;
}

export async function GET() {
  try {
    const counties = await query<CountyData>(`
      SELECT
        fips,
        county_name,
        state,
        pop_current,
        pop_previous,
        pop_change_pct,
        facility_count,
        people_per_facility
      FROM county_coverage
      ORDER BY state, county_name
    `);

    return NextResponse.json({
      success: true,
      data: counties,
    });
  } catch (error) {
    console.error("Error fetching population data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch population data",
      },
      { status: 500 }
    );
  }
}
