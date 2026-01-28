
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ExtractionResult } from "../types";

const OCR_SYSTEM_PROMPT = `
You are an industrial quality-control assistant.
Extract fields from the potato thickness measurement report image.
Fields to extract:
- Date
- Time
- Maximum thickness (mm)
- Minimum thickness (mm)
- X-bar (average thickness, mm)

Requirements:
- Extract ONLY numeric values for thickness.
- If a value is unreadable or missing, return null.
- Return the results in strictly valid JSON format matching the provided schema.
- Do not include explanations or chat.
`;

export async function extractReportData(base64Image: string): Promise<ExtractionResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: OCR_SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Image.split(',')[1] || base64Image
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Format: YYYY/MM/DD" },
            time: { type: Type.STRING, description: "Format: HH:MM" },
            max_thickness: { type: Type.NUMBER },
            min_thickness: { type: Type.NUMBER },
            x_bar: { type: Type.NUMBER }
          },
          required: ["date", "time", "max_thickness", "min_thickness", "x_bar"]
        }
      }
    });

    const resultText = response.text || '{}';
    return JSON.parse(resultText) as ExtractionResult;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Failed to extract data from image. Please ensure the image is clear.");
  }
}
