import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { School, GeoJSONFeatureCollection } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get("state");
    const profession = searchParams.get("profession");
    const format = searchParams.get("format") || "json";

    // Build query with optional filters
    let sql = `
      SELECT
        id, program_row_id, institution_name, campus_name, state,
        profession, program_name, accreditation_body, accreditation_status,
        address, longitude, latitude, source
      FROM \`schools\`
      WHERE 1=1
    `;
    const params: unknown[] = [];

    // State filter
    if (state) {
      sql += " AND state = ?";
      params.push(state.toUpperCase());
    }

    // Profession filter (PT, OT, PA)
    if (profession) {
      const validProfessions = ["PT", "OT", "PA"];
      if (validProfessions.includes(profession.toUpperCase())) {
        sql += " AND profession = ?";
        params.push(profession.toUpperCase());
      }
    }

    sql += " ORDER BY institution_name, profession";

    const schools = await query<School>(sql, params);

    // Return as GeoJSON if requested
    if (format === "geojson") {
      const geojson: GeoJSONFeatureCollection = {
        type: "FeatureCollection",
        features: schools.map((school) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [school.longitude, school.latitude],
          },
          properties: {
            id: school.id,
            name: school.institution_name,
            layer_key: "schools",
            state: school.state,
            campus_name: school.campus_name,
            profession: school.profession,
            program_name: school.program_name,
            accreditation_body: school.accreditation_body,
            accreditation_status: school.accreditation_status,
            address: school.address,
          },
        })),
      };

      return NextResponse.json({
        success: true,
        data: geojson,
        meta: {
          count: schools.length,
        },
      });
    }

    // Group by institution for display
    const grouped = groupByInstitution(schools);

    return NextResponse.json({
      success: true,
      data: schools,
      grouped,
      meta: {
        count: schools.length,
        institutions: Object.keys(grouped).length,
      },
    });
  } catch (error) {
    console.error("Error fetching schools:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch schools",
      },
      { status: 500 }
    );
  }
}

// Group schools by institution (some offer multiple programs)
interface GroupedSchool {
  institution_name: string;
  campus_name: string | null;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  programs: Array<{
    id: number;
    profession: string;
    program_name: string;
    accreditation_status: string;
  }>;
}

function groupByInstitution(schools: School[]): Record<string, GroupedSchool> {
  const grouped: Record<string, GroupedSchool> = {};

  for (const school of schools) {
    const key = `${school.institution_name}|${school.campus_name || ""}|${school.state}`;

    if (!grouped[key]) {
      grouped[key] = {
        institution_name: school.institution_name,
        campus_name: school.campus_name,
        state: school.state,
        address: school.address,
        latitude: school.latitude,
        longitude: school.longitude,
        programs: [],
      };
    }

    grouped[key].programs.push({
      id: school.id,
      profession: school.profession,
      program_name: school.program_name,
      accreditation_status: school.accreditation_status,
    });
  }

  return grouped;
}
