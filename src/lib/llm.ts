/**
 * LLM abstraction layer for AI Query Agent
 * Provides a consistent interface for calling Claude API
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface LLMCallParams {
  system: string;
  user: string;
  maxTokens?: number;
}

/**
 * Call the LLM with a system prompt and user message
 * Returns the text content of the response
 */
export async function callLLM(params: LLMCallParams): Promise<string> {
  const { system, user, maxTokens = 1024 } = params;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system: system,
      messages: [{ role: "user", content: user }],
    });

    // Extract text content from the response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in LLM response");
    }

    return textBlock.text;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`LLM API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse JSON from LLM response, handling markdown code blocks
 */
export function parseJSONFromLLM<T>(response: string): T {
  // Try to extract JSON from markdown code blocks first
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonString = jsonMatch ? jsonMatch[1].trim() : response.trim();

  // Also try to find raw JSON object
  const objectMatch = jsonString.match(/\{[\s\S]*\}/);
  if (!objectMatch) {
    throw new Error("No JSON object found in response");
  }

  try {
    return JSON.parse(objectMatch[0]) as T;
  } catch {
    throw new Error("Failed to parse JSON from LLM response");
  }
}
