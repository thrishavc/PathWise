import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // The key will be provided via .env.local in development.
  // For now we just surface a clear error if someone tries to use the client without configuring it.
  console.warn(
    "[PathWise] GEMINI_API_KEY is not set. Add it to your .env.local file to enable AI features.",
  );
}

export function getGeminiClient() {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenerativeAI(apiKey);
}

