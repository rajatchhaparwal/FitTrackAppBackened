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
    console.error('[FatSecret proxy /food/search]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /food/:id
app.get('/food/:id', async (req, res) => {
  const foodId = req.params.id;
  if (!foodId) return res.status(400).json({ error: 'Missing food id' });

  try {
    const data = await fsRequest({ method: 'food.get.v2', food_id: foodId });
    res.json(data);
  } catch (err) {
    console.error('[FatSecret proxy /food/:id]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})

