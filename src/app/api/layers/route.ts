import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { Layer } from "@/lib/types";

export async function GET() {
  try {
    const layers = await query<Layer>(
      "SELECT * FROM layers ORDER BY sort_order ASC"
    );

    return NextResponse.json({
      success: true,
      data: layers,
    });
  } catch (error) {
    console.error("Error fetching layers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch layers",
      },
      { status: 500 }
    );
  }
}
