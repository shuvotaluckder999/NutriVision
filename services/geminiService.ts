import { UserOnboardingData } from '../utils/onboardingStorage';

export interface AINutritionPlan {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  waterLiters: number;
  waterGlasses: number;
  bmi: number;
  bmiCategory: string;
  bmr: number;
  fitnessAdvice: string;
  mealTips: string[];
  workoutRecommendation: string;
  generatedAt: string;
}

export interface UserSelections {
  gender: string;
  goal: string;
  workoutDays: string;
  birthdate: { day: string; month: string; year: string };
  height: { feet: string; inches: string };
  weight: { kg: string };
}

/**
 * Calculate metabolic metrics using Mifflin-St Jeor Equation as baseline / fallback
 */
export function calculateFallbackMetrics(selections: UserSelections): AINutritionPlan {
  const weightKg = parseFloat(selections.weight?.kg || '70') || 70;
  const feet = parseFloat(selections.height?.feet || '5') || 5;
  const inches = parseFloat(selections.height?.inches || '9') || 9;
  
  // Total height in cm
  const totalInches = (feet * 12) + inches;
  const heightCm = totalInches * 2.54;

  // Calculate age
  const birthYear = parseInt(selections.birthdate?.year || '1998', 10) || 1998;
  const currentYear = new Date().getFullYear();
  const age = Math.max(15, currentYear - birthYear);

  // Mifflin-St Jeor Equation for BMR
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  if (selections.gender === 'female') {
    bmr -= 161;
  } else {
    bmr += 5;
  }
  bmr = Math.round(bmr);

  // Activity Multiplier
  let activityMultiplier = 1.375;
  switch (selections.workoutDays) {
    case '2-3 days':
      activityMultiplier = 1.375;
      break;
    case '3-7 Days':
      activityMultiplier = 1.55;
      break;
    case '7-15 Days':
      activityMultiplier = 1.725;
      break;
    case '1 month':
      activityMultiplier = 1.9;
      break;
    default:
      activityMultiplier = 1.4;
  }

  const tdee = Math.round(bmr * activityMultiplier);

  // Adjust for Goal
  let targetCalories = tdee;
  if (selections.goal === 'gain') {
    targetCalories = Math.round(tdee + 450);
  } else if (selections.goal === 'lose') {
    targetCalories = Math.round(tdee - 500);
  }

  // Macro calculations
  // Protein: 2.0g per kg for gain, 2.2g per kg for lose, 1.8g per kg for maintain
  let proteinGrams = Math.round(weightKg * (selections.goal === 'gain' ? 2.2 : selections.goal === 'lose' ? 2.0 : 1.8));
  // Fat: ~25-30% of total calories (9 kcal/g)
  let fatGrams = Math.round((targetCalories * 0.25) / 9);
  // Carbs: Remaining calories (4 kcal/g)
  let carbCalories = targetCalories - (proteinGrams * 4) - (fatGrams * 9);
  let carbGrams = Math.max(80, Math.round(carbCalories / 4));

  // Hydration calculation: 35ml per kg + 500ml per workout intensity
  const waterLiters = parseFloat(((weightKg * 0.035) + (activityMultiplier > 1.5 ? 0.6 : 0.3)).toFixed(1));
  const waterGlasses = Math.round(waterLiters * 4); // ~250ml per glass

  // BMI Calculation
  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

  let bmiCategory = 'Normal Weight';
  if (bmi < 18.5) bmiCategory = 'Underweight';
  else if (bmi >= 25 && bmi < 29.9) bmiCategory = 'Overweight';
  else if (bmi >= 30) bmiCategory = 'Obese';

  let fitnessAdvice = '';
  let workoutRecommendation = '';
  const mealTips: string[] = [];

  if (selections.goal === 'gain') {
    fitnessAdvice = `Focus on progressive overload with heavy compound movements. Aim for a caloric surplus with ${proteinGrams}g of protein daily to build lean muscle mass.`;
    workoutRecommendation = `4-5 days of strength training focusing on squat, bench press, deadlift, and overhead press.`;
    mealTips.push('Eat nutrient-dense, high-calorie meals such as nuts, avocado, and complex carbs.');
    mealTips.push('Consume a protein shake post-workout to kickstart muscle recovery.');
    mealTips.push('Stay consistently hydrated to support muscle protein synthesis.');
  } else if (selections.goal === 'lose') {
    fitnessAdvice = `Maintain a sustainable caloric deficit of ~500 kcal daily. Keep protein intake high at ${proteinGrams}g to preserve lean muscle while burning body fat.`;
    workoutRecommendation = `3-4 days of resistance training combined with 2 sessions of Moderate Intensity Steady State (MISS) cardio.`;
    mealTips.push('Prioritize high-volume, low-calorie foods rich in fiber to stay full longer.');
    mealTips.push('Drink 1 glass of water before every meal to assist satiety.');
    mealTips.push('Avoid liquid calories and sugary beverages.');
  } else {
    fitnessAdvice = `Maintain your current energy equilibrium. Focus on body composition refinement, cardiovascular health, and consistent hydration.`;
    workoutRecommendation = `3-4 days of balanced functional training including resistance, mobility, and cardiovascular conditioning.`;
    mealTips.push('Aim for balanced plates: 1/2 vegetables, 1/4 clean protein, 1/4 complex carbohydrates.');
    mealTips.push('Keep sodium and processed food intake low.');
    mealTips.push('Maintain regular meal timing to optimize circadian metabolic rhythms.');
  }

  return {
    calories: targetCalories,
    protein: proteinGrams,
    carbs: carbGrams,
    fats: fatGrams,
    waterLiters,
    waterGlasses,
    bmi,
    bmiCategory,
    bmr,
    fitnessAdvice,
    mealTips,
    workoutRecommendation,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate AI Nutrition & Fitness Plan using Gemini API
 */
export async function generateAINutritionPlan(selections: UserSelections): Promise<AINutritionPlan> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  // Fallback metrics as base
  const fallback = calculateFallbackMetrics(selections);

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
    console.log('No Gemini API key configured. Utilizing precision clinical fallback model.');
    return fallback;
  }

  try {
    const prompt = `You are NutriVision AI, an elite clinical nutritionist and sports fitness scientist.
Analyze the following user profile and return a structured JSON response specifying daily caloric requirements, macro split (Protein, Carbs, Fats), hydration requirements (Water in Liters and 250ml Glasses), BMI & Category, BMR, and personalized fitness advice.

USER PROFILE:
- Gender: ${selections.gender}
- Primary Goal: ${selections.goal}
- Activity Level / Workout Frequency: ${selections.workoutDays}
- Birthdate: ${selections.birthdate.day}/${selections.birthdate.month}/${selections.birthdate.year}
- Height: ${selections.height.feet} feet ${selections.height.inches} inches
- Weight: ${selections.weight.kg} kg

Respond STRICTLY with valid JSON in the following exact format without Markdown backticks or extra text:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number,
  "waterLiters": number,
  "waterGlasses": number,
  "bmi": number,
  "bmiCategory": "Underweight | Normal weight | Overweight | Obese",
  "bmr": number,
  "fitnessAdvice": "2-3 sentences of personalized fitness & nutrition strategy",
  "mealTips": ["tip 1", "tip 2", "tip 3"],
  "workoutRecommendation": "1-2 sentences on workout structure"
}`;

    const geminiModel = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.warn(`Gemini API HTTP Error: ${response.status}. Using fallback model.`);
      return fallback;
    }

    const data = await response.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean code fences if present
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsedJSON = JSON.parse(cleanedText);

    return {
      calories: Number(parsedJSON.calories) || fallback.calories,
      protein: Number(parsedJSON.protein) || fallback.protein,
      carbs: Number(parsedJSON.carbs) || fallback.carbs,
      fats: Number(parsedJSON.fats) || fallback.fats,
      waterLiters: Number(parsedJSON.waterLiters) || fallback.waterLiters,
      waterGlasses: Number(parsedJSON.waterGlasses) || fallback.waterGlasses,
      bmi: Number(parsedJSON.bmi) || fallback.bmi,
      bmiCategory: String(parsedJSON.bmiCategory) || fallback.bmiCategory,
      bmr: Number(parsedJSON.bmr) || fallback.bmr,
      fitnessAdvice: String(parsedJSON.fitnessAdvice) || fallback.fitnessAdvice,
      mealTips: Array.isArray(parsedJSON.mealTips) ? parsedJSON.mealTips : fallback.mealTips,
      workoutRecommendation: String(parsedJSON.workoutRecommendation) || fallback.workoutRecommendation,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating AI nutrition plan with Gemini API:', error);
    return fallback;
  }
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  foodMacroCard?: {
    foodName: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

// Massive comprehensive offline food database for instant lookup
const FOOD_DATABASE: Array<{
  keywords: string[];
  name: string;
  defaultPortion: string;
  caloriesPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatsPerUnit: number;
}> = [
  // Fruits & Vegetables
  { keywords: ['apple', 'apples'], name: 'Fresh Apple', defaultPortion: '1 medium (180g)', caloriesPerUnit: 95, proteinPerUnit: 0.5, carbsPerUnit: 25, fatsPerUnit: 0.3 },
  { keywords: ['banana', 'bananas'], name: 'Ripe Banana', defaultPortion: '1 medium (118g)', caloriesPerUnit: 105, proteinPerUnit: 1.3, carbsPerUnit: 27, fatsPerUnit: 0.4 },
  { keywords: ['orange', 'oranges'], name: 'Fresh Orange', defaultPortion: '1 medium (130g)', caloriesPerUnit: 62, proteinPerUnit: 1.2, carbsPerUnit: 15, fatsPerUnit: 0.2 },
  { keywords: ['mango', 'mangoes'], name: 'Ripe Mango', defaultPortion: '1 cup sliced (165g)', caloriesPerUnit: 99, proteinPerUnit: 1.4, carbsPerUnit: 25, fatsPerUnit: 0.6 },
  { keywords: ['strawberry', 'strawberries'], name: 'Fresh Strawberries', defaultPortion: '1 cup (150g)', caloriesPerUnit: 49, proteinPerUnit: 1.0, carbsPerUnit: 11.7, fatsPerUnit: 0.5 },
  { keywords: ['watermelon'], name: 'Watermelon', defaultPortion: '1 cup diced (152g)', caloriesPerUnit: 46, proteinPerUnit: 0.9, carbsPerUnit: 11.5, fatsPerUnit: 0.2 },
  { keywords: ['avocado', 'avacado'], name: 'Fresh Avocado', defaultPortion: '1 medium (150g)', caloriesPerUnit: 240, proteinPerUnit: 3.0, carbsPerUnit: 12, fatsPerUnit: 22 },
  { keywords: ['broccoli'], name: 'Steamed Broccoli', defaultPortion: '1 cup (150g)', caloriesPerUnit: 55, proteinPerUnit: 3.7, carbsPerUnit: 11, fatsPerUnit: 0.6 },
  { keywords: ['spinach'], name: 'Fresh Spinach', defaultPortion: '1 cup (30g)', caloriesPerUnit: 7, proteinPerUnit: 0.9, carbsPerUnit: 1.1, fatsPerUnit: 0.1 },
  { keywords: ['potato', 'potatoes', 'boiled potato'], name: 'Boiled Potato', defaultPortion: '1 medium (150g)', caloriesPerUnit: 130, proteinPerUnit: 3.0, carbsPerUnit: 30, fatsPerUnit: 0.2 },
  { keywords: ['sweet potato', 'sweet potatoes'], name: 'Baked Sweet Potato', defaultPortion: '1 medium (114g)', caloriesPerUnit: 103, proteinPerUnit: 2.3, carbsPerUnit: 24, fatsPerUnit: 0.2 },
  
  // Meats, Poultry & Seafood
  { keywords: ['chicken breast', 'chicken', 'grilled chicken'], name: 'Grilled Chicken Breast', defaultPortion: '100g serving', caloriesPerUnit: 165, proteinPerUnit: 31, carbsPerUnit: 0, fatsPerUnit: 3.6 },
  { keywords: ['chicken thigh'], name: 'Chicken Thigh', defaultPortion: '100g serving', caloriesPerUnit: 209, proteinPerUnit: 26, carbsPerUnit: 0, fatsPerUnit: 11 },
  { keywords: ['steak', 'beef', 'beef steak', 'sirloin'], name: 'Sirloin Beef Steak', defaultPortion: '100g serving', caloriesPerUnit: 244, proteinPerUnit: 27, carbsPerUnit: 0, fatsPerUnit: 14 },
  { keywords: ['ground beef', 'minced beef'], name: 'Lean Ground Beef', defaultPortion: '100g serving', caloriesPerUnit: 250, proteinPerUnit: 26, carbsPerUnit: 0, fatsPerUnit: 15 },
  { keywords: ['mutton', 'lamb'], name: 'Cooked Mutton / Lamb', defaultPortion: '100g serving', caloriesPerUnit: 294, proteinPerUnit: 25, carbsPerUnit: 0, fatsPerUnit: 21 },
  { keywords: ['salmon', 'salmon fillet'], name: 'Grilled Salmon', defaultPortion: '100g serving', caloriesPerUnit: 206, proteinPerUnit: 22, carbsPerUnit: 0, fatsPerUnit: 12 },
  { keywords: ['tuna', 'canned tuna'], name: 'Canned Tuna in Water', defaultPortion: '1 can (165g)', caloriesPerUnit: 191, proteinPerUnit: 42, carbsPerUnit: 0, fatsPerUnit: 1.4 },
  { keywords: ['shrimp', 'prawn', 'prawns'], name: 'Cooked Shrimp', defaultPortion: '100g serving', caloriesPerUnit: 99, proteinPerUnit: 24, carbsPerUnit: 0.2, fatsPerUnit: 0.3 },
  { keywords: ['fish', 'fried fish', 'grilled fish'], name: 'Grilled White Fish', defaultPortion: '100g serving', caloriesPerUnit: 125, proteinPerUnit: 22, carbsPerUnit: 0, fatsPerUnit: 3 },

  // Eggs & Dairy
  { keywords: ['egg', 'eggs', 'boiled egg'], name: 'Boiled Egg', defaultPortion: '1 large egg (50g)', caloriesPerUnit: 72, proteinPerUnit: 6.3, carbsPerUnit: 0.4, fatsPerUnit: 4.8 },
  { keywords: ['fried egg'], name: 'Fried Egg with Oil', defaultPortion: '1 large egg', caloriesPerUnit: 90, proteinPerUnit: 6.3, carbsPerUnit: 0.4, fatsPerUnit: 7.0 },
  { keywords: ['omelet', 'omelette'], name: '2-Egg Cheese Omelette', defaultPortion: '1 omelette', caloriesPerUnit: 240, proteinPerUnit: 14, carbsPerUnit: 2, fatsPerUnit: 19 },
  { keywords: ['milk', 'glass of milk'], name: 'Whole Milk', defaultPortion: '1 glass (240ml)', caloriesPerUnit: 149, proteinPerUnit: 8, carbsPerUnit: 12, fatsPerUnit: 8 },
  { keywords: ['greek yogurt', 'yogurt'], name: 'Plain Greek Yogurt', defaultPortion: '1 cup (170g)', caloriesPerUnit: 100, proteinPerUnit: 17, carbsPerUnit: 6, fatsPerUnit: 0.7 },
  { keywords: ['cheese', 'cheddar cheese'], name: 'Cheddar Cheese', defaultPortion: '1 slice (28g)', caloriesPerUnit: 115, proteinPerUnit: 7, carbsPerUnit: 0.4, fatsPerUnit: 9.4 },

  // Grains, Rice, Noodles & Breads
  { keywords: ['white rice', 'rice', 'steamed rice', 'cooked rice'], name: 'Cooked White Rice', defaultPortion: '1 cup (158g)', caloriesPerUnit: 205, proteinPerUnit: 4.2, carbsPerUnit: 45, fatsPerUnit: 0.4 },
  { keywords: ['brown rice'], name: 'Cooked Brown Rice', defaultPortion: '1 cup (195g)', caloriesPerUnit: 216, proteinPerUnit: 5.0, carbsPerUnit: 45, fatsPerUnit: 1.8 },
  { keywords: ['biryani', 'chicken biryani', 'beef biryani'], name: 'Chicken Biryani', defaultPortion: '1 plate (350g)', caloriesPerUnit: 520, proteinPerUnit: 28, carbsPerUnit: 65, fatsPerUnit: 16 },
  { keywords: ['fried rice'], name: 'Egg Fried Rice', defaultPortion: '1 plate (250g)', caloriesPerUnit: 380, proteinPerUnit: 10, carbsPerUnit: 55, fatsPerUnit: 13 },
  { keywords: ['oatmeal', 'oats', 'oat'], name: 'Cooked Oatmeal', defaultPortion: '1 cup (234g)', caloriesPerUnit: 166, proteinPerUnit: 5.9, carbsPerUnit: 28, fatsPerUnit: 3.6 },
  { keywords: ['bread', 'slice of bread', 'toast'], name: 'Whole Wheat Bread', defaultPortion: '1 slice (35g)', caloriesPerUnit: 80, proteinPerUnit: 4, carbsPerUnit: 14, fatsPerUnit: 1 },
  { keywords: ['roti', 'chapati', 'flatbread'], name: 'Whole Wheat Roti/Chapati', defaultPortion: '1 piece (40g)', caloriesPerUnit: 104, proteinPerUnit: 3.1, carbsPerUnit: 20, fatsPerUnit: 0.5 },
  { keywords: ['naan', 'butter naan'], name: 'Butter Naan', defaultPortion: '1 piece (90g)', caloriesPerUnit: 260, proteinPerUnit: 8, carbsPerUnit: 42, fatsPerUnit: 7 },
  { keywords: ['pasta', 'spaghetti', 'penne'], name: 'Cooked Pasta with Sauce', defaultPortion: '1 cup (200g)', caloriesPerUnit: 280, proteinPerUnit: 9, carbsPerUnit: 48, fatsPerUnit: 6 },
  { keywords: ['ramen', 'noodles', 'instant noodles'], name: 'Instant Noodles / Ramen', defaultPortion: '1 pack (85g)', caloriesPerUnit: 380, proteinPerUnit: 8, carbsPerUnit: 52, fatsPerUnit: 16 },

  // Fast Foods, Pizza & Street Food
  { keywords: ['pizza', 'slice of pizza', 'pepperoni pizza'], name: 'Pepperoni Pizza Slice', defaultPortion: '1 slice (107g)', caloriesPerUnit: 285, proteinPerUnit: 12, carbsPerUnit: 36, fatsPerUnit: 10 },
  { keywords: ['burger', 'cheeseburger', 'hamburger'], name: 'Cheeseburger', defaultPortion: '1 burger (150g)', caloriesPerUnit: 303, proteinPerUnit: 15, carbsPerUnit: 30, fatsPerUnit: 14 },
  { keywords: ['french fries', 'fries'], name: 'Medium French Fries', defaultPortion: '1 medium (117g)', caloriesPerUnit: 365, proteinPerUnit: 4, carbsPerUnit: 48, fatsPerUnit: 17 },
  { keywords: ['taco', 'tacos'], name: 'Beef Taco', defaultPortion: '1 taco (78g)', caloriesPerUnit: 170, proteinPerUnit: 9, carbsPerUnit: 13, fatsPerUnit: 9 },
  { keywords: ['burrito'], name: 'Chicken Burrito', defaultPortion: '1 burrito (300g)', caloriesPerUnit: 550, proteinPerUnit: 32, carbsPerUnit: 62, fatsPerUnit: 18 },
  { keywords: ['samosa', 'shingara'], name: 'Fried Vegetable Samosa', defaultPortion: '1 piece (50g)', caloriesPerUnit: 130, proteinPerUnit: 2.5, carbsPerUnit: 16, fatsPerUnit: 6.5 },
  { keywords: ['shawarma', 'kebab roll'], name: 'Chicken Shawarma Wrap', defaultPortion: '1 wrap (250g)', caloriesPerUnit: 430, proteinPerUnit: 26, carbsPerUnit: 42, fatsPerUnit: 16 },
  { keywords: ['sandwich'], name: 'Club Sandwich', defaultPortion: '1 sandwich (220g)', caloriesPerUnit: 380, proteinPerUnit: 22, carbsPerUnit: 38, fatsPerUnit: 15 },
  { keywords: ['sushi'], name: 'Salmon Sushi Roll', defaultPortion: '6 pieces (180g)', caloriesPerUnit: 290, proteinPerUnit: 14, carbsPerUnit: 38, fatsPerUnit: 8 },

  // Snacks, Beverages & Desserts
  { keywords: ['coke', 'coca cola', 'soda', 'pepsi'], name: 'Regular Soda / Cola', defaultPortion: '1 can (355ml)', caloriesPerUnit: 140, proteinPerUnit: 0, carbsPerUnit: 39, fatsPerUnit: 0 },
  { keywords: ['orange juice', 'juice'], name: 'Fresh Orange Juice', defaultPortion: '1 glass (240ml)', caloriesPerUnit: 112, proteinPerUnit: 1.7, carbsPerUnit: 26, fatsPerUnit: 0.5 },
  { keywords: ['coffee', 'latte', 'cappuccino'], name: 'Milk Coffee / Latte', defaultPortion: '1 cup (240ml)', caloriesPerUnit: 120, proteinPerUnit: 6, carbsPerUnit: 10, fatsPerUnit: 6 },
  { keywords: ['protein shake', 'whey protein'], name: 'Whey Protein Shake', defaultPortion: '1 scoop with water (30g)', caloriesPerUnit: 120, proteinPerUnit: 24, carbsPerUnit: 3, fatsPerUnit: 1.5 },
  { keywords: ['chocolate', 'chocolate bar'], name: 'Milk Chocolate Bar', defaultPortion: '1 bar (43g)', caloriesPerUnit: 235, proteinPerUnit: 3, carbsPerUnit: 26, fatsPerUnit: 13 },
  { keywords: ['ice cream'], name: 'Vanilla Ice Cream', defaultPortion: '1 scoop (72g)', caloriesPerUnit: 137, proteinPerUnit: 2.3, carbsPerUnit: 16, fatsPerUnit: 7.2 },
  { keywords: ['cake', 'chocolate cake'], name: 'Chocolate Cake Slice', defaultPortion: '1 slice (100g)', caloriesPerUnit: 370, proteinPerUnit: 5, carbsPerUnit: 50, fatsPerUnit: 18 },
  { keywords: ['almonds', 'almond'], name: 'Raw Almonds', defaultPortion: '1 handful (28g / 23 nuts)', caloriesPerUnit: 164, proteinPerUnit: 6, carbsPerUnit: 6, fatsPerUnit: 14 },
  { keywords: ['peanut butter'], name: 'Peanut Butter', defaultPortion: '2 tbsp (32g)', caloriesPerUnit: 188, proteinPerUnit: 8, carbsPerUnit: 7, fatsPerUnit: 16 },
];

/**
 * Intelligent Dynamic Food Calorie Estimator for ANY unlisted food name
 */
function estimateDynamicFoodCalories(query: string): ChatMessage['foodMacroCard'] {
  const lower = query.toLowerCase().trim();
  
  // Extract number from query if user specifies (e.g. "3 eggs" or "200g chicken")
  const numMatch = lower.match(/(\d+(\.\d+)?)/);
  let quantity = numMatch ? parseFloat(numMatch[1]) : 1;
  if (quantity <= 0) quantity = 1;

  // Capitalize title
  const cleanTitle = query
    .replace(/\b(how many|calories|in|for|what is the|of|a|an|the|kcal|approx)\b/gi, '')
    .trim();
  const foodTitle = cleanTitle.length > 1
    ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)
    : 'Custom Food Dish';

  // Base estimation based on food type keywords
  let baseCal = 220;
  let baseProt = 12;
  let baseCarbs = 25;
  let baseFat = 8;

  if (/salad|veggie|vegetable|fruit|apple|berry|cucumber|soup/.test(lower)) {
    baseCal = 85; baseProt = 2.5; baseCarbs = 16; baseFat = 1.5;
  } else if (/chicken|turkey|breast|tuna|fish|shrimp|prawn|egg|protein/.test(lower)) {
    baseCal = 180; baseProt = 28; baseCarbs = 2; baseFat = 6;
  } else if (/beef|steak|pork|mutton|lamb|burger|meatball/.test(lower)) {
    baseCal = 280; baseProt = 25; baseCarbs = 2; baseFat = 18;
  } else if (/rice|pasta|bread|roti|noodle|spaghetti|oat|grain|corn|biryani/.test(lower)) {
    baseCal = 240; baseProt = 6; baseCarbs = 48; baseFat = 3;
  } else if (/pizza|fries|fried|burger|shawarma|taco|burrito|samosa|cheeseburger/.test(lower)) {
    baseCal = 350; baseProt = 14; baseCarbs = 38; baseFat = 16;
  } else if (/cake|donut|ice cream|chocolate|cookie|dessert|candy|sweet/.test(lower)) {
    baseCal = 320; baseProt = 4; baseCarbs = 45; baseFat = 14;
  } else if (/shake|smoothie|juice|latte|milk|soda/.test(lower)) {
    baseCal = 160; baseProt = 5; baseCarbs = 26; baseFat = 4;
  }

  // Adjust multiplier for weight (e.g. 200g -> multiplier 2)
  let finalMultiplier = quantity;
  if (/g|grams|ml/.test(lower) && quantity > 20) {
    finalMultiplier = quantity / 100;
  }

  const finalCal = Math.round(baseCal * finalMultiplier);
  const finalProt = parseFloat((baseProt * finalMultiplier).toFixed(1));
  const finalCarbs = parseFloat((baseCarbs * finalMultiplier).toFixed(1));
  const finalFat = parseFloat((baseFat * finalMultiplier).toFixed(1));

  return {
    foodName: foodTitle,
    portion: finalMultiplier > 1 ? `${quantity} serving` : '1 standard serving',
    calories: finalCal,
    protein: finalProt,
    carbs: finalCarbs,
    fats: finalFat,
  };
}

/**
 * Precision Clinical Health Advisory Engine for queries about weight loss, weight gain, foods to avoid, normalizing weight, etc.
 */
function generateHealthAdviceFallback(userQuery: string): string | null {
  const lower = userQuery.toLowerCase();

  const isWeightGainAdvice = /gaining weight|gain weight|gained weight|weight is increasing|put on weight|obese|overweight|normalize my weight|avoid now|lose weight|weight loss|fat loss|cut fat|belly fat/.test(lower);
  const isMuscleGainAdvice = /build muscle|muscle gain|bulk up|bulking|hypertrophy/.test(lower);
  const isDietPlanAdvice = /diet plan|what should i eat|meal plan|healthy food|healthy diet/.test(lower);

  if (isWeightGainAdvice) {
    return (
      `### 💡 Comprehensive Health Strategy: Weight Management & Normalization\n\n` +
      `If you are gaining unwanted weight day by day, here is a science-backed clinical protocol to stop weight gain and normalize your weight safely:\n\n` +
      `#### 🚨 1. Foods & Beverages to AVOID Immediately:\n` +
      `• **Sugary Drinks & Liquid Calories:** Sodas, sweetened fruit juices, energy drinks, and flavored coffees (they cause rapid insulin spikes).\n` +
      `• **Ultra-Processed & Deep-Fried Foods:** French fries, potato chips, deep-fried snacks, and fast-food burgers (high energy density, low satiety).\n` +
      `• **Refined Carbohydrates:** White bread, pastries, cakes, sugary cereals, and white flour snacks.\n` +
      `• **High-Calorie Sauces & Dressings:** Mayonnaise, creamy salad dressings, and heavy gravies.\n\n` +
      `#### 🥗 2. Foods to EAT & PRIORITIZE:\n` +
      `• **Lean High-Protein Foods:** Chicken breast, eggs, fish, tofu, Greek yogurt, and legumes (protein increases satiety and metabolic rate).\n` +
      `• **High-Fiber Vegetables & Greens:** Broccoli, spinach, cucumbers, leafy greens, and whole fruits like apples & berries.\n` +
      `• **Complex Carbohydrates (in moderate portions):** Oats, quinoa, brown rice, and sweet potatoes.\n\n` +
      `#### 🎯 3. Action Steps to Normalize Your Weight:\n` +
      `1. **Create a Moderate Caloric Deficit:** Aim for ~400–500 kcal below your Total Daily Energy Expenditure (TDEE).\n` +
      `2. **Increase Daily Movement:** Aim for 8,000 to 10,000 steps daily.\n` +
      `3. **Drink Water Before Meals:** Drink 1 glass of water 15–20 minutes before meals to curb overeating.\n` +
      `4. **Prioritize 7–8 Hours of Quality Sleep:** Poor sleep elevates cortisol and ghrelin (hunger hormone).\n\n` +
      `*You can also type any food name (e.g. "Calories in 2 eggs" or "Calories in biryani") to check its exact macros!*`
    );
  }

  if (isMuscleGainAdvice) {
    return (
      `### 🏋️ Clinical Strategy: Clean Muscle Building & Hypertrophy\n\n` +
      `To build lean muscle mass while keeping body fat low:\n\n` +
      `1. **Protein Intake:** Consume **1.8g to 2.2g of protein per kg** of body weight daily (chicken breast, eggs, fish, cottage cheese, whey).\n` +
      `2. **Caloric Surplus:** Maintain a modest surplus of +250 to +400 kcal above maintenance.\n` +
      `3. **Progressive Overload:** Focus on heavy compound lifts (squats, deadlifts, bench press, rows) 4–5 days per week.\n` +
      `4. **Recovery & Hydration:** Drink 3–4 Liters of water and rest 48 hours between training the same muscle group.`
    );
  }

  if (isDietPlanAdvice) {
    return (
      `### 🥗 Optimal Balanced Daily Plate Strategy\n\n` +
      `Build your daily meals using the **50-25-25 Metabolic Formula**:\n\n` +
      `• **50% Fiber & Vegetables:** Leafy greens, broccoli, peppers, tomatoes, and cucumbers.\n` +
      `• **25% Clean Protein:** Grilled chicken, eggs, salmon, turkey, or tofu.\n` +
      `• **25% Complex Carbs:** Brown rice, quinoa, sweet potatoes, or oats.\n` +
      `• **Healthy Fats (1–2 tbsp):** Extra virgin olive oil, avocado, or raw almonds.\n\n` +
      `*Ask me about any specific dish or food item for instant calorie & macro breakdown!*`
    );
  }

  return null;
}

/**
 * Interactive AI Chatbot query handler for NutriVision
 */
export async function askAIChatbot(
  userQuery: string,
  history: Array<{ role: 'user' | 'model'; text: string }> = []
): Promise<{ text: string; foodMacroCard?: ChatMessage['foodMacroCard'] }> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const lowerQuery = userQuery.toLowerCase().trim();

  // Check if query is asking for food calorie breakdown
  const isFoodQuery = /calorie|calories|macro|macros|protein|carb|carbs|fat|fats|kcal|nutrition|how many calories|food|eat|plate|dish|bowl|slice|gram|g\b/i.test(lowerQuery);

  // 1. Try finding matching food item from database
  let matchedFoodCard: ChatMessage['foodMacroCard'] | undefined = undefined;
  const matchedFood = FOOD_DATABASE.find((item) =>
    item.keywords.some((kw) => lowerQuery.includes(kw))
  );

  const quantityMatch = lowerQuery.match(/(\d+(\.\d+)?)\s*(g|grams|ml|slice|slices|cup|cups|pcs|pieces)?/);
  let multiplier = 1;
  if (quantityMatch && quantityMatch[1]) {
    const num = parseFloat(quantityMatch[1]);
    if (!isNaN(num) && num > 0 && num <= 2000) {
      multiplier = num > 50 && quantityMatch[3] === 'g' ? num / 100 : num;
    }
  }

  if (matchedFood) {
    matchedFoodCard = {
      foodName: matchedFood.name,
      portion: multiplier > 1 ? `${multiplier} x ${matchedFood.defaultPortion}` : matchedFood.defaultPortion,
      calories: Math.round(matchedFood.caloriesPerUnit * multiplier),
      protein: parseFloat((matchedFood.proteinPerUnit * multiplier).toFixed(1)),
      carbs: parseFloat((matchedFood.carbsPerUnit * multiplier).toFixed(1)),
      fats: parseFloat((matchedFood.fatsPerUnit * multiplier).toFixed(1)),
    };
  } else if (isFoodQuery && lowerQuery.length > 3) {
    // Dynamic food calorie estimator for unlisted food items
    matchedFoodCard = estimateDynamicFoodCalories(userQuery);
  }

  // 2. If Gemini API Key is configured and valid, call live Gemini API
  if (apiKey && apiKey.trim() !== '' && !apiKey.includes('your_gemini_api_key')) {
    try {
      const systemInstruction = `You are NutriVision AI, an elite ChatGPT-level clinical nutritionist, sports dietitian, and fitness scientist.
You can accurately calculate the calories and macro split (Protein, Carbs, Fats) for ANY food item, meal, or beverage in the world.
You also provide comprehensive, empathetic, science-based health tips, diet advice, foods to avoid, and step-by-step strategies for weight loss, weight gain, normalizing weight, muscle building, and overall wellness.

INSTRUCTIONS:
1. Provide a clear, beautifully formatted, markdown response (use headers, bullet points, and bold text).
2. If the user asks about food calories or meals, ALWAYS include a JSON block at the very end of your response formatted EXACTLY as follows:
\`\`\`json
{
  "foodName": "Name of Food",
  "portion": "Portion size (e.g., 1 bowl or 200g)",
  "calories": 350,
  "protein": 25,
  "carbs": 40,
  "fats": 10
}
\`\`\`
3. If the user asks health or weight advice (e.g. "I am gaining weight, what should I avoid?"), provide clear actionable advice:
   - Foods to avoid
   - Foods to prioritize
   - Daily habits & exercise tips
4. Keep tone professional, encouraging, helpful, and concise.`;

      const contents = history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      }));
      contents.push({
        role: 'user',
        parts: [{ text: userQuery }],
      });

      const geminiModel = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        let foodMacroCard = matchedFoodCard;
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            foodMacroCard = {
              foodName: String(parsed.foodName || 'Analyzed Food Item'),
              portion: String(parsed.portion || '1 serving'),
              calories: Number(parsed.calories) || 0,
              protein: Number(parsed.protein) || 0,
              carbs: Number(parsed.carbs) || 0,
              fats: Number(parsed.fats) || 0,
            };
          } catch (e) {
            // keep matchedFoodCard
          }
        }

        const cleanText = responseText.replace(/```json[\s\S]*?```/gi, '').trim();
        return {
          text: cleanText || responseText,
          foodMacroCard,
        };
      }
    } catch (err) {
      console.warn('Gemini Chat API error, using dynamic AI engine:', err);
    }
  }

  // 3. Precision Local AI Advisory Engine Fallback (when API key is missing or offline)
  const healthAdvice = generateHealthAdviceFallback(userQuery);

  if (healthAdvice) {
    return {
      text: healthAdvice,
      foodMacroCard: matchedFoodCard,
    };
  }

  if (matchedFoodCard) {
    return {
      text: `Based on clinical nutritional database analysis, **${matchedFoodCard.foodName}** (${matchedFoodCard.portion}) contains approximately **${matchedFoodCard.calories} calories**.\n\n` +
        `• **Protein:** ${matchedFoodCard.protein}g\n` +
        `• **Carbohydrates:** ${matchedFoodCard.carbs}g\n` +
        `• **Fats:** ${matchedFoodCard.fats}g\n\n` +
        `💡 **Nutrition Insight:** Pair this meal with high-fiber greens and adequate water intake to maintain steady energy levels throughout the day!`,
      foodMacroCard: matchedFoodCard,
    };
  }

  // Universal Default AI Response for arbitrary health / food questions
  return {
    text: `### 💡 NutriVision AI Assistant Guidance\n\n` +
      `Here is a key nutrition & health breakdown for your query:\n\n` +
      `1. **Calorie & Macro Equilibrium:** Maintaining a consistent macro balance (High Lean Protein, Controlled Complex Carbs, Healthy Unsaturated Fats) optimizes metabolic health.\n` +
      `2. **Weight Management Protocol:** To lose fat or stop unwanted weight gain, maintain a ~400 kcal daily deficit and avoid liquid sugars & fried fast food.\n` +
      `3. **Food Calorie Queries:** You can type ANY food item (e.g. *"Calories in biryani"*, *"Calories in 2 slices of pizza"*, or *"Calories in 150g salmon"*) for an instant macro breakdown!\n\n` +
      `*Feel free to ask any specific health question or food calorie lookup!*`,
  };
}

