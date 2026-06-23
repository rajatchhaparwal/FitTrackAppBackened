import mongoose from 'mongoose';

const WorkoutLogSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    index: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppUser',
    index: true,
  },

  date: { type: Date, default: Date.now },
  startTime: { type: Date },
  endTime: { type: Date },
  durationMins: { type: Number },
  workoutType: {
    type: String,
    enum: ['strength', 'cardio', 'yoga', 'hiit', 'flexibility', 'sports'],
    required: true,
  },
  title: { type: String },
  notes: { type: String },

  exercises: [{
    exerciseId: { type: String },
    exerciseName: { type: String },
    muscleGroup: { type: String },
    sets: [{
      setNumber: { type: Number },
      reps: { type: Number },
      weightKg: { type: Number },
      isBodyweight: { type: Boolean, default: false },
      completed: { type: Boolean, default: true },
    }],
    cardio: {
      distanceKm: { type: Number },
      durationMins: { type: Number },
      avgHeartRate: { type: Number },
      calories: { type: Number },
    },
    restTimeSecs: { type: Number },
    notes: { type: String },
  }],

  summary: {
    totalCaloriesBurned: { type: Number },
    totalVolume: { type: Number },
    totalSets: { type: Number },
    totalReps: { type: Number },
    avgHeartRate: { type: Number },
  },

  poseData: {
    formScore: { type: Number },
    repCount: { type: Number },
    formIssues: { type: [String] },
  },

  source: {
    type: String,
    enum: ['manual', 'ai_recommended', 'custom'],
    default: 'manual',
  },
}, { timestamps: true });

WorkoutLogSchema.index({ userId: 1, date: -1 });
WorkoutLogSchema.index({ firebaseUid: 1, date: -1 });
WorkoutLogSchema.index({ userId: 1, workoutType: 1 });

const WorkoutLog = mongoose.model('WorkoutLog', WorkoutLogSchema);
export default WorkoutLog;
