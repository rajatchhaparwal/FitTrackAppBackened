import mongoose from "mongoose";
import User from "./UserSchemaModel";

const DietSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // The Budget calculated based on users height/weight/goal
    targets: {
        dailyCalories: { type: Number, required: true, default: 2000 },
        macros: {
            protein: { type: Number, default: 120 }, // in grams
            carbs: { type: Number, default: 250 },
            fats: { type: Number, default: 60 }
        },
        waterLiters: { type: Number, default: 3.5 },
        sleepHours: { type: Number, default: 8 }
    },
    // Preference settings for AI meal recommendations
    preferences: {
        dietType: { type: String, enum: ['Veg', 'Non-Veg', 'Vegan', 'Keto', 'Pescatarian'], default: 'Veg' },
        allergies: [String],
        excludedFoods: [String]
    },
    // Daily tracking logs (This grows as the user logs food)
    dailyLogs: [{
        date: { type: String, required: true }, // "YYYY-MM-DD"
        waterIntake: { type: Number, default: 0 }, // glasses/ml
        
        // Slot-based meal tracking
        meals: {
            breakfast: [{
                foodName: String,
                quantity: Number, // e.g., 2
                unit: String,     // e.g., "pieces", "gms", "bowl"
                calories: Number,
                macros: { p: Number, c: Number, f: Number },
                isVerified: { type: Boolean, default: false } // If it came from your official DB
            }],
            lunch: [{
                foodName: String,
                quantity: Number, // e.g., 2
                unit: String,     // e.g., "pieces", "gms", "bowl"
                calories: Number,
                macros: { p: Number, c: Number, f: Number },
                isVerified: { type: Boolean, default: false } // If it came from your official DB
            }],
            snacks: [{
                foodName: String,
                quantity: Number, // e.g., 2
                unit: String,     // e.g., "pieces", "gms", "bowl"
                calories: Number,
                macros: { p: Number, c: Number, f: Number },
                isVerified: { type: Boolean, default: false } // If it came from your official DB
            }],
            dinner: [{
                foodName: String,
                quantity: Number, // e.g., 2
                unit: String,     // e.g., "pieces", "gms", "bowl"
                calories: Number,
                macros: { p: Number, c: Number, f: Number },
                isVerified: { type: Boolean, default: false } // If it came from your official DB
            }]
        },
        
        totalCaloriesConsumed: { type: Number, default: 0 },
        notes: String
    }]
}, { timestamps: true });

// Middleware to calculate total calories before saving
DietSchema.pre('save', function(next) {
    // You can add logic here to auto-sum calories based on macros
    next();
});

const UserDiet = mongoose.model('UserDiet', DietSchema);
export default UserDiet;