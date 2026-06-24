import mongoose from "mongoose";
import Exercise from "../Exercisedata/schemaForExercsise/exerciseSchema.js";
import { WorkoutTemplate } from "../Models/WorkoutTemplateSchema.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: '../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base exercises data to dynamically generate 200 high-quality, realistic exercises
const baseExercises = [
  // 1-10: Strength - Chest / Arms / Shoulders
  { name: "Push-Up", category: "Strength", primary: ["Chest"], secondary: ["Arms", "Shoulders"], equipment: "No Equipment", met: 3.8 },
  { name: "Bench Press", category: "Strength", primary: ["Chest"], secondary: ["Shoulders", "Arms"], equipment: "Barbell", met: 6.0 },
  { name: "Dumbbell Fly", category: "Strength", primary: ["Chest"], secondary: ["Shoulders"], equipment: "Dumbbells", met: 3.5 },
  { name: "Incline Chest Press", category: "Strength", primary: ["Chest"], secondary: ["Shoulders", "Arms"], equipment: "Dumbbells", met: 5.0 },
  { name: "Dips", category: "Strength", primary: ["Arms"], secondary: ["Chest", "Shoulders"], equipment: "No Equipment", met: 4.0 },
  { name: "Bicep Curl", category: "Strength", primary: ["Arms"], secondary: [], equipment: "Dumbbells", met: 3.0 },
  { name: "Tricep Extension", category: "Strength", primary: ["Arms"], secondary: [], equipment: "Dumbbells", met: 3.0 },
  { name: "Shoulder Press", category: "Strength", primary: ["Shoulders"], secondary: ["Arms"], equipment: "Dumbbells", met: 4.5 },
  { name: "Lateral Raise", category: "Strength", primary: ["Shoulders"], secondary: [], equipment: "Dumbbells", met: 2.8 },
  { name: "Front Raise", category: "Strength", primary: ["Shoulders"], secondary: [], equipment: "Dumbbells", met: 2.8 },

  // 11-20: Strength - Legs / Back
  { name: "Bodyweight Squat", category: "Strength", primary: ["Legs"], secondary: ["Core"], equipment: "No Equipment", met: 4.0 },
  { name: "Goblet Squat", category: "Strength", primary: ["Legs"], secondary: ["Core"], equipment: "Dumbbells", met: 5.5 },
  { name: "Barbell Back Squat", category: "Strength", primary: ["Legs"], secondary: ["Back", "Core"], equipment: "Barbell", met: 7.0 },
  { name: "Lunge", category: "Strength", primary: ["Legs"], secondary: ["Core"], equipment: "No Equipment", met: 4.0 },
  { name: "Deadlift", category: "Strength", primary: ["Back", "Legs"], secondary: ["Core"], equipment: "Barbell", met: 6.0 },
  { name: "Pull-Up", category: "Strength", primary: ["Back"], secondary: ["Arms"], equipment: "Pull-up Bar", met: 8.0 },
  { name: "Chin-Up", category: "Strength", primary: ["Back"], secondary: ["Arms"], equipment: "Pull-up Bar", met: 7.5 },
  { name: "Bent-Over Row", category: "Strength", primary: ["Back"], secondary: ["Arms"], equipment: "Barbell", met: 5.0 },
  { name: "Dumbbell Row", category: "Strength", primary: ["Back"], secondary: ["Arms"], equipment: "Dumbbells", met: 4.5 },
  { name: "Calf Raise", category: "Strength", primary: ["Legs"], secondary: [], equipment: "No Equipment", met: 2.5 },

  // 21-30: Cardio / HIIT
  { name: "Running", category: "Cardio", primary: ["Legs"], secondary: ["Core"], equipment: "Treadmill", met: 9.8 },
  { name: "Jogging", category: "Cardio", primary: ["Legs"], secondary: ["Core"], equipment: "No Equipment", met: 7.0 },
  { name: "Brisk Walking", category: "Cardio", primary: ["Legs"], secondary: [], equipment: "No Equipment", met: 3.5 },
  { name: "Jump Rope", category: "Cardio", primary: ["Full Body"], secondary: ["Legs"], equipment: "Jump Rope", met: 11.0 },
  { name: "Burpee", category: "HIIT", primary: ["Full Body"], secondary: ["Chest", "Legs", "Core"], equipment: "No Equipment", met: 8.5 },
  { name: "Jumping Jack", category: "Cardio", primary: ["Full Body"], secondary: ["Legs"], equipment: "No Equipment", met: 6.0 },
  { name: "Mountain Climber", category: "HIIT", primary: ["Core"], secondary: ["Shoulders", "Legs"], equipment: "No Equipment", met: 7.5 },
  { name: "Kettlebell Swing", category: "HIIT", primary: ["Legs", "Back"], secondary: ["Core", "Shoulders"], equipment: "Kettlebell", met: 9.0 },
  { name: "High Knees", category: "HIIT", primary: ["Legs"], secondary: ["Core"], equipment: "No Equipment", met: 8.0 },
  { name: "Shadow Boxing", category: "Cardio", primary: ["Arms", "Shoulders"], secondary: ["Core", "Legs"], equipment: "No Equipment", met: 5.5 },

  // 31-40: Core / Balance / Flexibility
  { name: "Plank", category: "Core", primary: ["Core"], secondary: ["Shoulders"], equipment: "No Equipment", met: 2.8 },
  { name: "Side Plank", category: "Core", primary: ["Core"], secondary: [], equipment: "No Equipment", met: 2.8 },
  { name: "Crunch", category: "Core", primary: ["Core"], secondary: [], equipment: "No Equipment", met: 2.5 },
  { name: "Leg Raise", category: "Core", primary: ["Core"], secondary: ["Legs"], equipment: "No Equipment", met: 3.0 },
  { name: "Russian Twist", category: "Core", primary: ["Core"], secondary: [], equipment: "No Equipment", met: 3.0 },
  { name: "Bird Dog", category: "Balance", primary: ["Core"], secondary: ["Back"], equipment: "No Equipment", met: 2.5 },
  { name: "Single-Leg Balance", category: "Balance", primary: ["Legs"], secondary: ["Core"], equipment: "No Equipment", met: 2.0 },
  { name: "Cobra Stretch", category: "Flexibility", primary: ["Back"], secondary: ["Core"], equipment: "No Equipment", met: 2.0 },
  { name: "Child's Pose", category: "Flexibility", primary: ["Back"], secondary: ["Shoulders"], equipment: "No Equipment", met: 1.5 },
  { name: "Downward Facing Dog", category: "Flexibility", primary: ["Legs", "Shoulders"], secondary: ["Back"], equipment: "No Equipment", met: 2.5 }
];

// Helper to expand base exercises into 200 unique variations (different difficulties, equipments, & progressions)
const exercises = [];
const difficulties = ["Beginner", "Intermediate", "Advanced"];
const secondaryEquipments = ["No Equipment", "Dumbbells", "Barbell", "Resistance Band", "Kettlebell", "Pull-up Bar", "Bench"];

let index = 1;
// Loop base exercises, generating 5 unique variants of each to reach 200 (40 * 5)
baseExercises.forEach((base) => {
  for (let j = 0; j < 5; j++) {
    const difficulty = difficulties[j % difficulties.length];
    
    // Choose equipment variation
    let equipment = base.equipment;
    let nameSuffix = "";
    if (j > 0 && base.equipment === "No Equipment" && base.category === "Strength") {
      equipment = secondaryEquipments[j % secondaryEquipments.length];
      if (equipment !== "No Equipment") {
        nameSuffix = ` (${equipment})`;
      }
    } else if (j > 0 && base.equipment !== "No Equipment") {
      // Add variations like "Resistance Band Squat" etc.
      const altEquip = secondaryEquipments[j % secondaryEquipments.length];
      if (altEquip !== "No Equipment" && altEquip !== base.equipment) {
        equipment = altEquip;
        nameSuffix = ` (${equipment})`;
      }
    }
    
    // Customize MET according to difficulty
    let met_value = base.met;
    if (difficulty === "Beginner") met_value = Math.max(1.5, base.met - 1);
    if (difficulty === "Advanced") met_value = base.met + 1.5;
    
    const name = `${difficulty} ${base.name}${nameSuffix}`;
    const exercise_id = `EX_${index.toString().padStart(3, '0')}`;
    
    // Calculate weight calories approximation
    const calories_per_minute = {
      "50kg": Math.round(met_value * 3.5 * 50 / 200 * 10) / 10,
      "60kg": Math.round(met_value * 3.5 * 60 / 200 * 10) / 10,
      "70kg": Math.round(met_value * 3.5 * 70 / 200 * 10) / 10,
      "80kg": Math.round(met_value * 3.5 * 80 / 200 * 10) / 10,
      "90kg": Math.round(met_value * 3.5 * 90 / 200 * 10) / 10
    };

    const calories_burned_per_set_approx = {
      "50kg": Math.round(calories_per_minute["50kg"] * 1.5),
      "60kg": Math.round(calories_per_minute["60kg"] * 1.5),
      "70kg": Math.round(calories_per_minute["70kg"] * 1.5),
      "80kg": Math.round(calories_per_minute["80kg"] * 1.5),
      "90kg": Math.round(calories_per_minute["90kg"] * 1.5)
    };

    // Default reps/sets
    const sets = difficulty === "Beginner" ? 3 : difficulty === "Intermediate" ? 4 : 5;
    const reps = base.category === "Cardio" || base.category === "HIIT" || base.name.includes("Plank") ? null : (difficulty === "Beginner" ? 10 : 12);
    const duration_seconds = reps ? null : (difficulty === "Beginner" ? 30 : difficulty === "Intermediate" ? 45 : 60);

    exercises.push({
      exercise_id,
      name,
      category: base.category,
      muscle_groups: {
        primary: [base.primary[0]],
        secondary: base.secondary
      },
      difficulty,
      equipment,
      met_value,
      calories_per_minute,
      calories_burned_per_set_approx,
      sets_reps_default: {
        sets,
        reps,
        duration_seconds,
        rest_seconds: 30
      },
      duration_minutes_per_set: 1.5,
      chart_data: {
        x_label: "Date",
        y_label: reps ? "Reps" : "Seconds",
        progress_type: reps ? "reps" : "duration",
        beginner_target: reps ? [8, 10, 10] : [20, 30, 30],
        intermediate_target: reps ? [10, 12, 12] : [30, 45, 45],
        advanced_target: reps ? [12, 15, 15] : [45, 60, 60]
      },
      instructor: {
        starting_position: `Assume a stable position suitable for ${base.name}. Keep your core engaged and check your posture.`,
        steps: [
          `Setup: Prepare the required ${equipment} and align your body correctly.`,
          `Execution: Lower/move in a controlled fashion to initiate the movement.`,
          `Contraction: Exhale and squeeze the target muscles (${base.primary.join(", ")}) at the peak.`,
          `Recovery: Return slowly to the starting position to complete one replication.`
        ],
        common_mistakes: [
          "Performing the exercise too quickly without controlling the range.",
          "Holding your breath during high-effort phases.",
          "Losing spinal alignment and rounding your lower back."
        ],
        tips: `Focus on the mind-muscle connection. Ensure you perform a warm-up sequence prior to loading weights.`,
        video_tag: "v_demo_01",
        animation_frames: 24,
        image_placeholder: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400"
      },
      is_active: true,
      tags: [base.category.toLowerCase(), ...base.primary.map(m => m.toLowerCase()), difficulty.toLowerCase()]
    });

    index++;
  }
});

// Seed data routines sequence maps references correctly
const routinesData = [
  {
    workout_id: 'WK_ABS_01',
    category_id: 'Abs',
    title: 'Core Basics',
    total_duration_minutes: 10,
    difficulty_rating: 1,
    thumbnail_image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300',
    is_premium: false,
    exercises_sequence: [
      { exercise_id_ref: 'EX_151', duration_seconds: 45, rest_seconds: 15 }, // Beginner Plank
      { exercise_id_ref: 'EX_161', duration_seconds: 45, rest_seconds: 15 }, // Beginner Crunch
      { exercise_id_ref: 'EX_166', duration_seconds: 45, rest_seconds: 15 }, // Beginner Leg Raise
      { exercise_id_ref: 'EX_171', duration_seconds: 45, rest_seconds: 15 }, // Beginner Russian Twist
    ]
  },
  {
    workout_id: 'WK_ARM_01',
    category_id: 'Arm',
    title: 'Light Arms',
    total_duration_minutes: 12,
    difficulty_rating: 1,
    thumbnail_image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=300',
    is_premium: false,
    exercises_sequence: [
      { exercise_id_ref: 'EX_026', reps: 12, sets: 3, rest_seconds: 30 }, // Beginner Bicep Curl
      { exercise_id_ref: 'EX_031', reps: 12, sets: 3, rest_seconds: 30 }, // Beginner Tricep Extension
    ]
  },
  {
    workout_id: 'WK_LEG_01',
    category_id: 'Leg',
    title: 'Easy Squats',
    total_duration_minutes: 15,
    difficulty_rating: 1,
    thumbnail_image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=300',
    is_premium: false,
    exercises_sequence: [
      { exercise_id_ref: 'EX_051', reps: 15, sets: 3, rest_seconds: 30 }, // Beginner Bodyweight Squat
      { exercise_id_ref: 'EX_066', reps: 15, sets: 3, rest_seconds: 30 }, // Beginner Lunge
    ]
  }
];

// Map muscles in exercises.json to match mobile client filters
const mapMuscleGroup = (m) => {
  const muscle = (m || '').toLowerCase();
  if (muscle.includes('abdominals') || muscle.includes('obliques')) return 'Abs';
  if (muscle.includes('biceps') || muscle.includes('triceps') || muscle.includes('forearms')) return 'Arm';
  if (muscle.includes('chest') || muscle.includes('pecks')) return 'Chest';
  if (muscle.includes('quadriceps') || muscle.includes('hamstrings') || muscle.includes('calves') || muscle.includes('glutes')) return 'Leg';
  if (muscle.includes('shoulders') || muscle.includes('deltoids')) return 'Shoulder';
  if (muscle.includes('lats') || muscle.includes('back') || muscle.includes('trapezius')) return 'Back';
  return 'Full Body';
};

const mapCategory = (cat) => {
  const c = (cat || '').toLowerCase();
  if (c.includes('strength') || c.includes('powerlifting') || c.includes('weightlifting') || c.includes('strongman')) return 'Strength';
  if (c.includes('stretching') || c.includes('flexibility')) return 'Flexibility';
  if (c.includes('plyometrics')) return 'HIIT';
  if (c.includes('cardio')) return 'Cardio';
  return 'Strength';
};

const mapEquipment = (eq) => {
  const e = (eq || '').toLowerCase();
  if (e.includes('body only') || e.includes('none')) return 'No Equipment';
  if (e.includes('dumbbell')) return 'Dumbbells';
  if (e.includes('barbell')) return 'Barbell';
  if (e.includes('bands')) return 'Resistance Band';
  if (e.includes('kettlebells') || e.includes('kettlebell')) return 'Kettlebell';
  if (e.includes('pull-up bar') || e.includes('pullup')) return 'Pull-up Bar';
  if (e.includes('bench')) return 'Bench';
  return 'No Equipment';
};

const mapDifficulty = (diff) => {
  const d = (diff || '').toLowerCase();
  if (d.includes('beginner')) return 'Beginner';
  if (d.includes('intermediate')) return 'Intermediate';
  if (d.includes('advanced')) return 'Advanced';
  return 'Beginner';
};

async function seed() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/FitTrackApp');
    console.log("Connected to MongoDB at 127.0.0.1:27017");

    // Load exercises from exercises.json
    const jsonPath = path.join(__dirname, '../Exercisedata/exercises.json');
    console.log("Reading exercises.json from path:", jsonPath);
    const exercisesRaw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    const parsedJsonExercises = exercisesRaw.map((item, idx) => {
      const category = mapCategory(item.category);
      const difficulty = mapDifficulty(item.level);
      const equipment = mapEquipment(item.equipment);
      const primaryMuscle = mapMuscleGroup(item.primaryMuscles?.[0]);
      const secondaryMusclesMapped = (item.secondaryMuscles || []).map(mapMuscleGroup);

      const met_value = category === 'Cardio' ? 7.0 : category === 'HIIT' ? 8.0 : category === 'Flexibility' ? 2.0 : 3.5;

      const calories_per_minute = {
        "50kg": Math.round(met_value * 3.5 * 50 / 200 * 10) / 10,
        "60kg": Math.round(met_value * 3.5 * 60 / 200 * 10) / 10,
        "70kg": Math.round(met_value * 3.5 * 70 / 200 * 10) / 10,
        "80kg": Math.round(met_value * 3.5 * 80 / 200 * 10) / 10,
        "90kg": Math.round(met_value * 3.5 * 90 / 200 * 10) / 10
      };

      const calories_burned_per_set_approx = {
        "50kg": Math.round(calories_per_minute["50kg"] * 1.5),
        "60kg": Math.round(calories_per_minute["60kg"] * 1.5),
        "70kg": Math.round(calories_per_minute["70kg"] * 1.5),
        "80kg": Math.round(calories_per_minute["80kg"] * 1.5),
        "90kg": Math.round(calories_per_minute["90kg"] * 1.5)
      };

      const exercise_id = `EX_JSON_${idx.toString().padStart(4, '0')}`;
      const hasReps = category !== 'Cardio' && category !== 'HIIT';

      return {
        exercise_id,
        name: item.name,
        category,
        muscle_groups: {
          primary: [primaryMuscle],
          secondary: secondaryMusclesMapped
        },
        difficulty,
        equipment,
        met_value,
        calories_per_minute,
        calories_burned_per_set_approx,
        sets_reps_default: {
          sets: difficulty === 'Beginner' ? 3 : 4,
          reps: hasReps ? 12 : null,
          duration_seconds: hasReps ? null : 45,
          rest_seconds: 30
        },
        instructor: {
          starting_position: "Get into starting position with correct posture.",
          steps: item.instructions && item.instructions.length > 0 ? item.instructions : ["Prepare and execute the movement controls."],
          tips: `Aim for controlled movements. Keep the focus on the target area.`,
          image_placeholder: item.images && item.images[0] ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${item.images[0]}` : 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400'
        },
        is_active: true,
        tags: [category.toLowerCase(), primaryMuscle.toLowerCase(), difficulty.toLowerCase()]
      };
    });

    const allExercises = [...exercises, ...parsedJsonExercises];

    await Exercise.deleteMany({});
    await WorkoutTemplate.deleteMany({});
    console.log("Cleared old Exercise and WorkoutTemplate documents.");

    const insertedEx = await Exercise.insertMany(allExercises);
    console.log(`Successfully seeded ${insertedEx.length} total exercises (200 core + ${parsedJsonExercises.length} from exercises.json).`);

    const exMap = {};
    insertedEx.forEach(ex => {
      exMap[ex.exercise_id] = ex._id;
    });

    const routinesToInsert = routinesData.map(r => {
      r.exercises_sequence = r.exercises_sequence.map(seq => {
        seq.exercise_id = exMap[seq.exercise_id_ref];
        return seq;
      });
      return r;
    });

    await WorkoutTemplate.insertMany(routinesToInsert);
    console.log("Successfully seeded sample routines.");

    process.exit(0);
  } catch (err) {
    console.error("Seeding Error:", err);
    process.exit(1);
  }
}
seed();
