
import { GoogleGenAI } from "@google/genai";

const getApiKey = (): string => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not found. The application cannot function without it.");
  }
  return apiKey;
};

// We initialize once and reuse the instance.
// Note: In a real production app, you might handle key changes more dynamically.
let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({ apiKey: getApiKey() });
} catch (e: any) {
  // Catch initialization errors, which usually mean no API key.
  console.error("Failed to initialize GoogleGenAI:", e.message);
  ai = null; // Ensure ai is null if initialization fails
}


export const reviewCode = async (code: string, language: string): Promise<string> => {
  if (!ai) {
    // This provides a user-facing error if the API key was missing at startup.
    return "CRITICAL ERROR: The Gemini API client could not be initialized. This is likely due to a missing API key.";
  }
  
  if (!code.trim()) {
    return "Please provide some code to review.";
  }

  const prompt = `
    You are an expert senior software engineer and a world-class code reviewer.
    Your task is to provide a comprehensive and constructive review of the following ${language} code.

    Analyze the code for the following aspects:
    1.  **Bugs and Errors:** Identify any potential bugs, logical errors, or edge cases that are not handled.
    2.  **Performance:** Suggest optimizations for performance bottlenecks or inefficient code.
    3.  **Security:** Point out any potential security vulnerabilities.
    4.  **Best Practices & Readability:** Check for adherence to language-specific best practices, code style, and overall readability. Suggest improvements for clarity and maintainability.
    5.  **Architecture:** Comment on the overall structure and design, if applicable.

    Provide your feedback in Markdown format. Structure your review with clear headings for each category (e.g., ### Bugs, ### Performance).
    For each point, explain the issue and suggest a specific code change or improvement. Use code snippets where helpful.
    If you find no issues in a category, state "No issues found."

    Here is the code to review:
    \`\`\`${language}
    ${code}
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    if (response && response.text) {
        return response.text;
    } else {
        throw new Error("Received an empty response from the Gemini API.");
    }

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    // Provide a more user-friendly error message
    if (error instanceof Error) {
        return `An error occurred while communicating with the Gemini API: ${error.message}`;
    }
    return "An unknown error occurred while communicating with the Gemini API.";
  }
};
