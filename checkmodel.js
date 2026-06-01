import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function listAllModels() {
  try {
    const models = await genAI.listModels();
    console.log("Available Models:");
    models.models.forEach(model => {
      console.log(`- ${model.name} (Supported: ${model.supportedGenerationMethods})`);
    });
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listAllModels();