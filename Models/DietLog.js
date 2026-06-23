// One document per user per day — this is what grows over time
import mongoose from "mongoose";

const FoodItemSchema = new mongoose.Schema({
  foodName:  { type: String, required: true },
  quantity:  { type: Number, required: true },
  unit:      { type: String, default: 'grams' },

  calories:  { type: Number, default: 0 },
  proteinG:  { type: Number, default: 0 },
  carbsG:    { type: Number, default: 0 },
  fatG:      { type: Number, default: 0 },
  fiberG:    { type: Number, default: 0 }, 
  sugarG:    { type: Number, default: 0 }, 
  sodiumMg:  { type: Number, default: 0 }, 

  loggedAt:  { type: String, default: () => new Date().toTimeString().slice(0, 5) },
  source: {
    type: String,
    enum: ['manual', 'barcode', 'ai_photo', 'search'],
    default: 'manual'
  },
  imageUrl:   { type: String, default: null }, // from NutritionLog
  isVerified: { type: Boolean, default: false }
}, { _id: false });


const DietLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppUser',
    required: true,
    index: true
  },

  date: { type: Date, required: true },

  meals: {
    breakfast:   { type: [FoodItemSchema], default: [] },
    lunch:       { type: [FoodItemSchema], default: [] },
    snacks:      { type: [FoodItemSchema], default: [] },
    dinner:      { type: [FoodItemSchema], default: [] },
    pre_workout: { type: [FoodItemSchema], default: [] },  // from NutritionLog
    post_workout:{ type: [FoodItemSchema], default: [] }   // from NutritionLog
  },

  waterIntakeMl: { type: Number, default: 0 },
  sleepHours:    { type: Number, default: null },

  // Pre-calculated — updated by pre('save') hook
  dailyTotals: {
    calories:  { type: Number, default: 0 },
    proteinG:  { type: Number, default: 0 },
    carbsG:    { type: Number, default: 0 },
    fatG:      { type: Number, default: 0 },
    fiberG:    { type: Number, default: 0 }
  },

  // Snapshot of goals on this day — from NutritionLog
  // Copied from UserDietProfile at log creation time
  // Reason: user might change goals later, historical logs must stay accurate
  goalSnapshot: {
    caloriesGoal: { type: Number },
    proteinGoal:  { type: Number },
    carbsGoal:    { type: Number },
    fatGoal:      { type: Number }
  },

  notes: { type: String }

}, { timestamps: true });


// Auto-calculate dailyTotals on every save
DietLogSchema.pre('save', function() {
  const allFoods = [
    ...(this.meals.breakfast || []),
    ...(this.meals.lunch || []),
    ...(this.meals.snacks || []),
    ...(this.meals.dinner || []),
    ...(this.meals.pre_workout || []),
    ...(this.meals.post_workout || [])
  ];

  this.dailyTotals = allFoods.reduce((totals, food) => ({
    calories: totals.calories + (food.calories || 0),
    proteinG: totals.proteinG + (food.proteinG  || 0),
    carbsG:   totals.carbsG   + (food.carbsG    || 0),
    fatG:     totals.fatG     + (food.fatG       || 0),
    fiberG:   totals.fiberG   + (food.fiberG     || 0)
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 });
});

DietLogSchema.index({ user: 1, date: -1 });
DietLogSchema.index({ user: 1, date: 1 }, { unique: true });


export const DietLog = mongoose.model('DietLog', DietLogSchema);