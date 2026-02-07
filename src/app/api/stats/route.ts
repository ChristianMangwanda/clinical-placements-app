import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { StateSummary } from "@/lib/types";

export async function GET() {
  try {
    // Get counts per state for each layer
    const sql = `
      SELECT
        COALESCE(h.state, s.state, p.state, m.state, n.state) as state,
        COALESCE(h.count, 0) as hrsa_count,
        COALESCE(s.count, 0) as school_count,
        COALESCE(p.count, 0) as post_secondary_count,
        COALESCE(m.count, 0) as military_count,
        COALESCE(n.count, 0) as native_american_count,
        (
          COALESCE(h.count, 0) + COALESCE(s.count, 0) + COALESCE(p.count, 0) +
          COALESCE(m.count, 0) + COALESCE(n.count, 0)
        ) as total_count
      FROM (
        SELECT state, COUNT(*) as count FROM \`hrsa_sites\` GROUP BY state
      ) h
      LEFT JOIN (
        SELECT state, COUNT(*) as count FROM \`schools\` GROUP BY state
      ) s ON h.state = s.state
      LEFT JOIN (
        SELECT state, COUNT(*) as count FROM \`post_secondary_schools\` GROUP BY state
      ) p ON h.state = p.state
      LEFT JOIN (
        SELECT state, COUNT(*) as count FROM \`military_sites\` GROUP BY state
      ) m ON h.state = m.state
      LEFT JOIN (
        SELECT state, COUNT(*) as count FROM \`native_american_reserves\` GROUP BY state
      ) n ON h.state = n.state
      ORDER BY total_count DESC
    `;

    const stats = await query<StateSummary>(sql);

    // Also get overall totals
    interface TotalCount { count: number }

    const [hrsaTotal] = await query<TotalCount>("SELECT COUNT(*) as count FROM `hrsa_sites`");
    const [schoolsTotal] = await query<TotalCount>("SELECT COUNT(*) as count FROM `schools`");
    const [postSecTotal] = await query<TotalCount>("SELECT COUNT(*) as count FROM `post_secondary_schools`");
    const [militaryTotal] = await query<TotalCount>("SELECT COUNT(*) as count FROM `military_sites`");
    const [nativeTotal] = await query<TotalCount>("SELECT COUNT(*) as count FROM `native_american_reserves`");

    return NextResponse.json({
      success: true,
      data: {
        byState: stats,
        totals: {
          hrsa_sites: hrsaTotal?.count || 0,
          schools: schoolsTotal?.count || 0,
          post_secondary_schools: postSecTotal?.count || 0,
          military_sites: militaryTotal?.count || 0,
          native_american_reserves: nativeTotal?.count || 0,
          total: (
            (hrsaTotal?.count || 0) +
            (schoolsTotal?.count || 0) +
            (postSecTotal?.count || 0) +
            (militaryTotal?.count || 0) +
            (nativeTotal?.count || 0)
          ),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch statistics",
      },
      { status: 500 }
    );
  }
}
