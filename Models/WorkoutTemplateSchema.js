import mongoose from 'mongoose';

const RoutineExerciseSchema = new mongoose.Schema({
  exercise_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
  sets: { type: Number, default: 3 },
  reps: { type: Number },
  duration_seconds: { type: Number },
  rest_seconds: { type: Number, default: 30 }
}, { _id: false });

const WorkoutTemplateSchema = new mongoose.Schema({
  workout_id: { type: String, required: true, unique: true },
  category_id: { type: String, required: true, enum: ['Abs', 'Arm', 'Chest', 'Leg', 'Shoulder', 'Full Body', 'Cardio'] },
  title: { type: String, required: true },
  total_duration_minutes: { type: Number, required: true },
  difficulty_rating: { type: Number, required: true, min: 1, max: 3 },
  thumbnail_image: { type: String, default: 'https://via.placeholder.com/150' },
  exercises_sequence: [RoutineExerciseSchema],
  is_premium: { type: Boolean, default: false }
}, { timestamps: true });

export const WorkoutTemplate = mongoose.model('WorkoutTemplate', WorkoutTemplateSchema);
