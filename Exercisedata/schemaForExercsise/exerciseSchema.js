/**
 * FitTrack - Master Exercise Schema
 * Collection: exercises
 */
import mongoose from "mongoose";
const { Schema } = mongoose;

const CaloriesPerWeightSchema = new Schema(
  {
    "50kg": { type: Number },
    "60kg": { type: Number },
    "70kg": { type: Number },
    "80kg": { type: Number },
    "90kg": { type: Number },
  },
  { _id: false }
);

const ChartDataSchema = new Schema(
  {
    x_label:             { type: String, required: true },
    y_label:             { type: String, required: true },
    progress_type:       { type: String, enum: ["reps", "weight", "duration", "distance"], required: true },
    beginner_target:     { type: [Number], default: [] },
    intermediate_target: { type: [Number], default: [] },
    advanced_target:     { type: [Number], default: [] },
  },
  { _id: false }
);

const InstructorSchema = new Schema(
  {
    starting_position: { type: String, required: true },
    steps:             { type: [String], required: true },
    common_mistakes:   { type: [String], default: [] },
    tips:              { type: String },
    video_tag:         { type: String },
    animation_frames:  { type: Number },
    image_placeholder: { type: String },
  },
  { _id: false }
);

const ExerciseSchema = new Schema(
  {
    exercise_id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ["Strength", "Cardio", "Flexibility", "Core", "HIIT", "Balance"],
      index: true,
    },
    muscle_groups: {
      primary:   { type: [String], required: true },
      secondary: { type: [String], default: [] },
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["Beginner", "Intermediate", "Advanced"],
      index: true,
    },
    equipment: {
      type: String,
      required: true,
      enum: [
        "No Equipment", "Dumbbells", "Barbell", "Resistance Band",
        "Pull-up Bar", "Bench", "Kettlebell", "Treadmill", "Jump Rope",
      ],
    },
    met_value:                      { type: Number, required: true, min: 0 },
    calories_per_minute:            { type: CaloriesPerWeightSchema, required: true },
    calories_burned_per_set_approx: { type: CaloriesPerWeightSchema },
    sets_reps_default: {
      sets:             { type: Number },
      reps:             { type: Number, default: null },
      duration_seconds: { type: Number, default: null },
      duration_minutes: { type: Number, default: null },
      rest_seconds:     { type: Number },
    },
    duration_minutes_per_set: { type: Number },
    chart_data:               { type: ChartDataSchema },
    instructor:               { type: InstructorSchema, required: true },
    is_active:                { type: Boolean, default: true },
    tags:                     { type: [String], default: [] },
  },
  {
    timestamps: true,
    collection: "exercises",
  }
);

ExerciseSchema.index({ category: 1, difficulty: 1 });
ExerciseSchema.index({ name: "text", tags: "text" });

const Exercise = mongoose.model("Exercise", ExerciseSchema);
export default Exercise