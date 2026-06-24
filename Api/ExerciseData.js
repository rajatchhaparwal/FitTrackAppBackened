import express from 'express';
import Exercise from '../Exercisedata/schemaForExercsise/exerciseSchema.js';

const router = express.Router();

// GET /Exercise
// Exposes search and filter endpoints for the frontend
router.get('/', async (req, res) => {
  try {
    const { bodyPart, type, search } = req.query;
    let query = { is_active: true };

    if (bodyPart && bodyPart !== 'All') {
      // Find matches in primary muscle groups
      query['muscle_groups.primary'] = bodyPart;
    }

    if (type && type !== 'All') {
      const typeLower = type.toLowerCase();
      // Map category enums to standard frontend types
      if (typeLower === 'strength') {
        query.category = { $in: ['Strength', 'Core', 'Balance'] };
      } else if (typeLower === 'cardio') {
        query.category = { $in: ['Cardio', 'HIIT'] };
      } else if (typeLower === 'flexibility') {
        query.category = 'Flexibility';
      }
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const exercises = await Exercise.find(query).limit(100).lean();

    // Map backend Mongo schemas to the properties expected by the React Native client UI
    const mapped = exercises.map(ex => {
      const isCardio = ex.category === 'Cardio' || ex.category === 'HIIT';
      
      return {
        id: ex.exercise_id,
        name: ex.name,
        bodyPart: ex.muscle_groups?.primary?.[0] || 'Full Body',
        type: isCardio ? 'cardio' : (ex.category === 'Flexibility' ? 'flexibility' : 'strength'),
        sets: ex.sets_reps_default?.sets || 3,
        reps: ex.sets_reps_default?.reps || (isCardio ? null : 12),
        duration: ex.sets_reps_default?.duration_seconds ? `${ex.sets_reps_default.duration_seconds}s` : (isCardio ? '45s' : null),
        difficulty: ex.difficulty?.toLowerCase() || 'beginner',
        kcalPer30: ex.calories_per_minute?.["70kg"] ? Math.round(ex.calories_per_minute["70kg"] * 30) : 150,
        imageUri: ex.instructor?.image_placeholder || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300',
        description: ex.instructor?.tips || 'No description available.'
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error('Error fetching exercises:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /Exercise/:id
router.get('/:id', async (req, res) => {
  try {
    const ex = await Exercise.findOne({ exercise_id: req.params.id }).lean();
    if (!ex) return res.status(404).json({ error: 'Exercise not found' });
    res.json(ex);
  } catch (err) {
    console.error('Error fetching exercise details:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
