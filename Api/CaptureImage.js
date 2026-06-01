import fs from 'fs';
import sharp from 'sharp';
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
// Init Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function analyzeFoodNutrition(imagePath) {
  try {
    // Resize and Compress using sharp to prevent ETIMEDOUT errors
    const compressedBuffer = await sharp(imagePath)
      .resize(800, 800, { fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();

    // Initialize the model
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Act as an expert clinical nutritionist. Analyze this food image. 
      Return ONLY a JSON object with: 
      {
        "foodName": "string",
        "calories": integer,
        "protein_g": integer,
        "carbs_g": integer,
        "fats_g": integer
      }
      Do not include markdown tags like \`\`\`json. Return pure JSON.
    `;

    // Send request
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: compressedBuffer.toString("base64"),
          mimeType: "image/jpeg"
        },
      },
    ]);

    const response = await result.response;
    const text = response.text().trim();
    
 
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const nutritionData = JSON.parse(cleanJson);
    
    console.log("AI Analysis Successful:", nutritionData);
    return nutritionData;

  } catch (e) {
    console.error("AI Analysis Failed:", e.message);
    throw new Error("AI could not process this image.");
  }
}

export default analyzeFoodNutrition;