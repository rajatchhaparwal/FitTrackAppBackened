import express from 'express';
import User from '../Models/UserSchemaModel.js';

const router = express.Router();

// ── FatSecret helpers ────────────────────────────────────────────────────────
const FS_TOKEN_URL     = 'https://oauth.fatsecret.com/connect/token';
const FS_API_URL       = 'https://platform.fatsecret.com/rest/server.api';
const FS_CLIENT_ID     = process.env.FS_CLIENT_ID     || '197ebdcdca80403ebf89af543ac75dae';
const FS_CLIENT_SECRET = process.env.FS_CLIENT_SECRET || 'd7c83897f7e94d9a9b41361ad760484a';

let fsToken       = null;
let fsTokenExpiry = 0;

const getFatSecretToken = async () => {
  if (fsToken && Date.now() < fsTokenExpiry) return fsToken;
  const credentials = Buffer.from(`${FS_CLIENT_ID}:${FS_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(FS_TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=basic',
  });
  if (!res.ok) throw new Error(`FatSecret token error ${res.status}`);
  const data    = await res.json();
  fsToken       = data.access_token;
  fsTokenExpiry = Date.now() + ((data.expires_in ?? 86400) - 60) * 1000;
  return fsToken;
};

const normalise = (food) => {
  const desc = food.food_description || '';
  const extract = (label) => {
    const m = desc.match(new RegExp(`${label}:\\s*([\\d.]+)`, 'i'));
    return m ? Math.round(parseFloat(m[1])) : 0;
  };
  return {
    id:          String(food.food_id),
    name:        food.food_name || 'Unknown',
    brand:       food.brand_name || null,
    type:        food.food_type  || 'Generic',
    description: desc,
    calories:    extract('Calories'),
    protein:     extract('Protein'),
    carbs:       extract('Carbs'),
    fat:         extract('Fat'),
    servingSize: desc.split(' - ')[0]?.trim() || 'Per 100g',
    source:      'fatsecret',
  };
};

const fsSearch = async (query, max = 3) => {
  const token = await getFatSecretToken();
  const params = new URLSearchParams({ format: 'json', method: 'foods.search', search_expression: query, max_results: max, page_number: 0 });
  const res = await fetch(`${FS_API_URL}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`FatSecret HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error) throw new Error(`FatSecret error ${json.error.code}: ${json.error.message}`);
  const foods = json?.foods?.food;
  if (!foods) return [];
  const arr = Array.isArray(foods) ? foods : [foods];
  return arr.slice(0, max).map(normalise);
};

// ── Goal + diet query matrix ─────────────────────────────────────────────────
const QUERIES = {
  omnivore: {
    weight_loss: { breakfast: ['egg white omelette', 'oatmeal low calorie'], lunch: ['grilled chicken salad', 'vegetable soup'], dinner: ['baked fish vegetables', 'lentil soup'], snacks: ['apple', 'greek yogurt low fat'] },
    muscle_gain: { breakfast: ['egg omelette high protein', 'protein oatmeal'], lunch: ['grilled chicken breast', 'chicken rice'], dinner: ['salmon baked', 'chicken stir fry'], snacks: ['whey protein shake', 'cottage cheese'] },
    maintenance: { breakfast: ['whole grain oatmeal', 'eggs toast'], lunch: ['quinoa salad', 'turkey wrap'], dinner: ['chicken vegetables', 'dal rice'], snacks: ['mixed nuts', 'banana'] },
    general:     { breakfast: ['healthy oatmeal', 'scrambled eggs'], lunch: ['chicken salad', 'rice lentils'], dinner: ['baked fish vegetables', 'chicken soup'], snacks: ['fruit snack', 'nuts seeds'] },
  },
  vegetarian: {
    weight_loss: { breakfast: ['oatmeal low calorie', 'greek yogurt low fat'], lunch: ['vegetable salad low calorie', 'dal soup'], dinner: ['moong dal light', 'vegetable soup'], snacks: ['apple', 'carrot low calorie'] },
    muscle_gain: { breakfast: ['paneer high protein', 'tofu scramble protein'], lunch: ['chana masala high protein', 'paneer tikka'], dinner: ['rajma protein', 'tofu stir fry'], snacks: ['cottage cheese protein', 'greek yogurt high protein'] },
    maintenance: { breakfast: ['idli sambar', 'poha breakfast'], lunch: ['dal rice balanced', 'paneer sabzi'], dinner: ['palak paneer', 'mixed vegetables dal'], snacks: ['mixed nuts', 'banana'] },
    general:     { breakfast: ['oatmeal healthy', 'upma rava'], lunch: ['dal rice healthy', 'vegetable curry'], dinner: ['paneer curry', 'lentil soup'], snacks: ['roasted chickpeas', 'fruit snack'] },
  },
  vegan: {
    weight_loss: { breakfast: ['oatmeal almond milk', 'fruit salad low calorie'], lunch: ['vegetable salad vegan', 'vegetable soup vegan'], dinner: ['tofu vegetables', 'lentil soup vegan'], snacks: ['apple', 'cucumber'] },
    muscle_gain: { breakfast: ['tofu scramble protein', 'oatmeal soy milk protein'], lunch: ['chickpea salad high protein', 'tempeh protein'], dinner: ['tofu stir fry', 'lentils protein'], snacks: ['edamame protein', 'soy protein shake'] },
    maintenance: { breakfast: ['oatmeal soy milk', 'avocado toast'], lunch: ['chickpea curry rice', 'tofu rice bowl'], dinner: ['lentil soup', 'vegetable curry rice'], snacks: ['mixed nuts', 'banana'] },
    general:     { breakfast: ['oatmeal fruits vegan', 'smoothie vegan'], lunch: ['lentil soup healthy', 'chickpea rice'], dinner: ['tofu stir fry vegan', 'bean curry'], snacks: ['nuts seeds', 'fruits'] },
  },
};

const pickQueries = (goal, diet) => {
  const g = (goal || '').toLowerCase();
  const d = (diet || '').toLowerCase();
  let table;
  if (d.includes('vegan'))                                  table = QUERIES.vegan;
  else if (d.includes('veg') || d.includes('vegetarian'))   table = QUERIES.vegetarian;
  else                                                       table = QUERIES.omnivore;
  if (g.includes('weight_loss') || g.includes('fat') || g.includes('cut'))     return table.weight_loss;
  if (g.includes('muscle') || g.includes('bulk') || g.includes('weight_gain')) return table.muscle_gain;
  if (g.includes('maintenance') || g.includes('maintain'))                      return table.maintenance;
  return table.general;
};

// ── Per-diet fallbacks ───────────────────────────────────────────────────────
const FALLBACK = {
  omnivore: {
    breakfast: [{ id: 'fb1', name: 'Oatmeal (Plain)', calories: 150, protein: 5, carbs: 27, fat: 2, servingSize: 'Per 100g', source: 'local' }, { id: 'fb2', name: 'Scrambled Eggs', calories: 148, protein: 10, carbs: 1, fat: 11, servingSize: 'Per 100g', source: 'local' }],
    lunch:     [{ id: 'fl1', name: 'Grilled Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3, servingSize: 'Per 100g', source: 'local' }, { id: 'fl2', name: 'Dal Rice', calories: 130, protein: 5, carbs: 25, fat: 1, servingSize: 'Per 100g', source: 'local' }],
    dinner:    [{ id: 'fd1', name: 'Baked Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: 'Per 100g', source: 'local' }, { id: 'fd2', name: 'Vegetable Soup', calories: 60, protein: 2, carbs: 10, fat: 1, servingSize: 'Per 100g', source: 'local' }],
    snacks:    [{ id: 'fs1', name: 'Mixed Nuts', calories: 175, protein: 4, carbs: 8, fat: 16, servingSize: 'Per 30g', source: 'local' }, { id: 'fs2', name: 'Greek Yogurt', calories: 59, protein: 10, carbs: 3, fat: 0, servingSize: 'Per 100g', source: 'local' }],
  },
  vegetarian: {
    breakfast: [{ id: 'vb1', name: 'Oatmeal with Fruits', calories: 150, protein: 5, carbs: 28, fat: 2, servingSize: 'Per 100g', source: 'local' }, { id: 'vb2', name: 'Idli Sambar', calories: 120, protein: 4, carbs: 22, fat: 1, servingSize: '4 idlis', source: 'local' }],
    lunch:     [{ id: 'vl1', name: 'Dal Rice', calories: 130, protein: 5, carbs: 25, fat: 1, servingSize: 'Per 100g', source: 'local' }, { id: 'vl2', name: 'Paneer Curry', calories: 190, protein: 12, carbs: 4, fat: 14, servingSize: 'Per 100g', source: 'local' }],
    dinner:    [{ id: 'vd1', name: 'Palak Paneer', calories: 145, protein: 7, carbs: 6, fat: 11, servingSize: 'Per 100g', source: 'local' }, { id: 'vd2', name: 'Moong Dal', calories: 105, protein: 7, carbs: 19, fat: 0, servingSize: 'Per 100g', source: 'local' }],
    snacks:    [{ id: 'vs1', name: 'Roasted Chickpeas', calories: 160, protein: 8, carbs: 25, fat: 3, servingSize: 'Per 50g', source: 'local' }, { id: 'vs2', name: 'Mixed Nuts', calories: 175, protein: 4, carbs: 8, fat: 16, servingSize: 'Per 30g', source: 'local' }],
  },
  vegan: {
    breakfast: [{ id: 'gb1', name: 'Oatmeal Almond Milk', calories: 130, protein: 4, carbs: 25, fat: 3, servingSize: 'Per 100g', source: 'local' }, { id: 'gb2', name: 'Banana Smoothie', calories: 120, protein: 2, carbs: 28, fat: 1, servingSize: '1 glass', source: 'local' }],
    lunch:     [{ id: 'gl1', name: 'Chickpea Salad', calories: 180, protein: 10, carbs: 25, fat: 5, servingSize: 'Per 100g', source: 'local' }, { id: 'gl2', name: 'Lentil Soup', calories: 116, protein: 9, carbs: 20, fat: 0, servingSize: 'Per 100g', source: 'local' }],
    dinner:    [{ id: 'gd1', name: 'Tofu Stir Fry', calories: 120, protein: 9, carbs: 8, fat: 6, servingSize: 'Per 100g', source: 'local' }, { id: 'gd2', name: 'Vegetable Curry', calories: 100, protein: 3, carbs: 15, fat: 3, servingSize: 'Per 100g', source: 'local' }],
    snacks:    [{ id: 'gs1', name: 'Mixed Nuts', calories: 175, protein: 4, carbs: 8, fat: 16, servingSize: 'Per 30g', source: 'local' }, { id: 'gs2', name: 'Apple', calories: 52, protein: 0, carbs: 14, fat: 0, servingSize: '1 medium', source: 'local' }],
  },
};

const getFallback = (diet, key) => {
  const d = (diet || '').toLowerCase();
  if (d.includes('vegan'))                               return FALLBACK.vegan[key];
  if (d.includes('veg') || d.includes('vegetarian'))    return FALLBACK.vegetarian[key];
  return FALLBACK.omnivore[key];
};

// ── Fetch 2 queries for a meal from FatSecret ────────────────────────────────
const fetchMeal = async (mealQueries, mealKey, diet) => {
  const [q1, q2] = mealQueries[mealKey] || [];
  try {
    const [r1, r2] = await Promise.all([
      q1 ? fsSearch(q1, 2).catch(() => []) : Promise.resolve([]),
      q2 ? fsSearch(q2, 2).catch(() => []) : Promise.resolve([]),
    ]);
    const combined = [...r1, ...r2];
    const seen = new Set();
    const unique = combined.filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); return true; });
    return unique.length > 0 ? unique : getFallback(diet, mealKey);
  } catch {
    return getFallback(diet, mealKey);
  }
};

// ── Public: called at onboarding to build & persist the plan ─────────────────
export const buildAndSaveMealPlan = async (userDoc) => {
  const goal = userDoc.goal || '';
  const diet = userDoc.dietary_preference || '';

  console.log(`[MealPlan] Building plan for goal=${goal} diet=${diet}`);
  const queries = pickQueries(goal, diet);

  const [breakfast, lunch, dinner, snacks] = await Promise.all([
    fetchMeal(queries, 'breakfast', diet),
    fetchMeal(queries, 'lunch',     diet),
    fetchMeal(queries, 'dinner',    diet),
    fetchMeal(queries, 'snacks',    diet),
  ]);

  const all = [...breakfast, ...lunch, ...dinner, ...snacks];
  const totals = all.reduce(
    (acc, f) => ({ calories: acc.calories + (f.calories || 0), protein: acc.protein + (f.protein || 0), carbs: acc.carbs + (f.carbs || 0), fat: acc.fat + (f.fat || 0) }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const plan = { breakfast, lunch, dinner, snacks, totals, generatedAt: new Date() };

  await User.findByIdAndUpdate(userDoc._id, { $set: { mealPlan: plan } });
  console.log(`[MealPlan] Saved plan for user ${userDoc._id}`);
  return plan;
};

// ── Middleware ────────────────────────────────────────────────────────────────
const authenticateUser = async (req, res, next) => {
  const uid = req.headers['firebase-uid'];
  if (!uid) return res.status(401).json({ success: false, message: 'Missing firebase-uid header' });
  try {
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

router.use(authenticateUser);

// GET /food-recommendation/plan
// Returns the pre-built plan from MongoDB (generated at onboarding)
router.get('/plan', async (req, res) => {
  try {
    const user = req.user;
    let plan = user.mealPlan;

    // If no plan exists yet (existing user before this update), build it now
    if (!plan || !plan.generatedAt) {
      console.log('[MealPlan] No stored plan found, building now...');
      plan = await buildAndSaveMealPlan(user);
    }

    res.json({ success: true, data: plan });
  } catch (e) {
    console.error('Meal plan error:', e);
    res.status(500).json({ success: false, message: 'Failed to load meal plan' });
  }
});

router.get('/browse', (req, res) => {
  res.json({ success: true, data: [] });
});

export default router;
