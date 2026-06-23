import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js'; 
import User from './Models/UserSchemaModel.js'
import Exercise from './Exercisedata/schemaForExercsise/exerciseSchema.js'
import PoseConfig from './Exercisedata/schemaForExercsise/PoseConfigSchema.js';
import WorkoutLog from './Models/WorkoutLog.js';
import { DietLog } from './Models/DietLog.js';
import cors from  'cors';
import analyzeFoodNutrition from './Api/CaptureImage.js';
import fs from 'fs'; 
import multer from 'multer';

import firebaseAdmin from 'firebase-admin';
import { createRequire } from 'module';

// 1. Properly handle the JSON import for ES Modules
const require = createRequire(import.meta.url);
const serviceAccount = require('./firebase-service-account.json');

// 2. Initialize Firebase Admin (v14 exposes cert on the default export)
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.cert(serviceAccount)
});

console.log("Firebase Admin initialized successfully!");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());
connectDB();
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'firebase-uid'],
}));

// Mount the CaptureImage routes
app.use('/', analyzeFoodNutrition);

const upload = multer({ dest: 'uploads/' });


// store user data login details and personal onbaording screen data
app.post('/login', async (req, res) => {
  try {
    const { firebaseUid, ...onboardingData } = req.body;

    const weight = Number(onboardingData.weight)
    const age = Number(onboardingData.age)
    const height = Number(onboardingData.height)
    const goal = onboardingData.goal

    let calories = 2000;
    let protein = 120;
    let fats = 60;
    let carbs = 200;

   switch (goal) {
  case 'muscle_gain':
    calories = Math.round(weight * 33);
    protein = Math.round(weight * 2.2); // 2.2g per kg
    fats = Math.round((calories * 0.25) / 9); // 25% of calories from fat
    break;

  case 'weight_gain':
    calories = Math.round(weight * 35); // Higher surplus
    protein = Math.round(weight * 2.0); // 2.0g per kg
    fats = Math.round((calories * 0.25) / 9); // 25% of calories from fat
    break;

  case 'weight_loss':
    calories = Math.round(weight * 24); // Caloric deficit
    protein = Math.round(weight * 2.0); // Keep protein high to prevent muscle loss
    fats = Math.round((calories * 0.20) / 9); // Drop fats down to 20%
    break;

  case 'Modify_my_diet':
    calories = Math.round(weight * 28); // Maintenance calories
    protein = Math.round(weight * 2.0); // Slightly higher protein for body composition change
    fats = Math.round((calories * 0.25) / 9);
    break;

  case 'maintenance':
  case 'Plan_meals':
  case 'healthy_habits':
  default:
    // Balanced baseline for general health, planning, and maintenance
    calories = Math.round(weight * 28);
    protein = Math.round(weight * 1.6); // Standard 1.6g per kg
    fats = Math.round((calories * 0.25) / 9); // 25% of calories from fat
    break;
}


const remainingCalories = calories - ((protein * 4) + (fats * 9));
carbs = Math.round(remainingCalories / 4);


if(carbs<0) carbs = 50;

onboardingData.personalPlan = {
      dailyCalories: calories,
      proteinGrams: protein,
      carbGrams: carbs,
      fatGrams: fats
    };

    onboardingData.daily_calorie_goal = calories;

    if (onboardingData.fitnessLevel) {
      onboardingData.fitness_level = onboardingData.fitnessLevel;
    }

    // findOneAndUpdate automatically checks if the user exists first
    const user = await User.findOneAndUpdate(
      { firebaseUid: firebaseUid },
      { 
       $set: onboardingData
      },
      { 
        upsert: true, // If they don't exist, create them
        new: true,    // Return the freshly updated database document
        setDefaultsOnInsert: true, //Applies any default values from your schema
        returnDocument: 'after',
      }
    );


    res.status(200).json({ 
      message: "User synced successfully!", 
      user 
    });

    console.log("success")
  } catch (error) {
    console.error("Login route error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/Home', async (req,res)=>{
  try {
 const  firebaseUid = req.headers['firebase-uid'];

   if (!firebaseUid) {
      return res.status(400).json({ 
        message: "Access Denied: Missing user identification token.",
        receivedHeaders: req.headers
      });
    }
 const user = await User.findOne({ firebaseUid: firebaseUid }) 
 
if (!user) {
      return res.status(404).json({ message: "User profile not found in database." });
    }

  res.status(200).json({
      message: "Data fetched successfully",
      user: user
    });

  } catch (error) {
    console.error("Userdata route error:", error);
    res.status(500).json({ error: error.message });
  }
});



// to capture the image and send it to ai model ./api/captureimage.js

// POST /CapturedImage
// Body (multipart/form-data):
//   mealImage  — file
//   userId     — string (ObjectId)
//   mealType   — "breakfast" | "lunch" | "dinner" | "snacks" | "pre_workout" | "post_workout"

// app.post('/CapturedImage', upload.single('mealImage'), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "No image uploaded" });
//     }

//     const { firebaseUid , mealType } = req.body;

//     // ── Validate inputs ──────────────────────────────────────────────
//     if (!firebaseUid) {
//       return res.status(400).json({ message: "userId is required" });
//     }

//     const VALID_MEALS = ['breakfast', 'lunch', 'dinner', 'snacks', 'pre_workout', 'post_workout'];
//     if (!VALID_MEALS.includes(mealType)) {
//       return res.status(400).json({ message: `mealType must be one of: ${VALID_MEALS.join(', ')}` });
//     }

//     // ── AI analysis ──────────────────────────────────────────────────
//     const aiResult = await analyzeFoodNutrition(req.file.path);

//     // ── Map AI result → FoodItemSchema ───────────────────────────────
//     // Assumes analyzeFoodNutrition returns this shape:
//     // {
//     //   foodName: "Butter Chicken",
//     //   quantity: 200,
//     //   unit: "grams",
//     //   calories: 290, protein: 22.4, carbs: 8.6, fat: 19.2,
//     //   fiber: 1.2, sugar: 5.4, sodium: 520
//     // }
//     const foodEntry = {
//       foodName:   aiResult.foodName,
//       quantity:   aiResult.quantity   ?? 100,
//       unit:       aiResult.unit       ?? 'grams',
//       calories:   aiResult.calories   ?? 0,
//       proteinG:   aiResult.protein    ?? 0,
//       carbsG:     aiResult.carbs      ?? 0,
//       fatG:       aiResult.fat        ?? 0,
//       fiberG:     aiResult.fiber      ?? 0,
//       sugarG:     aiResult.sugar      ?? 0,
//       sodiumMg:   aiResult.sodium     ?? 0,
//       source:     'ai_photo',
//       imageUrl:   req.file.path,       // or your cloud URL if you upload to S3/Cloudinary
//       isVerified: false,
//       loggedAt:   new Date().toTimeString().slice(0, 5)
//     };

//     // ── Upsert today's DietLog, push into correct meal ───────────────
//     const today = new Date();
//     today.setHours(0, 0, 0, 0); // normalize to midnight

//     // findOneAndUpdate with $push won't trigger pre('save') for dailyTotals,
//     // so we use find-then-save instead
//     let dietLog = await DietLog.findOne({firebaseUid: firebaseUid , date: today });

//     if (!dietLog) {
//       dietLog = new DietLog({
//         user: userId,
//         date: today,
//         meals: {
//           breakfast:    [],
//           lunch:        [],
//           dinner:       [],
//           snacks:       [],
//           pre_workout:  [],
//           post_workout: []
//         }
//       });
//     }

//     dietLog.meals[mealType].push(foodEntry);
//     await dietLog.save(); // triggers pre('save') → recalculates dailyTotals ✅

//     res.status(200).json({
//       message: "Food logged successfully",
//       data: {
//         foodEntry,
//         dailyTotals: dietLog.dailyTotals,
//         date: dietLog.date
//       }
//     });

//   } catch (error) {
//     console.error("Processing error:", error);
//     res.status(500).json({ error: "Failed to process image: " + error.message });
//   }
// });

app.get('/Exercisedata', async (req, res) => {
  try {
    const exerciseData = await Exercise.find({});
    res.json({
      success: true,
      exercises: exerciseData
    });
  } catch (error) {
    console.error("Error fetching exercise data:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Fetch a single exercise along with its AI camera rules
app.get('/Exercise/:id/tracking', async (req, res) => {
  try {
    const { id } = req.params;  //ex id EX015
    
    const trackingBlueprint = await PoseConfig.findOne({ exercise_id: id })
      .populate("exercise_ref"); 

    if (!trackingBlueprint) {
      return res.status(404).json({ success: false, message: "Tracking data not found for this item." });
    }

    res.json({
      success: true,
      data: trackingBlueprint
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save a workout session (including AI pose tracking results)
app.post('/WorkoutLog', async (req, res) => {
  try {
    const firebaseUid = req.headers['firebase-uid'];
    const payload = req.body ?? {};

    let userId = payload.userId;
    if (firebaseUid && !userId) {
      const user = await User.findOne({ firebaseUid });
      if (user) userId = user._id;
    }

    const log = await WorkoutLog.create({
      ...payload,
      firebaseUid: firebaseUid || payload.firebaseUid,
      userId,
      startTime: payload.startTime ?? new Date(),
      endTime: payload.endTime ?? new Date(),
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    console.error('WorkoutLog error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent workout logs for the logged-in user
app.get('/WorkoutLog', async (req, res) => {
  try {
    const firebaseUid = req.headers['firebase-uid'];
    if (!firebaseUid) {
      return res.status(400).json({ success: false, message: 'Missing firebase-uid header' });
    }

    const logs = await WorkoutLog.find({ firebaseUid })
      .sort({ date: -1 })
      .limit(20);

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// GET /DietLog/today
app.get('/DietLog/today', async (req, res) => {
  try {
    const firebaseUid = req.headers['firebase-uid'];
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized: firebase-uid missing' });
    }

    const user = await User.findOne({ firebaseUid }).select('_id').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dietLog = await DietLog.findOne({ user: user._id, date: today }).lean();
    
    return res.status(200).json({ success: true, data: dietLog || null });
  } catch (error) {
    console.error('Error fetching DietLog:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /UpdateProfile
app.post('/UpdateProfile', async (req, res) => {
  try {
    const firebaseUid = req.headers['firebase-uid'];
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized: firebase-uid missing' });
    }

    const updatedFields = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /DietLog/food
app.post('/DietLog/food', async (req, res) => {
  try {
    const firebaseUid = req.headers['firebase-uid'];
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized: firebase-uid missing' });
    }

    const { mealType, food } = req.body;
    if (!mealType || !food) {
      return res.status(400).json({ message: 'Missing mealType or food data' });
    }

    const VALID_MEALS = ['breakfast', 'lunch', 'snacks', 'dinner', 'pre_workout', 'post_workout'];
    const normalizedMealKey = mealType.toLowerCase().replace(/\s+/g, '_');
    if (!VALID_MEALS.includes(normalizedMealKey)) {
      return res.status(400).json({ message: `Invalid meal type: ${mealType}` });
    }

    const user = await User.findOne({ firebaseUid }).select('_id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dietLog = await DietLog.findOne({ user: user._id, date: today });
    if (!dietLog) {
      dietLog = new DietLog({
        user: user._id,
        date: today,
        meals: {
          breakfast: [],
          lunch: [],
          snacks: [],
          dinner: [],
          pre_workout: [],
          post_workout: []
        }
      });
    }

    // Map food structure to DietLog schema
    const foodEntry = {
      foodName: food.foodName || food.name,
      quantity: Number(food.quantity) || 100,
      unit: food.unit || 'grams',
      calories: Number(food.calories) || 0,
      proteinG: Number(food.proteinG || food.protein) || 0,
      carbsG: Number(food.carbsG || food.carbs) || 0,
      fatG: Number(food.fatG || food.fat) || 0,
      source: food.source || 'manual',
      loggedAt: new Date().toTimeString().slice(0, 5)
    };

    dietLog.meals[normalizedMealKey].push(foodEntry);
    await dietLog.save(); // triggers pre('save') for dailyTotals calculations

    return res.status(200).json({ success: true, data: dietLog });
  } catch (error) {
    console.error('Error logging food:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /DietLog/food
app.delete('/DietLog/food', async (req, res) => {
  try {
    const firebaseUid = req.headers['firebase-uid'];
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized: firebase-uid missing' });
    }

    const { mealType, index } = req.body;
    if (!mealType || index === undefined) {
      return res.status(400).json({ message: 'Missing mealType or food index' });
    }

    const VALID_MEALS = ['breakfast', 'lunch', 'snacks', 'dinner', 'pre_workout', 'post_workout'];
    const normalizedMealKey = mealType.toLowerCase().replace(/\s+/g, '_');
    if (!VALID_MEALS.includes(normalizedMealKey)) {
      return res.status(400).json({ message: `Invalid meal type: ${mealType}` });
    }

    const user = await User.findOne({ firebaseUid }).select('_id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dietLog = await DietLog.findOne({ user: user._id, date: today });
    if (!dietLog) {
      return res.status(404).json({ message: 'Diet log not found' });
    }

    const mealArray = dietLog.meals[normalizedMealKey];
    if (index < 0 || index >= mealArray.length) {
      return res.status(400).json({ message: 'Invalid food index' });
    }

    // Remove the item at specified index
    mealArray.splice(index, 1);

    // Save triggers pre('save') to recalculate totals automatically
    await dietLog.save();

    return res.status(200).json({ success: true, data: dietLog });
  } catch (error) {
    console.error('Error deleting food:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /DietLog/water
app.post('/DietLog/water', async (req, res) => {
  try {
    const firebaseUid = req.headers['firebase-uid'];
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized: firebase-uid missing' });
    }

    const { waterIntakeMl } = req.body;
    if (waterIntakeMl === undefined) {
      return res.status(400).json({ message: 'Missing waterIntakeMl' });
    }

    const user = await User.findOne({ firebaseUid }).select('_id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dietLog = await DietLog.findOne({ user: user._id, date: today });
    if (!dietLog) {
      dietLog = new DietLog({
        user: user._id,
        date: today,
        meals: {
          breakfast: [],
          lunch: [],
          snacks: [],
          dinner: [],
          pre_workout: [],
          post_workout: []
        }
      });
    }

    dietLog.waterIntakeMl = Number(waterIntakeMl);
    await dietLog.save();

    return res.status(200).json({ success: true, data: dietLog });
  } catch (error) {
    console.error('Error logging water:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// FatSecret Proxy Endpoints
// Mobile devices are blocked by FatSecret's IP whitelist (error code 21).
// The app calls these backend routes instead; the server makes the real request.
// ─────────────────────────────────────────────────────────────────────────────

const FS_TOKEN_URL  = 'https://oauth.fatsecret.com/connect/token';
const FS_API_URL    = 'https://platform.fatsecret.com/rest/server.api';
const FS_CLIENT_ID  = '197ebdcdca80403ebf89af543ac75dae';
const FS_CLIENT_SECRET = 'd7c83897f7e94d9a9b41361ad760484a';

// ── Local Fallback Database ──────────────────────────────────────────────────
const LOCAL_FOODS_DATABASE = [
  { id: 'local_01', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, type: 'Generic', description: 'Per 100g - Calories: 165kcal | Protein: 31g | Carbs: 0g | Fat: 3.6g' },
  { id: 'local_02', name: 'Egg Whole', calories: 155, protein: 13, carbs: 1.1, fat: 11, type: 'Generic', description: 'Per 100g - Calories: 155kcal | Protein: 13g | Carbs: 1.1g | Fat: 11g' },
  { id: 'local_03', name: 'Egg White', calories: 52, protein: 11, carbs: 0.7, fat: 0.2, type: 'Generic', description: 'Per 100g - Calories: 52kcal | Protein: 11g | Carbs: 0.7g | Fat: 0.2g' },
  { id: 'local_04', name: 'Oats (Raw)', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, type: 'Generic', description: 'Per 100g - Calories: 389kcal | Protein: 16.9g | Carbs: 66.3g | Fat: 6.9g' },
  { id: 'local_05', name: 'White Rice (Cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, type: 'Generic', description: 'Per 100g - Calories: 130kcal | Protein: 2.7g | Carbs: 28g | Fat: 0.3g' },
  { id: 'local_06', name: 'Brown Rice (Cooked)', calories: 111, protein: 2.6, carbs: 23, fat: 0.9, type: 'Generic', description: 'Per 100g - Calories: 111kcal | Protein: 2.6g | Carbs: 23g | Fat: 0.9g' },
  { id: 'local_07', name: 'Paneer (Cottage Cheese)', calories: 265, protein: 18, carbs: 1.2, fat: 20, type: 'Generic', description: 'Per 100g - Calories: 265kcal | Protein: 18g | Carbs: 1.2g | Fat: 20g' },
  { id: 'local_08', name: 'Roti / Chapati (Wheat)', calories: 264, protein: 9, carbs: 56, fat: 1.5, type: 'Generic', description: 'Per 100g - Calories: 264kcal | Protein: 9g | Carbs: 56g | Fat: 1.5g' },
  { id: 'local_09', name: 'Banana', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, type: 'Generic', description: 'Per 100g - Calories: 89kcal | Protein: 1.1g | Carbs: 22.8g | Fat: 0.3g' },
  { id: 'local_10', name: 'Apple', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, type: 'Generic', description: 'Per 100g - Calories: 52kcal | Protein: 0.3g | Carbs: 13.8g | Fat: 0.2g' },
  { id: 'local_11', name: 'Milk (Whole)', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, type: 'Generic', description: 'Per 100g - Calories: 61kcal | Protein: 3.2g | Carbs: 4.8g | Fat: 3.3g' },
  { id: 'local_12', name: 'Milk (Skimmed)', calories: 35, protein: 3.4, carbs: 5, fat: 0.1, type: 'Generic', description: 'Per 100g - Calories: 35kcal | Protein: 3.4g | Carbs: 5g | Fat: 0.1g' },
  { id: 'local_13', name: 'Greek Yogurt (Plain)', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, type: 'Generic', description: 'Per 100g - Calories: 59kcal | Protein: 10g | Carbs: 3.6g | Fat: 0.4g' },
  { id: 'local_14', name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 49, type: 'Generic', description: 'Per 100g - Calories: 579kcal | Protein: 21g | Carbs: 22g | Fat: 49g' },
  { id: 'local_15', name: 'Peanut Butter', calories: 588, protein: 25, carbs: 20, fat: 50, type: 'Generic', description: 'Per 100g - Calories: 588kcal | Protein: 25g | Carbs: 20g | Fat: 50g' },
  { id: 'local_16', name: 'Whey Protein Powder', calories: 390, protein: 80, carbs: 6, fat: 3, type: 'Generic', description: 'Per 100g - Calories: 390kcal | Protein: 80g | Carbs: 6g | Fat: 3g' },
  { id: 'local_17', name: 'Salmon Fillet (Baked)', calories: 208, protein: 20, carbs: 0, fat: 13, type: 'Generic', description: 'Per 100g - Calories: 208kcal | Protein: 20g | Carbs: 0g | Fat: 13g' },
  { id: 'local_18', name: 'Tofu (Firm)', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, type: 'Generic', description: 'Per 100g - Calories: 76kcal | Protein: 8g | Carbs: 1.9g | Fat: 4.8g' },
  { id: 'local_19', name: 'Dal (Yellow Lentil cooked)', calories: 116, protein: 9, carbs: 20, fat: 0.4, type: 'Generic', description: 'Per 100g - Calories: 116kcal | Protein: 9g | Carbs: 20g | Fat: 0.4g' },
  { id: 'local_20', name: 'Sweet Potato (Boiled)', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, type: 'Generic', description: 'Per 100g - Calories: 86kcal | Protein: 1.6g | Carbs: 20g | Fat: 0.1g' },
  { id: 'local_21', name: 'Potato (Boiled)', calories: 87, protein: 1.9, carbs: 20, fat: 0.1, type: 'Generic', description: 'Per 100g - Calories: 87kcal | Protein: 1.9g | Carbs: 20g | Fat: 0.1g' },
  { id: 'local_22', name: 'Broccoli (Raw)', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, type: 'Generic', description: 'Per 100g - Calories: 34kcal | Protein: 2.8g | Carbs: 7g | Fat: 0.4g' },
  { id: 'local_23', name: 'Spinach (Raw)', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, type: 'Generic', description: 'Per 100g - Calories: 23kcal | Protein: 2.9g | Carbs: 3.6g | Fat: 0.4g' },
  { id: 'local_24', name: 'Chicken Curry', calories: 180, protein: 18, carbs: 5, fat: 10, type: 'Generic', description: 'Per 100g - Calories: 180kcal | Protein: 18g | Carbs: 5g | Fat: 10g' },
  { id: 'local_25', name: 'Butter', calories: 717, protein: 0.9, carbs: 0.1, fat: 81, type: 'Generic', description: 'Per 100g - Calories: 717kcal | Protein: 0.9g | Carbs: 0.1g | Fat: 81g' },
  { id: 'local_26', name: 'Cheese (Cheddar)', calories: 403, protein: 25, carbs: 1.3, fat: 33, type: 'Generic', description: 'Per 100g - Calories: 403kcal | Protein: 25g | Carbs: 1.3g | Fat: 33g' },
  { id: 'local_27', name: 'Olive Oil', calories: 884, protein: 0, carbs: 0, fat: 100, type: 'Generic', description: 'Per 100g - Calories: 884kcal | Protein: 0g | Carbs: 0g | Fat: 100g' },
  { id: 'local_28', name: 'Naan Bread', calories: 310, protein: 9, carbs: 52, fat: 6, type: 'Generic', description: 'Per 100g - Calories: 310kcal | Protein: 9g | Carbs: 52g | Fat: 6g' },
  { id: 'local_29', name: 'Mixed Nuts', calories: 607, protein: 20, carbs: 21, fat: 54, type: 'Generic', description: 'Per 100g - Calories: 607kcal | Protein: 20g | Carbs: 21g | Fat: 54g' },
  { id: 'local_30', name: 'Moong Dal (Cooked)', calories: 105, protein: 7, carbs: 19, fat: 0.3, type: 'Generic', description: 'Per 100g - Calories: 105kcal | Protein: 7g | Carbs: 19g | Fat: 0.3g' },
  { id: 'local_31', name: 'Chana Masala', calories: 150, protein: 6, carbs: 22, fat: 4.5, type: 'Generic', description: 'Per 100g - Calories: 150kcal | Protein: 6g | Carbs: 22g | Fat: 4.5g' },
  { id: 'local_32', name: 'Samosa', calories: 262, protein: 4.5, carbs: 32, fat: 13, type: 'Generic', description: 'Per 100g - Calories: 262kcal | Protein: 4.5g | Carbs: 32g | Fat: 13g' },
  { id: 'local_33', name: 'Masala Dosa', calories: 168, protein: 3.9, carbs: 29, fat: 4.2, type: 'Generic', description: 'Per 100g - Calories: 168kcal | Protein: 3.9g | Carbs: 29g | Fat: 4.2g' },
  { id: 'local_34', name: 'Idli', calories: 39, protein: 1.2, carbs: 7.9, fat: 0.2, type: 'Generic', description: 'Per 100g - Calories: 39kcal | Protein: 1.2g | Carbs: 7.9g | Fat: 0.2g' },
  { id: 'local_35', name: 'Sambar', calories: 65, protein: 2.5, carbs: 11, fat: 1.2, type: 'Generic', description: 'Per 100g - Calories: 65kcal | Protein: 2.5g | Carbs: 11g | Fat: 1.2g' },
  { id: 'local_36', name: 'Poha', calories: 110, protein: 2.5, carbs: 23, fat: 1.2, type: 'Generic', description: 'Per 100g - Calories: 110kcal | Protein: 2.5g | Carbs: 23g | Fat: 1.2g' },
  { id: 'local_37', name: 'Rava Upma', calories: 132, protein: 3.4, carbs: 25, fat: 2.1, type: 'Generic', description: 'Per 100g - Calories: 132kcal | Protein: 3.4g | Carbs: 25g | Fat: 2.1g' },
  { id: 'local_38', name: 'Aloo Paratha', calories: 210, protein: 4.5, carbs: 35, fat: 6.2, type: 'Generic', description: 'Per 100g - Calories: 210kcal | Protein: 4.5g | Carbs: 35g | Fat: 6.2g' },
  { id: 'local_39', name: 'Biryani (Chicken)', calories: 150, protein: 8.5, carbs: 18, fat: 5, type: 'Generic', description: 'Per 100g - Calories: 150kcal | Protein: 8.5g | Carbs: 18g | Fat: 5g' },
  { id: 'local_40', name: 'Fish Curry', calories: 120, protein: 14, carbs: 3.5, fat: 5.5, type: 'Generic', description: 'Per 100g - Calories: 120kcal | Protein: 14g | Carbs: 3.5g | Fat: 5.5g' },
  { id: 'local_41', name: 'Avocado', calories: 160, protein: 2, carbs: 8.5, fat: 14.7, type: 'Generic', description: 'Per 100g - Calories: 160kcal | Protein: 2g | Carbs: 8.5g | Fat: 14.7g' },
  { id: 'local_42', name: 'Orange', calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, type: 'Generic', description: 'Per 100g - Calories: 47kcal | Protein: 0.9g | Carbs: 11.8g | Fat: 0.1g' },
  { id: 'local_43', name: 'Blueberries', calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, type: 'Generic', description: 'Per 100g - Calories: 57kcal | Protein: 0.7g | Carbs: 14.5g | Fat: 0.3g' },
  { id: 'local_44', name: 'Strawberries', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, type: 'Generic', description: 'Per 100g - Calories: 32kcal | Protein: 0.7g | Carbs: 7.7g | Fat: 0.3g' },
  { id: 'local_45', name: 'Walnuts', calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, type: 'Generic', description: 'Per 100g - Calories: 654kcal | Protein: 15.2g | Carbs: 13.7g | Fat: 65.2g' },
  { id: 'local_46', name: 'Cashew Nuts', calories: 553, protein: 18.2, carbs: 30.2, fat: 43.8, type: 'Generic', description: 'Per 100g - Calories: 553kcal | Protein: 18.2g | Carbs: 30.2g | Fat: 43.8g' },
  { id: 'local_47', name: 'Tuna (Canned in water)', calories: 116, protein: 26, carbs: 0, fat: 1, type: 'Generic', description: 'Per 100g - Calories: 116kcal | Protein: 26g | Carbs: 0g | Fat: 1g' },
  { id: 'local_48', name: 'Beef Steak', calories: 244, protein: 27, carbs: 0, fat: 15, type: 'Generic', description: 'Per 100g - Calories: 244kcal | Protein: 27g | Carbs: 0g | Fat: 15g' },
  { id: 'local_49', name: 'Turkey Breast (Cooked)', calories: 135, protein: 30, carbs: 0, fat: 1.2, type: 'Generic', description: 'Per 100g - Calories: 135kcal | Protein: 30g | Carbs: 0g | Fat: 1.2g' },
  { id: 'local_50', name: 'Quinoa (Cooked)', calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, type: 'Generic', description: 'Per 100g - Calories: 120kcal | Protein: 4.4g | Carbs: 21.3g | Fat: 1.9g' },
  { id: 'local_51', name: 'Soy Milk', calories: 54, protein: 3.3, carbs: 6, fat: 1.8, type: 'Generic', description: 'Per 100g - Calories: 54kcal | Protein: 3.3g | Carbs: 6g | Fat: 1.8g' },
  { id: 'local_52', name: 'Almond Milk (Unsweetened)', calories: 15, protein: 0.4, carbs: 0.3, fat: 1.1, type: 'Generic', description: 'Per 100g - Calories: 15kcal | Protein: 0.4g | Carbs: 0.3g | Fat: 1.1g' },
  { id: 'local_53', name: 'Chia Seeds', calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7, type: 'Generic', description: 'Per 100g - Calories: 486kcal | Protein: 16.5g | Carbs: 42.1g | Fat: 30.7g' },
  { id: 'local_54', name: 'Paneer Tikka', calories: 190, protein: 12, carbs: 4.5, fat: 14, type: 'Generic', description: 'Per 100g - Calories: 190kcal | Protein: 12g | Carbs: 4.5g | Fat: 14g' },
  { id: 'local_55', name: 'Dal Makhani', calories: 160, protein: 5.5, carbs: 18.5, fat: 7.2, type: 'Generic', description: 'Per 100g - Calories: 160kcal | Protein: 5.5g | Carbs: 18.5g | Fat: 7.2g' },
  { id: 'local_56', name: 'Palak Paneer', calories: 145, protein: 7.5, carbs: 6.2, fat: 11, type: 'Generic', description: 'Per 100g - Calories: 145kcal | Protein: 7.5g | Carbs: 6.2g | Fat: 11g' },
  { id: 'local_57', name: 'Butter Chicken', calories: 220, protein: 16, carbs: 8.5, fat: 14.5, type: 'Generic', description: 'Per 100g - Calories: 220kcal | Protein: 16g | Carbs: 8.5g | Fat: 14.5g' },
];

const searchLocalFoods = (query, max) => {
  if (!query) return [];
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return [];

  let matches = LOCAL_FOODS_DATABASE.filter(food => {
    const name = food.name.toLowerCase();
    return terms.every(term => name.includes(term));
  });

  if (matches.length === 0) {
    matches = LOCAL_FOODS_DATABASE.filter(food => {
      const name = food.name.toLowerCase();
      return terms.some(term => name.includes(term));
    });
  }

  return matches.sort((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();
    const qLower = query.toLowerCase();

    if (aLower === qLower) return -1;
    if (bLower === qLower) return 1;

    const aStart = aLower.startsWith(qLower);
    const bStart = bLower.startsWith(qLower);
    if (aStart && !bStart) return -1;
    if (!aStart && bStart) return 1;

    return a.name.localeCompare(b.name);
  }).slice(0, max);
};

// ── Token cache (in-memory, reused until 60 s before expiry) ─────────────────
let fsToken       = null;
let fsTokenExpiry = 0;

const getFatSecretToken = async () => {
  if (fsToken && Date.now() < fsTokenExpiry) return fsToken;

  const credentials = Buffer.from(`${FS_CLIENT_ID}:${FS_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(FS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FatSecret token error ${res.status}: ${text}`);
  }

  const data = await res.json();
  fsToken       = data.access_token;
  fsTokenExpiry = Date.now() + ((data.expires_in ?? 86400) - 60) * 1000;
  console.log('[FatSecret] Token refreshed, expires in', data.expires_in, 's');
  return fsToken;
};

const fsBuildQuery = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

const fsRequest = async (params) => {
  const token = await getFatSecretToken();
  const qs    = fsBuildQuery({ format: 'json', ...params });
  const url   = `${FS_API_URL}?${qs}`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FatSecret API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json?.error) throw new Error(`FatSecret error ${json.error.code}: ${json.error.message}`);
  return json;
};

// ── Normalise a search result ─────────────────────────────────────────────────
const normaliseFsFood = (food) => {
  const desc = food.food_description || '';
  const extract = (label) => {
    const m = desc.match(new RegExp(`${label}:\\s*([\\d.]+)`, 'i'));
    return m ? parseFloat(m[1]) : 0;
  };
  return {
    id:          food.food_id,
    name:        food.food_name    || 'Unknown',
    brand:       food.brand_name   || null,
    type:        food.food_type    || 'Generic',
    description: desc,
    calories:    extract('Calories'),
    fat:         extract('Fat'),
    carbs:       extract('Carbs'),
    protein:     extract('Protein'),
    url:         food.food_url     || null,
  };
};

// GET /food/search?q=chicken&max=20
app.get('/food/search', async (req, res) => {
  const query  = (req.query.q || '').trim();
  const max    = Math.min(parseInt(req.query.max || 20, 10), 50);

  if (!query) return res.status(400).json({ error: 'Missing query param ?q=' });

  try {
    const data  = await fsRequest({ method: 'foods.search', search_expression: query, max_results: max, page_number: 0 });
    const foods = data?.foods?.food;
    if (!foods) return res.json({ results: [] });
    const arr   = Array.isArray(foods) ? foods : [foods];
    res.json({ results: arr.map(normaliseFsFood), total: arr.length });
  } catch (err) {
    console.warn(`[FatSecret proxy /food/search] API failed: ${err.message}. Falling back to local search database.`);
    const fallbackResults = searchLocalFoods(query, max);
    res.json({ results: fallbackResults, total: fallbackResults.length, fallback: true });
  }
});

// GET /food/:id
app.get('/food/:id', async (req, res) => {
  const foodId = req.params.id;
  if (!foodId) return res.status(400).json({ error: 'Missing food id' });

  // Handle local fallback IDs directly
  if (String(foodId).startsWith('local_')) {
    const localFood = LOCAL_FOODS_DATABASE.find(f => f.id === foodId);
    if (localFood) {
      return res.json({ food: localFood });
    }
  }

  try {
    const data = await fsRequest({ method: 'food.get.v2', food_id: foodId });
    res.json(data);
  } catch (err) {
    console.warn(`[FatSecret proxy /food/:id] API failed: ${err.message}. Checking local database.`);
    const localFood = LOCAL_FOODS_DATABASE.find(f => f.id === foodId || f.name.toLowerCase() === String(foodId).toLowerCase());
    if (localFood) {
      return res.json({ food: localFood });
    }
    res.status(502).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})

