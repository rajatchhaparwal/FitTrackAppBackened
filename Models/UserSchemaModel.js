import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  phoneNumber: { type: String, required: true },

  onboardingCompleted: { type: Boolean, default: false },

  name: { type: String, default: '' },
  age: { type: Number, default: null },
  weight: { type: Number, default: null },
  height: { type: Number, default: null },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    default: null,
  },
  bodyFatPercentage: { type: Number, default: null },
  selectedHabits: { type: [String], default: [] },
  injuries: {
    type: [String],
    default: [],
  },
  injuryNotes: { type: String, default: null },
  country: { type: String, default: '' },

  baselineActivityLevel: {
    type: String,
    enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active'],
    default: 'sedentary',
  },

  fitnessLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: null,
  },

  weeklyWorkoutDays: {
    type: Number,
    min: 1,
    max: 7,
    default: 3,
  },

  goal: {
    type: String,
    enum: [
      'weight_loss',
      'muscle_gain',
      'weight_gain',
      'Plan_meals',
      'maintenance',
      'Modify_my_diet',
      'endurance',
    ],
    default: null,
  },

  personalPlan: {
    dailyCalories: { type: Number, default: 0 },
    proteinGrams: { type: Number, default: 0 },
    carbGrams: { type: Number, default: 0 },
    fatGrams: { type: Number, default: 0 },
  },

  daily_water_goal_ml: { type: Number, default: 2000 },

  preferences: {
    preferred_equipment: { type: [String], default: [] },
    preferred_categories: { type: [String], default: [] },
    rest_day_notifications: { type: Boolean, default: true },
    workout_reminder_time: { type: String },
    units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
  },

  stats: {
    total_workouts: { type: Number, default: 0 },
    total_calories_burned: { type: Number, default: 0 },
    total_workout_minutes: { type: Number, default: 0 },
    current_streak_days: { type: Number, default: 0 },
    longest_streak_days: { type: Number, default: 0 },
    last_workout_date: { type: Date },
  },
}, {
  timestamps: true,
});

const User = mongoose.models.AppUser || mongoose.model('AppUser', UserSchema);
export default User;
