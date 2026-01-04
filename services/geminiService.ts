
import { GoogleGenAI } from "@google/genai";
import { Hospital } from "../types";

export class GeminiService {
  /**
   * Generates triage advice using Gemini.
   * Instantiates GoogleGenAI inside the method to ensure it always uses the most up-to-date API key.
   */
  async getTriageAdvice(userQuery: string, hospitals: Hospital[]): Promise<string> {
    const hospitalData = hospitals.map(h => ({
      name: h.name,
      availableGeneral: h.generalBeds.available,
      availableICU: h.icuBeds.available,
      contact: h.contact
    }));

    const prompt = `
      User Emergency Query: "${userQuery}"
      Current Hospital Availability: ${JSON.stringify(hospitalData)}

      Instructions:
      1. Act as a medical dispatcher.
      2. Briefly analyze the situation.
      3. Recommend the best hospital based on availability and urgency.
      4. Keep the response short (under 60 words).
      5. Explicitly state: "I am an AI assistant, not a doctor. In critical life-threatening emergencies, call 911 immediately."
    `;

    try {
      // Correct initialization: Always use a named parameter with process.env.API_KEY.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        // Using 'gemini-3-flash-preview' for basic text tasks like summarization and Q&A.
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.2,
          // Avoiding setting maxOutputTokens without a thinkingBudget to prevent empty responses.
          // For this short text task, default token limits are appropriate.
        }
      });

      // Extract text content using the .text property (not a method).
      return response.text || "I'm sorry, I couldn't process that. Please check the hospital list directly.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Unable to connect to triage AI. Please refer to the hospital availability list below.";
    }
  }
}
