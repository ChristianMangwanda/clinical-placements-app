import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "@/lib/db";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Database schema for the AI to understand
const DATABASE_SCHEMA = `
Database: Clinical Placements Database (PostgreSQL on Supabase)

Tables:

1. hrsa_sites (81,477 rows) - Healthcare providers and clinical sites from HRSA database
   - id (SERIAL PK)
   - site_name (VARCHAR 500)
   - state (CHAR 2) - US state code
   - longitude (NUMERIC 11,7)
   - latitude (NUMERIC 10,7)
   - source (VARCHAR 50)

2. schools (858 rows) - Universities offering PT, OT, PA programs. One row per program.
   - id (SERIAL PK)
   - program_row_id (INT)
   - institution_name (VARCHAR 300)
   - campus_name (VARCHAR 200, nullable)
   - state (CHAR 2)
   - profession (profession_type: 'PT','OT','PA') - Physical Therapy, Occupational Therapy, Physician Assistant
   - program_name (VARCHAR 200)
   - accreditation_body (VARCHAR 20)
   - accreditation_status (VARCHAR 200)
   - address (VARCHAR 500)
   - longitude, latitude (NUMERIC)

3. post_secondary_schools (6,812 rows) - All post-secondary institutions in the USA
   - id (SERIAL PK)
   - original_id (INT)
   - institution_name (VARCHAR 300)
   - state (CHAR 2)
   - latitude, longitude (NUMERIC)

4. military_sites (824 rows) - US military installations
   - id (SERIAL PK)
   - name (VARCHAR 300)
   - state (CHAR 2)
   - component (VARCHAR 50) - e.g., 'usa', 'usaf', 'armyNationalGuard'
   - latitude, longitude (NUMERIC)

5. native_american_reserves (693 rows) - Native American reservation locations
   - id (SERIAL PK)
   - name (VARCHAR 500)
   - state (CHAR 2)
   - latitude, longitude (NUMERIC)

6. notes (variable) - Coordinator annotations
   - id (SERIAL PK)
   - layer_key (VARCHAR 50) - references table name
   - entity_id (INT) - ID of the entity being noted
   - state (CHAR 2) - for state-level notes
   - note_text (TEXT)
   - author (VARCHAR 100)
`;

const SYSTEM_PROMPT = `You are a helpful assistant for the Clinical Placements Database at Clarkson University.
You help clinical coordinators answer questions about PT (Physical Therapy), OT (Occupational Therapy),
and PA (Physician Assistant) clinical education placements across the United States.

${DATABASE_SCHEMA}

When a user asks a question, you should:
1. Determine if it requires a database query
2. If yes, generate a safe, read-only SQL query (SELECT only)
3. Return JSON in this exact format:
   {"sql": "SELECT ...", "explanation": "Brief explanation of what this query does"}

Important rules:
- ONLY generate SELECT statements - never INSERT, UPDATE, DELETE, DROP, or any data-modifying queries
- Use standard PostgreSQL syntax (no backticks - use double quotes for identifiers if needed, or just plain names)
- Limit results to 1000 rows max
- For geographic queries, use latitude/longitude
- State codes are 2-letter uppercase (e.g., 'NY', 'CA', 'TX')
- For the profession column in schools, use 'PT', 'OT', or 'PA' as text values
- Use ILIKE for case-insensitive pattern matching instead of LIKE

If the question doesn't require a database query (e.g., general questions, greetings),
just respond conversationally without SQL.

Example questions and queries:
- "Which states have no OT program?" → Query schools where profession='OT', group by state, find missing states
- "How many clinical sites are in Kansas?" → COUNT(*) from hrsa_sites where state='KS'
- "List military bases in Texas" → SELECT from military_sites where state='TX'
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "message is required" },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_anthropic_api_key_here") {
      return NextResponse.json(
        {
          success: false,
          error: "Anthropic API key not configured. Please add your API key to .env.local"
        },
        { status: 500 }
      );
    }

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const assistantMessage = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    // Try to parse SQL from response
    let sql: string | null = null;
    let queryResults: unknown[] | null = null;
    let explanation: string | null = null;

    try {
      // Look for JSON in the response
      const jsonMatch = assistantMessage.match(/\{[\s\S]*?"sql"[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.sql && isSafeQuery(parsed.sql)) {
          sql = parsed.sql;
          explanation = parsed.explanation;

          // Execute the query
          queryResults = await executeQuery(parsed.sql);
        }
      }
    } catch {
      // No valid SQL found, that's okay
    }

    // Generate natural language response if we have results
    let finalResponse = assistantMessage;

    if (queryResults !== null) {
      // Get a natural language interpretation of the results
      const interpretResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `The user asked: "${message}"

I ran this SQL query: ${sql}

The results were: ${JSON.stringify(queryResults.slice(0, 50))} ${queryResults.length > 50 ? `(showing 50 of ${queryResults.length} results)` : ""}

Please provide a clear, concise answer to the user's question based on these results. Be specific with numbers and details.`,
          },
        ],
      });

      finalResponse = interpretResponse.content[0].type === "text"
        ? interpretResponse.content[0].text
        : assistantMessage;
    }

    return NextResponse.json({
      success: true,
      data: {
        message: finalResponse,
        sql: sql,
        explanation: explanation,
        resultCount: queryResults?.length || null,
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Chat failed"
      },
      { status: 500 }
    );
  }
}

// Validate that the query is safe (SELECT only)
function isSafeQuery(sql: string): boolean {
  const normalized = sql.trim().toUpperCase();

  // Must start with SELECT
  if (!normalized.startsWith("SELECT")) {
    return false;
  }

  // Block dangerous keywords
  const dangerous = [
    "INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER",
    "CREATE", "REPLACE", "GRANT", "REVOKE", "EXEC", "EXECUTE",
    "INTO OUTFILE", "INTO DUMPFILE", "LOAD_FILE"
  ];

  for (const keyword of dangerous) {
    if (normalized.includes(keyword)) {
      return false;
    }
  }

  return true;
}

// Execute query with timeout and row limit
async function executeQuery(sql: string): Promise<unknown[]> {
  // Add LIMIT if not present
  const normalizedSql = sql.trim();
  const hasLimit = /LIMIT\s+\d+/i.test(normalizedSql);
  const finalSql = hasLimit ? normalizedSql : `${normalizedSql} LIMIT 1000`;

  try {
    const results = await query(finalSql);
    return results;
  } catch (error) {
    console.error("Query execution error:", error);
    throw new Error("Failed to execute query");
  }
}
