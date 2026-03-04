import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface StateEconomicData {
  state_fips: string;
  state: string;
  state_name: string;
  gdp_current: number | null;
  gdp_previous: number | null;
  gdp_change_pct: number | null;
  gdp_year: number | null;
  healthcare_employment: number | null;
  total_employment: number | null;
  healthcare_share_pct: number | null;
  avg_healthcare_weekly_wage: number | null;
  employment_year: number | null;
}

export async function GET() {
  try {
    const states = await query<StateEconomicData>(`
      SELECT
        state_fips,
        state,
        state_name,
        gdp_current,
        gdp_previous,
        gdp_change_pct,
        gdp_year,
        healthcare_employment,
        total_employment,
        healthcare_share_pct,
        avg_healthcare_weekly_wage,
        employment_year
      FROM state_economic
      ORDER BY state
    `);

    return NextResponse.json({
      success: true,
      data: states,
    });
  } catch (error) {
    console.error("Error fetching economic data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch economic data",
      },
      { status: 500 }
    );
  }
}
