const { z } = require("zod");
const { generateText } = require("../config/geminiClient");
const { ApiError } = require("./apiResponse");

/**
 * Strips markdown code block fences and extracts JSON string.
 */
const extractJsonString = (rawText) => {
  if (!rawText) return "";
  let cleaned = rawText.trim();
  // Remove ```json and ``` or ``` at ends
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  return cleaned.trim();
};

/**
 * Calls Gemini, parses the returned text as JSON, and validates with a Zod schema.
 * Automatically retries ONCE if the response is invalid or fails validation.
 *
 * @param {string} prompt - Prompt for Gemini
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {Object} [options]
 * @param {string} [options.systemInstruction]
 * @param {number} [options.maxRetries=1]
 * @returns {Promise<any>} Parsed and validated data
 */
const generateValidatedJson = async (prompt, schema, options = {}) => {
  const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 1;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const currentPrompt =
        attempt === 0
          ? `${prompt}\n\nIMPORTANT: Respond ONLY with valid, raw JSON. Do NOT wrap in explanation or extra conversational text.`
          : `${prompt}\n\nCRITICAL FIX: Your previous response was not valid JSON or failed validation schema (${lastError?.message || "invalid schema"}). Return ONLY raw, valid JSON matching the exact schema requested with no commentary.`;

      const raw = await generateText(currentPrompt);
      const jsonStr = extractJsonString(raw);

      if (!jsonStr) {
        throw new Error("Empty response from AI model.");
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (jsonErr) {
        throw new Error(`Invalid JSON syntax: ${jsonErr.message}`);
      }

      const validated = schema.parse(parsed);
      return validated;
    } catch (err) {
      lastError = err;
      console.warn(`[geminiJson] Attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt === maxRetries) {
        throw new ApiError(
          422,
          `Failed to generate valid structured data from AI: ${lastError.message}`
        );
      }
    }
  }

  throw new ApiError(422, "Unable to generate valid AI response.");
};

// ── Zod Schemas for Phase 9B ────────────────────────────────────────────────

const lessonPlanDraftSchema = z.object({
  objectives: z.array(z.string().min(1)).min(1, "At least one objective required"),
  activities: z
    .array(
      z.object({
        name: z.string().min(1),
        minutes: z.coerce.number().min(1).default(10),
      })
    )
    .min(1, "At least one activity required"),
  resources: z.array(z.string()).default([]),
  assessmentIdea: z.string().default(""),
  homeworkIdea: z.string().default(""),
});

const singleQuizQuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string().min(1)).length(4, "Exactly 4 options required"),
  correctIndex: z.coerce.number().int().min(0).max(3),
  explanation: z.string().default(""),
});

const quizQuestionsListSchema = z.array(z.any()).transform((items) => {
  // Filter and keep only valid questions with exactly 4 options and valid correctIndex
  const valid = [];
  for (const item of items) {
    const res = singleQuizQuestionSchema.safeParse(item);
    if (res.success) {
      valid.push(res.data);
    }
  }
  if (valid.length === 0) {
    throw new Error("No valid 4-option quiz questions could be parsed.");
  }
  return valid;
});

module.exports = {
  extractJsonString,
  generateValidatedJson,
  lessonPlanDraftSchema,
  singleQuizQuestionSchema,
  quizQuestionsListSchema,
};
