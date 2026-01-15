import { GoogleGenAI, Type } from "@google/genai";
import { NodeData, Connection } from '../types';

// Use the API key from environment variables
const apiKey = process.env.API_KEY || '';

// Initialize the client
const ai = new GoogleGenAI({ apiKey });

/**
 * Expands a single concept into related sub-concepts.
 */
export const expandConcept = async (
  rootConcept: string, 
  existingContext: string[] = []
): Promise<{ nodes: { content: string; type: 'concept' }[] }> => {
  
  if (!apiKey) {
    console.warn("API Key is missing. Returning mock data.");
    return {
        nodes: [
            { content: "Missing API Key", type: 'concept' },
            { content: "Check Environment", type: 'concept' }
        ]
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are a helpful visual thinking assistant.
        The user has a thought: "${rootConcept}".
        Generate 3 to 5 distinctly related sub-concepts or follow-up questions to expand this thought map.
        Keep the content concise (under 6 words).
        Avoid duplicates from this list: ${existingContext.join(', ')}.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['concept'] }
                },
                required: ['content', 'type']
              }
            }
          },
          required: ['nodes']
        }
      }
    });

    const text = response.text;
    if (!text) return { nodes: [] };
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Expansion Error:", error);
    return { nodes: [] };
  }
};

/**
 * Suggests a connection label between two concepts.
 */
export const suggestConnection = async (from: string, to: string): Promise<string> => {
  if (!apiKey) return "connects to";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `What is a short, logical linking verb or phrase (max 3 words) that connects "${from}" to "${to}"? e.g., "causes", "leads to", "requires". Return only the phrase.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Speed over depth
      }
    });
    
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Connection Error:", error);
    return "";
  }
};
