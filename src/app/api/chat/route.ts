import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAgentSystemPrompt } from "@/lib/agent-system-prompt";
import { callLLM, parseJSONFromLLM } from "@/lib/llm";
import { isReadOnlyQuery, extractMapPoints, extractTableResults, ensureLimit } from "@/lib/query-validator";
import { checkApiSecurity, createSecurityErrorResponse } from "@/lib/api-security";
import { MapPoint, SearchResult } from "@/lib/types";

interface SQLResponse {
  sql: string;
  explanation: string;
}

interface ChatAPIResponse {
  summary: string;
  mapPoints: MapPoint[];
  tableResults: SearchResult[];
  sql: string | null;
  rowCount: number | null;
}

export async function POST(request: NextRequest) {
  // Security check: rate limiting, API secret, and domain validation
  const securityResult = checkApiSecurity(request, {
    rateLimit: 20, // 20 requests per minute per IP
    requireSecret: true,
    requireDomain: true,
  });

  if (!securityResult.allowed) {
    return createSecurityErrorResponse(securityResult);
  }

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
          error: "Anthropic API key not configured. Please add your API key to environment variables."
        },
        { status: 500 }
      );
    }

    // STEP 1: Generate SQL from user question
    const systemPrompt = getAgentSystemPrompt();
    let sqlResponse: SQLResponse;

    try {
      const llmResponse = await callLLM({
        system: systemPrompt,
        user: message,
      });

      sqlResponse = parseJSONFromLLM<SQLResponse>(llmResponse);
    } catch (error) {
      // If LLM fails to return valid JSON, return a conversational response
      return NextResponse.json({
        success: true,
        data: {
          summary: "I'm sorry, I couldn't understand that question. Could you try rephrasing it? I can help with questions about clinical placement sites, schools with PT/OT/PA programs, military bases, and Native American reserves across the United States.",
          mapPoints: [],
          tableResults: [],
          sql: null,
          rowCount: null,
        } as ChatAPIResponse,
      });
    }

    // STEP 2: Validate SQL is SELECT-only
    if (!isReadOnlyQuery(sqlResponse.sql)) {
      return NextResponse.json({
        success: true,
        data: {
          summary: "I can only answer questions about the data. I cannot modify the database.",
          mapPoints: [],
          tableResults: [],
          sql: null,
          rowCount: null,
        } as ChatAPIResponse,
      });
    }

    // STEP 3: Execute SQL with retry logic
    let results: Record<string, unknown>[];
    let executedSql = ensureLimit(sqlResponse.sql, 500);

    try {
      results = await query<Record<string, unknown>>(executedSql);
    } catch (dbError) {
      // RETRY: Send error back to LLM for self-correction
      console.error("Initial query failed:", dbError);

      try {
        const retryResponse = await callLLM({
          system: systemPrompt,
          user: `My previous query failed. Original question: "${message}"
Failed query: ${sqlResponse.sql}
Error: ${dbError instanceof Error ? dbError.message : "Unknown database error"}
Please generate a corrected query. Return ONLY valid JSON with the corrected SQL.`,
        });

        const retrySqlResponse = parseJSONFromLLM<SQLResponse>(retryResponse);

        if (!isReadOnlyQuery(retrySqlResponse.sql)) {
          return NextResponse.json({
            success: true,
            data: {
              summary: "I wasn't able to generate a valid query for that question. Could you rephrase it?",
              mapPoints: [],
              tableResults: [],
              sql: null,
              rowCount: null,
            } as ChatAPIResponse,
          });
        }

        executedSql = ensureLimit(retrySqlResponse.sql, 500);
        results = await query<Record<string, unknown>>(executedSql);
      } catch (retryError) {
        console.error("Retry query also failed:", retryError);
        return NextResponse.json({
          success: true,
          data: {
            summary: "I wasn't able to find an answer to that question. Try rephrasing or asking something more specific about clinical sites, schools, military bases, or Native American reserves.",
            mapPoints: [],
            tableResults: [],
            sql: null,
            rowCount: null,
          } as ChatAPIResponse,
        });
      }
    }

    // STEP 4: Extract map points and table results from results
    const mapPoints = extractMapPoints(results);
    const tableResults = extractTableResults(results);

    // STEP 5: Summarize results in natural language
    let summary: string;

    try {
      const summaryPrompt = `You are a helpful assistant for Clarkson University's clinical placements team.

The user asked: "${message}"

The database returned ${results.length} rows. Here are the results (first 50 shown):
${JSON.stringify(results.slice(0, 50), null, 2)}

Provide a clear, concise summary (2-4 sentences) of these results for a clinical coordinator.
Be specific — mention actual numbers, state names, and institution names where relevant.
If the results are empty, say so clearly and suggest what the user might try instead.
Do NOT include any SQL or technical details. Write in plain English.`;

      summary = await callLLM({
        system: "You summarize database query results in plain English for clinical education coordinators. Be concise and specific.",
        user: summaryPrompt,
      });
    } catch {
      // Fallback summary if LLM fails
      if (results.length === 0) {
        summary = "No results found for your query. Try broadening your search or asking about a different region.";
      } else {
        summary = `Found ${results.length} results for your query.`;
      }
    }

    // STEP 6: Return response
    return NextResponse.json({
      success: true,
      data: {
        summary,
        mapPoints,
        tableResults,
        sql: executedSql,
        rowCount: results.length,
      } as ChatAPIResponse,
    });
  } catch (error) {
    console.error("Chat error:", error);

    // Check for API errors specifically
    if (error instanceof Error && error.message.includes("API")) {
      return NextResponse.json(
        {
          success: false,
          error: "AI assistant is temporarily unavailable. Please try again later."
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Chat failed"
      },
      { status: 500 }
    );
  }
}
