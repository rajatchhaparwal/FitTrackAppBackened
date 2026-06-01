import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  firebaseUid: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  phoneNumber: { 
    type: String, 
    required: true,
  },

  onboardingCompleted: { 
    type: Boolean, 
    default: false 
  },

  name: { 
    type: String, 
    default: "" 
  },
  age: { 
    type: Number, 
    default: null 
  },
  weight: { 
    type: Number,
    default: null 
  },
  height: { 
    type: Number,
    default: null
  },

  selectedHabits: {
    type: [String],
    default: []
  },

  baselineActivityLevel: {
    type: String,
    enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active'],
    default: 'sedentary'
  },


  injuryNotes: {
    type: String,
    default: null
  },

  country: {
    type: String,
    default: ""
  },

  goal: {
    type: String,
    enum: ['weight_loss', 'muscle_gain','weight_gain','Plan_meals','maintenance', 'Modify_my_diet'],
    default: 'healthy_habits'
  },

  personalPlan: {
    dailyCalories: { type: Number, default: 0 },
    proteinGrams: { type: Number, default: 0 },
    carbGrams: { type: Number, default: 0 },
    fatGrams: { type: Number, default: 0 }
  },


  /* fitness_level:   { type: String, enum: ["Beginner", "Intermediate", "Advanced"] },
      daily_calorie_goal:   { type: Number },
      daily_water_goal_ml:  { type: Number, default: 2000 },
    },

    preferences: {
      preferred_equipment: { type: [String], default: [] },
      preferred_categories: { type: [String], default: [] },
      rest_day_notifications: { type: Boolean, default: true },
      workout_reminder_time: { type: String },     // e.g. "07:30"
      units:  { type: String, enum: ["metric", "imperial"], default: "metric" },
      theme:  { type: String, enum: ["light", "dark"], default: "dark" },
    },

    stats: {
      total_workouts:        { type: Number, default: 0 },
      total_calories_burned: { type: Number, default: 0 },
      total_workout_minutes: { type: Number, default: 0 },
      current_streak_days:   { type: Number, default: 0 },
      longest_streak_days:   { type: Number, default: 0 },
      last_workout_date:     { type: Date },
    },
 */
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

const User = mongoose.models.AppUser || mongoose.model('AppUser', UserSchema);
export default User;