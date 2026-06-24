import express from 'express';
import { WorkoutTemplate } from '../Models/WorkoutTemplateSchema.js';
import Exercise from '../Exercisedata/schemaForExercsise/exerciseSchema.js';
import User from '../Models/UserSchemaModel.js';
import mongoose from 'mongoose';

// Ensure WorkoutLog is loaded or define a minimalistic one if already in Models/WorkoutLog.js
import '../Models/WorkoutLog.js';
const WorkoutLog = mongoose.model('WorkoutLog');

const router = express.Router();

// GET /WorkoutTemplates
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== 'all' ? { category_id: new RegExp(category, 'i') } : {};
    const routines = await WorkoutTemplate.find(filter).lean();
    res.json(routines);
  } catch (err) {
    console.error('Error fetching workout templates:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /WorkoutTemplates/history
router.get('/history', async (req, res) => {
  try {
    const firebaseUid = req.headers['firebase-uid'];
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized: firebase-uid missing' });
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const logs = await WorkoutLog.find({ userId: user._id })
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('Error fetching workout history:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /WorkoutTemplates/:workoutId
router.get('/:workoutId', async (req, res) => {
  try {
    const routine = await WorkoutTemplate.findOne({ workout_id: req.params.workoutId })
      .populate('exercises_sequence.exercise_id')
      .lean();
      
    if (!routine) return res.status(404).json({ error: 'Routine not found' });
    res.json(routine);
  } catch (err) {
    console.error('Error fetching workout template details:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /WorkoutTemplates/log
router.post('/log', async (req, res) => {
  try {
    const firebaseUid = req.headers['firebase-uid'];
    if (!firebaseUid) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const log = new WorkoutLog({
      firebaseUid,
      userId: user._id,
      durationMins: req.body.durationMins || 0,
      workoutType: req.body.workoutType || 'strength',
      title: req.body.title || 'Workout',
      summary: { totalCaloriesBurned: req.body.caloriesBurned || 0 }
    });
    await log.save();

    // Update user stats
    user.stats = user.stats || {};
    user.stats.total_workouts = (user.stats.total_workouts || 0) + 1;
    user.stats.total_calories_burned = (user.stats.total_calories_burned || 0) + (req.body.caloriesBurned || 0);
    user.stats.current_streak = (user.stats.current_streak || 0) + 1;
    await user.save();

    res.json({ success: true, stats: user.stats });
  } catch (err) {
    console.error('Error saving workout log:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
