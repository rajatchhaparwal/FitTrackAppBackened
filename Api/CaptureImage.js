import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import { DietLog } from '../Models/DietLog.js';
import  AppUser  from '../Models/UserSchemaModel.js';

const router = express.Router();

// ── Gemini setup ───────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// ── Multer setup (unchanged) ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/meals';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `meal_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WEBP, HEIC images are allowed'));
  }
});

// ── AI function — now using Gemini ──────────────────────────────────────────
async function analyzeFoodNutrition(imagePath) {
  try {
    const compressedBuffer = await sharp(imagePath)
      .resize(800, 800, { fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();

    const base64Image = compressedBuffer.toString('base64');

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
    `;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite', // cheapest vision-capable model, good for this use case
      generationConfig: {
        responseMimeType: 'application/json' // forces valid JSON, no need to strip ```json fences
      }
    });

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image
        }
      }
    ]);

    const text = result.response.text().trim();
    const nutritionData = JSON.parse(text);

    console.log("AI Analysis Successful:", nutritionData);
    return nutritionData;

  } catch (e) {
    console.error("AI Analysis Failed:", e);
    throw new Error("AI could not process this image.");
  }
}

// ── POST /CapturedImage — unchanged below this point ────────────────────────
const VALID_MEALS = ['breakfast', 'lunch', 'dinner', 'snacks', 'pre_workout', 'post_workout'];

router.post('/CapturedImage', upload.single('mealImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const firebaseUid = req.headers['firebase-uid'];
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized: firebase-uid header missing' });
    }

    const { mealType } = req.body;
    if (!mealType || !VALID_MEALS.includes(mealType)) {
      return res.status(400).json({
        message: `mealType must be one of: ${VALID_MEALS.join(', ')}`
      });
    }

    const user = await AppUser.findOne({ firebaseUid }).select('_id').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userId = user._id;

    console.log('🔍 Analyzing image:', req.file.path);
    const aiResult = await analyzeFoodNutrition(req.file.path);
    console.log('🤖 AI Result:', aiResult);

    const foodEntry = {
      foodName:   aiResult.foodName,
      quantity:   100,
      unit:       'grams',
      calories:   aiResult.calories  ?? 0,
      proteinG:   aiResult.protein_g ?? 0,
      carbsG:     aiResult.carbs_g   ?? 0,
      fatG:       aiResult.fats_g    ?? 0,
      fiberG:     0,
      sugarG:     0,
      sodiumMg:   0,
      source:     'ai_photo',
      imageUrl:   req.file.path,
      isVerified: false,
      loggedAt:   new Date().toTimeString().slice(0, 5)
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dietLog = await DietLog.findOne({ user: userId, date: today });

    if (!dietLog) {
      dietLog = new DietLog({
        user: userId,
        date: today,
        meals: {
          breakfast:    [],
          lunch:        [],
          dinner:       [],
          snacks:       [],
          pre_workout:  [],
          post_workout: []
        }
      });
    }

    dietLog.meals[mealType].push(foodEntry);
    await dietLog.save();

    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      message: 'Food logged successfully',
      data: {
        foodEntry,
        dailyTotals: dietLog.dailyTotals,
        date: dietLog.date
      }
    });

  } catch (error) {
    console.error('Processing error:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.message === 'AI could not process this image.') {
      return res.status(422).json({
        error: 'Could not identify food in this image. Please try a clearer photo.'
      });
    }

    return res.status(500).json({
      error: 'Failed to process image: ' + error.message
    });
  }
});

export default router;