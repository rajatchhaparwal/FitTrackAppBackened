import mongoose from 'mongoose';

const UserDietProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppUser',
    required: true,
    unique: true,
    index: true,
  },

  targets: {
    dailyCalories: { type: Number, default: 2000 },
    proteinGrams: { type: Number, default: 120 },
    carbsGrams: { type: Number, default: 250 },
    fatGrams: { type: Number, default: 60 },
    waterGoalMl: { type: Number, default: 3500 },
    sleepHours: { type: Number, default: 8 },
  },

  preferences: {
    dietType: {
      type: String,
      enum: ['veg', 'non_veg', 'vegan', 'keto', 'pescatarian'],
      default: 'veg',
    },
    allergies: { type: [String], default: [] },
    excludedFoods: { type: [String], default: [] },
  },
}, { timestamps: true });

export const UserDietProfile = mongoose.models.UserDietProfile
  || mongoose.model('UserDietProfile', UserDietProfileSchema);
