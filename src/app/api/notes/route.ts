import { NextRequest, NextResponse } from "next/server";
import { query, execute, queryOne } from "@/lib/db";
import type { Note } from "@/lib/types";

// GET - Fetch notes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const layerKey = searchParams.get("layer_key");
    const entityId = searchParams.get("entity_id");
    const state = searchParams.get("state");

    let sql = "SELECT * FROM notes WHERE 1=1";
    const params: unknown[] = [];
    let paramIndex = 1;

    if (layerKey) {
      sql += ` AND layer_key = $${paramIndex++}`;
      params.push(layerKey);
    }

    if (entityId) {
      sql += ` AND entity_id = $${paramIndex++}`;
      params.push(parseInt(entityId, 10));
    }

    if (state) {
      sql += ` AND state = $${paramIndex++}`;
      params.push(state.toUpperCase());
    }

    sql += " ORDER BY created_at DESC";

    const notes = await query<Note>(sql, params);

    return NextResponse.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { layer_key, entity_id, state, note_text, author } = body;

    if (!note_text || note_text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "note_text is required" },
        { status: 400 }
      );
    }

    // PostgreSQL uses RETURNING to get the inserted row
    const sql = `
      INSERT INTO notes (layer_key, entity_id, state, note_text, author)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const result = await queryOne<{ id: number }>(sql, [
      layer_key || null,
      entity_id || null,
      state ? state.toUpperCase() : null,
      note_text.trim(),
      author || null,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: result?.id,
        layer_key,
        entity_id,
        state,
        note_text: note_text.trim(),
        author,
      },
    });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create note" },
      { status: 500 }
    );
  }
}

// PATCH - Update a note
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, note_text } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    if (!note_text || note_text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "note_text is required" },
        { status: 400 }
      );
    }

    const sql = "UPDATE notes SET note_text = $1 WHERE id = $2";
    const result = await execute(sql, [note_text.trim(), id]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id, note_text: note_text.trim() },
    });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update note" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a note
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const sql = "DELETE FROM notes WHERE id = $1";
    const result = await execute(sql, [parseInt(id, 10)]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: parseInt(id, 10) },
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
