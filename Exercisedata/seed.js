/**
 * FitTrack Database Seeding Script
 * Run with command: node seed.js
 */

import mongoose from "mongoose";
// Import your models (Make sure paths match your project structure)
import Exercise from './schemaForExercsise/exerciseSchema.js'
import PoseConfig from './schemaForExercsise/PoseConfigSchema.js'

// MongoDB Connection URI (Replace with your actual database connection string)
const MONGO_URI = "mongodb://127.0.0.1:27017/fittrack";

// 1. Define Master Exercise Raw Data
const sampleExerciseData = {
  exercise_id: "EX015",
  name: "Dumbbell Bicep Curl",
  category: "Strength",
  muscle_groups: {
    primary: ["Biceps Brachii"],
    secondary: ["Brachialis", "Forearms"]
  },
  difficulty: "Beginner",
  equipment: "Dumbbells",
  met_value: 4.5,
  calories_per_minute: {
    "50kg": 3.8, "60kg": 4.5, "70kg": 5.3, "80kg": 6.0, "90kg": 6.8
  },
  calories_burned_per_set_approx: {
    "50kg": 1.9, "60kg": 2.3, "70kg": 2.7, "80kg": 3.0, "90kg": 3.4
  },
  sets_reps_default: {
    sets: 3,
    reps: 12,
    rest_seconds: 60
  },
  duration_minutes_per_set: 0.5,
  chart_data: {
    x_label: "Week",
    y_label: "Weight (kg)",
    progress_type: "weight",
    beginner_target: [5, 7.5, 10, 10, 12.5],
    intermediate_target: [12.5, 15, 15, 17.5, 20],
    advanced_target: [20, 22.5, 25, 27.5, 30]
  },
  instructor: {
    starting_position: "Stand upright with a dumbbell in each hand at arm's length. Keep your elbows close to your torso.",
    steps: [
      "Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.",
      "Continue to raise the dumbbells until the weights are at shoulder level.",
      "Hold the contracted position for a brief pause as you squeeze.",
      "Inhale and slowly begin to lower the dumbbells back to the starting position."
    ],
    common_mistakes: [
      "Swinging your body or leaning backward to cheat the weight up.",
      "Allowing your elbows to flare out wide away from your ribs."
    ],
    tips: "Keep your core engaged and knees slightly bent to stabilize your lower back.",
    video_tag: "bicep_curl_tutorial",
    animation_frames: 12,
    image_placeholder: "bicep_curl_preview.png"
  },
  is_active: true,
  tags: ["biceps", "arms", "curls", "dumbbell"]
};

// 2. Define Pose Configuration Data Factory (Will receive exercise_ref dynamically)
const samplePoseConfigDataFactory = (exerciseObjectId) => ({
  exercise_ref: exerciseObjectId, // Linked dynamic ID injected here
  exercise_id: "EX015",
  is_supported: true,
  framework_mode: "pose_landmarks_3d",
  required_landmarks: [
    "RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST", "RIGHT_HIP", "RIGHT_KNEE"
  ],
  metrics_calculation: {
    evaluation_type: "dynamic_rep_counter",
    target_angle_points: {
      vertex: "RIGHT_ELBOW",
      point_a: "RIGHT_SHOULDER",
      point_b: "RIGHT_WRIST"
    },
    thresholds: {
      state_rest_angle: 165,
      state_peak_angle: 50,
      rep_complete_tolerance: 15
    },
    live_corrections: [
      {
        condition: "custom_eval.calculate_angle(RIGHT_SHOULDER, RIGHT_HIP, RIGHT_KNEE) < 160",
        trigger_flag: "LEAN_BACK",
        voice_alert: "Don't lean back. Keep your torso upright.",
        ui_banner: "⚠ Leaning Back — Sit Upright"
      },
      {
        condition: "custom_eval.calculate_lateral_deviation(RIGHT_ELBOW, RIGHT_SHOULDER, RIGHT_HIP) > 40",
        trigger_flag: "ELBOW_WIDE",
        voice_alert: "Keep your elbows close to your sides.",
        ui_banner: "⚠ Elbows Flaring Out"
      }
    ]
  }
});

// 3. Database Async Seeding Pipeline Logic
const seedDatabase = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect('mongodb://127.0.0.1:27017/FitTrackApp');
    console.log("Database connected successfully.");

    // Optional: Wipe old data to avoid unique duplicate key index errors during development tests
    await Exercise.deleteMany({ exercise_id: "EX015" });
    await PoseConfig.deleteMany({ exercise_id: "EX015" });
    console.log("Cleared existing sample documents from collections.");

    // STEP A: Insert core exercise data first
    console.log("Seeding Master Exercise data...");
    const seededExercise = await Exercise.create(sampleExerciseData);
    console.log(`Successfully seeded Exercise! Generated ID: ${seededExercise._id}`);

    // STEP B: Generate pose mapping configuration using the new identity key reference
    console.log("Generating dependent Pose Configuration relational map...");
    const finalizedPoseConfigData = samplePoseConfigDataFactory(seededExercise._id);

    // STEP C: Insert tracking settings document safely matching relationships
    const seededPoseConfig = await PoseConfig.create(finalizedPoseConfigData);
    console.log(`Successfully seeded corresponding Pose Configuration! Generated ID: ${seededPoseConfig._id}`);

    console.log("\n All records written to your collections flawlessly!");
  } catch (error) {
    console.error("❌ Critical Seeding Error encountered:", error.message);
  } finally {
    // Always terminate the mongoose pool stream connection when executing scripts
    await mongoose.connection.close();
    console.log("Mongoose pool connection closed cleanly.");
    process.exit(0);
  }
};

// Execute seeding pipeline script
seedDatabase();