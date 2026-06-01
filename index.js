import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js'; 
import User from './Models/UserSchemaModel.js'
import Exercise from './Exercisedata/schemaForExercsise/exerciseSchema.js'
import PoseConfig from './Exercisedata/schemaForExercsise/PoseConfigSchema.js';
import cors from  'cors';
import analyzeFoodNutrition from './Api/CaptureImage.js';
import fs from 'fs'; 
import multer from 'multer';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());
connectDB();
app.use(cors());

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
        strict:false,
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

app.post('/CapturedImage', upload.single('mealImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image uploaded" });
        }

        console.log("Image received:", req.file.path);

        const aiResult = await analyzeFoodNutrition(req.file.path);
        console.Console(aiResult);
        
        res.status(200).json({ 
            message: "Image processed successfully!",
            data: aiResult 
        });

    } catch (error) {
        console.error("Processing error:", error);
        res.status(500).json({ error: "Failed to process image: " + error.message });
    }
});

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

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
