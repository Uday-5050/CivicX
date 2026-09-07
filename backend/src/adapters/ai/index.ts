import { logger } from "../../middleware/logger";
import config from "../../config";

/**
 * AI adapter — stub implementation.
 *
 * Per ADR-004, AI starts as an internal adapter with mock responses.
 * When ready, swap in calls to Google Gemini, OpenAI, etc.
 * Other modules interact through this interface only.
 */

export interface AiAnalysisRequest {
  text: string;
  context?: string;
}

export interface AiAnalysisResponse {
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  categories: string[];
  confidence: number;
}

/**
 * Analyze text using the configured AI provider.
 * Currently returns mock data when AI_PROVIDER=mock.
 */
export async function analyzeText(
  request: AiAnalysisRequest
): Promise<AiAnalysisResponse> {
  if (config.aiProvider === "mock") {
    logger.info({ provider: "mock" }, "AI adapter: returning mock analysis");
    return {
      summary: `Mock analysis of: "${request.text.substring(0, 50)}..."`,
      sentiment: "neutral",
      categories: ["general"],
      confidence: 0.0,
    };
  }

  // Future: call real AI API here
  // e.g. const response = await gemini.analyze(request.text);
  throw new Error(
    `AI provider "${config.aiProvider}" is not implemented yet`
  );
}

/**
 * Check if the AI adapter is available.
 */
export function isAiAvailable(): boolean {
  return config.aiProvider === "mock";
}
