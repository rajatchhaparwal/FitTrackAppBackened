/**
 * FitTrack - Pose Configurations
 * Collection: pose_configs
 */
import mongoose from "mongoose";
const { Schema } = mongoose;

const LiveCorrectionSchema = new Schema(
  {
    condition:    { type: String, required: true }, // e.g., "angle < 165"
    trigger_flag: { type: String, required: true }, // e.g., "HIP_SAG"
    voice_alert:  { type: String, required: true }, // Audio Text-to-Speech prompt
    ui_banner:    { type: String, required: true }, // UI overlay text banner
  },
  { _id: false }
);

const TargetAnglePointsSchema = new Schema(
  {
    vertex:  { type: String, required: true },     // Center tracking joint (e.g., "LEFT_ELBOW")
    point_a: { type: String, required: true },     // Extension endpoint A (e.g., "LEFT_SHOULDER")
    point_b: { type: String, required: true },     // Extension endpoint B (e.g., "LEFT_WRIST")
  },
  { _id: false }
);

const PoseConfigSchema = new Schema(
  {
    exercise_ref: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
      unique: true,                                // One tracking configuration per exercise
      index: true,
    },
    exercise_id:        { type: String, required: true, uppercase: true }, // Human fallback (e.g., "EX001")
    is_supported:       { type: Boolean, default: true },
    framework_mode:     { type: String, enum: ["pose_landmarks_2d", "pose_landmarks_3d"], default: "pose_landmarks_3d" },
    required_landmarks: { type: [String], default: [] }, // Filtered keypoint arrays passed to frontend
    metrics_calculation: {
      evaluation_type:  { type: String, enum: ["static_hold_alignment", "dynamic_rep_counter"], required: true },
      target_angle_points: { type: TargetAnglePointsSchema },
      thresholds: {
        // Alignment Thresholds for Hold layouts (e.g., Planks)
        perfect_score_angle:        { type: Number, default: null },
        max_allowable_deviation:    { type: Number, default: null },
        min_hold_stability_seconds: { type: Number, default: null },
        
        // Counter Thresholds for Moving reps (e.g., Push-ups, Squats)
        state_rest_angle:           { type: Number, default: null },
        state_peak_angle:           { type: Number, default: null },
        rep_complete_tolerance:     { type: Number, default: null },
      },
      live_corrections: { type: [LiveCorrectionSchema], default: [] }
    }
  },
  {
    timestamps: true,
    collection: "pose_configs",
  }
);

const PoseConfig = mongoose.model("PoseConfig", PoseConfigSchema);
export default PoseConfig ;