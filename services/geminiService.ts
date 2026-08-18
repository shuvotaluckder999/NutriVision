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
export interface FoodItemData {
  keywords: string[];
  name: string;
  bengaliName?: string;
  defaultPortion: string;
  caloriesPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatsPerUnit: number;
}

export const FOOD_DATABASE: FoodItemData[] = [
  // Fruits & Vegetables
  { keywords: ['apple', 'apples', 'আপেল', 'apel'], name: 'Fresh Apple', bengaliName: 'তাজা আপেল', defaultPortion: '1 medium (180g)', caloriesPerUnit: 95, proteinPerUnit: 0.5, carbsPerUnit: 25, fatsPerUnit: 0.3 },
  { keywords: ['banana', 'bananas', 'কলা', 'kola'], name: 'Ripe Banana', bengaliName: 'পাকা কলা', defaultPortion: '1 medium (118g)', caloriesPerUnit: 105, proteinPerUnit: 1.3, carbsPerUnit: 27, fatsPerUnit: 0.4 },
  { keywords: ['orange', 'oranges', 'কমলা', 'komla'], name: 'Fresh Orange', bengaliName: 'তাজা কমলা', defaultPortion: '1 medium (130g)', caloriesPerUnit: 62, proteinPerUnit: 1.2, carbsPerUnit: 15, fatsPerUnit: 0.2 },
  { keywords: ['mango', 'mangoes', 'আম', 'aam'], name: 'Ripe Mango', bengaliName: 'পাকা আম', defaultPortion: '1 cup sliced (165g)', caloriesPerUnit: 99, proteinPerUnit: 1.4, carbsPerUnit: 25, fatsPerUnit: 0.6 },
  { keywords: ['strawberry', 'strawberries', 'স্ট্রবেরি'], name: 'Fresh Strawberries', bengaliName: 'তাজা স্ট্রবেরি', defaultPortion: '1 cup (150g)', caloriesPerUnit: 49, proteinPerUnit: 1.0, carbsPerUnit: 11.7, fatsPerUnit: 0.5 },
  { keywords: ['watermelon', 'তরমুজ', 'tormuj'], name: 'Watermelon', bengaliName: 'পাকা তরমুজ', defaultPortion: '1 cup diced (152g)', caloriesPerUnit: 46, proteinPerUnit: 0.9, carbsPerUnit: 11.5, fatsPerUnit: 0.2 },
  { keywords: ['avocado', 'avacado', 'অ্যাভোকাডো'], name: 'Fresh Avocado', bengaliName: 'অ্যাভোকাডো', defaultPortion: '1 medium (150g)', caloriesPerUnit: 240, proteinPerUnit: 3.0, carbsPerUnit: 12, fatsPerUnit: 22 },
  { keywords: ['broccoli', 'ব্রকলি'], name: 'Steamed Broccoli', bengaliName: 'সিদ্ধ ব্রকলি', defaultPortion: '1 cup (150g)', caloriesPerUnit: 55, proteinPerUnit: 3.7, carbsPerUnit: 11, fatsPerUnit: 0.6 },
  { keywords: ['spinach', 'পালং শাক', 'শাক', 'shak'], name: 'Fresh Spinach', bengaliName: 'পালং শাক', defaultPortion: '1 cup (30g)', caloriesPerUnit: 7, proteinPerUnit: 0.9, carbsPerUnit: 1.1, fatsPerUnit: 0.1 },
  { keywords: ['potato', 'potatoes', 'boiled potato', 'আলু', 'সিদ্ধ আলু', 'alu'], name: 'Boiled Potato', bengaliName: 'সিদ্ধ আলু', defaultPortion: '1 medium (150g)', caloriesPerUnit: 130, proteinPerUnit: 3.0, carbsPerUnit: 30, fatsPerUnit: 0.2 },
  { keywords: ['sweet potato', 'sweet potatoes', 'মিষ্টি আলু'], name: 'Baked Sweet Potato', bengaliName: 'মিষ্টি আলু', defaultPortion: '1 medium (114g)', caloriesPerUnit: 103, proteinPerUnit: 2.3, carbsPerUnit: 24, fatsPerUnit: 0.2 },
  
  // Meats, Poultry & Seafood
  { keywords: ['chicken breast', 'chicken', 'grilled chicken', 'মুরগির মাংস', 'মুরগি', 'murgi'], name: 'Grilled Chicken Breast', bengaliName: 'গ্রিলড চিকেন ব্রেস্ট (মুরগির মাংস)', defaultPortion: '100g serving', caloriesPerUnit: 165, proteinPerUnit: 31, carbsPerUnit: 0, fatsPerUnit: 3.6 },
  { keywords: ['chicken thigh', 'মুরগির লেগ', 'মুরগির মাংস'], name: 'Chicken Thigh', bengaliName: 'চিকেন থাই (মুরগির মাংস)', defaultPortion: '100g serving', caloriesPerUnit: 209, proteinPerUnit: 26, carbsPerUnit: 0, fatsPerUnit: 11 },
  { keywords: ['steak', 'beef', 'beef steak', 'sirloin', 'গরুর মাংস', 'gorur mangsho', 'বিফ'], name: 'Sirloin Beef Steak', bengaliName: 'গরুর মাংস (বিফ স্টেক)', defaultPortion: '100g serving', caloriesPerUnit: 244, proteinPerUnit: 27, carbsPerUnit: 0, fatsPerUnit: 14 },
  { keywords: ['ground beef', 'minced beef', 'কিম্বা', 'গরুর কিমা'], name: 'Lean Ground Beef', bengaliName: 'গরুর মাংসের কিমা', defaultPortion: '100g serving', caloriesPerUnit: 250, proteinPerUnit: 26, carbsPerUnit: 0, fatsPerUnit: 15 },
  { keywords: ['mutton', 'lamb', 'খাসির মাংস', 'khasir mangsho'], name: 'Cooked Mutton / Lamb', bengaliName: 'রান্না করা খাসির মাংস', defaultPortion: '100g serving', caloriesPerUnit: 294, proteinPerUnit: 25, carbsPerUnit: 0, fatsPerUnit: 21 },
  { keywords: ['salmon', 'salmon fillet', 'স্যামন মাছ'], name: 'Grilled Salmon', bengaliName: 'গ্রিলড স্যামন মাছ', defaultPortion: '100g serving', caloriesPerUnit: 206, proteinPerUnit: 22, carbsPerUnit: 0, fatsPerUnit: 12 },
  { keywords: ['tuna', 'canned tuna', 'টুনা মাছ'], name: 'Canned Tuna in Water', bengaliName: 'টুনা মাছ', defaultPortion: '1 can (165g)', caloriesPerUnit: 191, proteinPerUnit: 42, carbsPerUnit: 0, fatsPerUnit: 1.4 },
  { keywords: ['shrimp', 'prawn', 'prawns', 'চিংড়ি মাছ', 'chingri'], name: 'Cooked Shrimp', bengaliName: 'রান্না করা চিংড়ি মাছ', defaultPortion: '100g serving', caloriesPerUnit: 99, proteinPerUnit: 24, carbsPerUnit: 0.2, fatsPerUnit: 0.3 },
  { keywords: ['fish', 'fried fish', 'grilled fish', 'মাছ', 'mach', 'mache'], name: 'Grilled White Fish', bengaliName: 'গ্রিলড সাদা মাছ', defaultPortion: '100g serving', caloriesPerUnit: 125, proteinPerUnit: 22, carbsPerUnit: 0, fatsPerUnit: 3 },

  // Eggs & Dairy
  { keywords: ['egg', 'eggs', 'boiled egg', 'ডিম', 'সিদ্ধ ডিম', 'dim'], name: 'Boiled Egg', bengaliName: 'সিদ্ধ ডিম', defaultPortion: '1 large egg (50g)', caloriesPerUnit: 72, proteinPerUnit: 6.3, carbsPerUnit: 0.4, fatsPerUnit: 4.8 },
  { keywords: ['fried egg', 'ডিম ভাজি', 'dim bhaji'], name: 'Fried Egg with Oil', bengaliName: 'ডিম পোচ / ডিম ভাজি', defaultPortion: '1 large egg', caloriesPerUnit: 90, proteinPerUnit: 6.3, carbsPerUnit: 0.4, fatsPerUnit: 7.0 },
  { keywords: ['omelet', 'omelette', 'আমলেট'], name: '2-Egg Cheese Omelette', bengaliName: 'ডিম চিজ অমলেট', defaultPortion: '1 omelette', caloriesPerUnit: 240, proteinPerUnit: 14, carbsPerUnit: 2, fatsPerUnit: 19 },
  { keywords: ['milk', 'glass of milk', 'দুধ', 'dudh'], name: 'Whole Milk', bengaliName: 'গরুর খাঁটি দুধ', defaultPortion: '1 glass (240ml)', caloriesPerUnit: 149, proteinPerUnit: 8, carbsPerUnit: 12, fatsPerUnit: 8 },
  { keywords: ['greek yogurt', 'yogurt', 'দই', 'doi', 'টক দই'], name: 'Plain Greek Yogurt', bengaliName: 'মিষ্টি/টক দই', defaultPortion: '1 cup (170g)', caloriesPerUnit: 100, proteinPerUnit: 17, carbsPerUnit: 6, fatsPerUnit: 0.7 },
  { keywords: ['cheese', 'cheddar cheese', 'পনির', 'ponir'], name: 'Cheddar Cheese', bengaliName: 'পনির', defaultPortion: '1 slice (28g)', caloriesPerUnit: 115, proteinPerUnit: 7, carbsPerUnit: 0.4, fatsPerUnit: 9.4 },

  // Grains, Rice, Noodles & Breads
  { keywords: ['white rice', 'rice', 'steamed rice', 'cooked rice', 'ভাত', 'চাল', 'bhat'], name: 'Cooked White Rice', bengaliName: 'সিদ্ধ সাদা ভাত', defaultPortion: '1 cup (158g)', caloriesPerUnit: 205, proteinPerUnit: 4.2, carbsPerUnit: 45, fatsPerUnit: 0.4 },
  { keywords: ['brown rice', 'লাল চালের ভাত'], name: 'Cooked Brown Rice', bengaliName: 'লাল চালের ভাত', defaultPortion: '1 cup (195g)', caloriesPerUnit: 216, proteinPerUnit: 5.0, carbsPerUnit: 45, fatsPerUnit: 1.8 },
  { keywords: ['biryani', 'chicken biryani', 'beef biryani', 'বিরিয়ানি', 'biriyani'], name: 'Chicken Biryani', bengaliName: 'চিকেন বিরিয়ানি', defaultPortion: '1 plate (350g)', caloriesPerUnit: 520, proteinPerUnit: 28, carbsPerUnit: 65, fatsPerUnit: 16 },
  { keywords: ['fried rice', 'ফ্রাইড রাইস'], name: 'Egg Fried Rice', bengaliName: 'ডিম ফ্রাইড রাইস', defaultPortion: '1 plate (250g)', caloriesPerUnit: 380, proteinPerUnit: 10, carbsPerUnit: 55, fatsPerUnit: 13 },
  { keywords: ['dal', 'lentil', 'daal', 'ডাল', 'মসুর ডাল', 'ডাল ভাত'], name: 'Lentil Soup / Cooked Dal', bengaliName: 'রান্না করা মসুর ডাল', defaultPortion: '1 bowl (150g)', caloriesPerUnit: 120, proteinPerUnit: 8, carbsPerUnit: 18, fatsPerUnit: 2.5 },
  { keywords: ['oatmeal', 'oats', 'oat', 'ওটস'], name: 'Cooked Oatmeal', bengaliName: 'রান্না করা ওটস', defaultPortion: '1 cup (234g)', caloriesPerUnit: 166, proteinPerUnit: 5.9, carbsPerUnit: 28, fatsPerUnit: 3.6 },
  { keywords: ['bread', 'slice of bread', 'toast', 'পাউরুটি', 'pauruthi'], name: 'Whole Wheat Bread', bengaliName: 'পাউরুটি / টোস্ট', defaultPortion: '1 slice (35g)', caloriesPerUnit: 80, proteinPerUnit: 4, carbsPerUnit: 14, fatsPerUnit: 1 },
  { keywords: ['roti', 'chapati', 'flatbread', 'রুটি', 'চাপাতি', 'roti'], name: 'Whole Wheat Roti/Chapati', bengaliName: 'আটার হাত রুটি', defaultPortion: '1 piece (40g)', caloriesPerUnit: 104, proteinPerUnit: 3.1, carbsPerUnit: 20, fatsPerUnit: 0.5 },
  { keywords: ['paratha', 'porota', 'পরোটা'], name: 'Plain Paratha', bengaliName: 'তেলে ভাজা পরোটা', defaultPortion: '1 piece (60g)', caloriesPerUnit: 260, proteinPerUnit: 5, carbsPerUnit: 34, fatsPerUnit: 12 },
  { keywords: ['naan', 'butter naan', 'নান রুটি'], name: 'Butter Naan', bengaliName: 'বাটার নান রুটি', defaultPortion: '1 piece (90g)', caloriesPerUnit: 260, proteinPerUnit: 8, carbsPerUnit: 42, fatsPerUnit: 7 },
  { keywords: ['pasta', 'spaghetti', 'penne', 'পাস্তা'], name: 'Cooked Pasta with Sauce', bengaliName: 'পাস্তা', defaultPortion: '1 cup (200g)', caloriesPerUnit: 280, proteinPerUnit: 9, carbsPerUnit: 48, fatsPerUnit: 6 },
  { keywords: ['ramen', 'noodles', 'instant noodles', 'নুডুলস'], name: 'Instant Noodles / Ramen', bengaliName: 'ইনস্ট্যান্ট নুডুলস', defaultPortion: '1 pack (85g)', caloriesPerUnit: 380, proteinPerUnit: 8, carbsPerUnit: 52, fatsPerUnit: 16 },

  // Fast Foods, Pizza & Street Food
  { keywords: ['pizza', 'slice of pizza', 'pepperoni pizza', 'পিজ্জা'], name: 'Pepperoni Pizza Slice', bengaliName: 'পিজ্জা', defaultPortion: '1 slice (107g)', caloriesPerUnit: 285, proteinPerUnit: 12, carbsPerUnit: 36, fatsPerUnit: 10 },
  { keywords: ['burger', 'cheeseburger', 'hamburger', 'বার্গার'], name: 'Cheeseburger', bengaliName: 'বার্গার', defaultPortion: '1 burger (150g)', caloriesPerUnit: 303, proteinPerUnit: 15, carbsPerUnit: 30, fatsPerUnit: 14 },
  { keywords: ['french fries', 'fries', 'ফ্রেঞ্চ ফ্রাই'], name: 'Medium French Fries', bengaliName: 'ফ্রেঞ্চ ফ্রাই', defaultPortion: '1 medium (117g)', caloriesPerUnit: 365, proteinPerUnit: 4, carbsPerUnit: 48, fatsPerUnit: 17 },
  { keywords: ['taco', 'tacos'], name: 'Beef Taco', bengaliName: 'বিফ ট্যাকো', defaultPortion: '1 taco (78g)', caloriesPerUnit: 170, proteinPerUnit: 9, carbsPerUnit: 13, fatsPerUnit: 9 },
  { keywords: ['burrito'], name: 'Chicken Burrito', bengaliName: 'চিকেন বুরিটো', defaultPortion: '1 burrito (300g)', caloriesPerUnit: 550, proteinPerUnit: 32, carbsPerUnit: 62, fatsPerUnit: 18 },
  { keywords: ['samosa', 'shingara', 'সিঙ্গাড়া', 'সমুচা'], name: 'Fried Vegetable Samosa', bengaliName: 'সিঙ্গাড়া / সমুচা', defaultPortion: '1 piece (50g)', caloriesPerUnit: 130, proteinPerUnit: 2.5, carbsPerUnit: 16, fatsPerUnit: 6.5 },
  { keywords: ['shawarma', 'kebab roll', 'শাওয়ারমা', 'কাবাব roll'], name: 'Chicken Shawarma Wrap', bengaliName: 'চিকেন শাওয়ারমা', defaultPortion: '1 wrap (250g)', caloriesPerUnit: 430, proteinPerUnit: 26, carbsPerUnit: 42, fatsPerUnit: 16 },
  { keywords: ['sandwich', 'স্যান্ডউইচ'], name: 'Club Sandwich', bengaliName: 'ক্লাব স্যান্ডউইচ', defaultPortion: '1 sandwich (220g)', caloriesPerUnit: 380, proteinPerUnit: 22, carbsPerUnit: 38, fatsPerUnit: 15 },
  { keywords: ['sushi', 'সুশি'], name: 'Salmon Sushi Roll', bengaliName: 'স্যামন সুশি রোল', defaultPortion: '6 pieces (180g)', caloriesPerUnit: 290, proteinPerUnit: 14, carbsPerUnit: 38, fatsPerUnit: 8 },

  // Snacks, Beverages & Desserts
  { keywords: ['coke', 'coca cola', 'soda', 'pepsi', 'কোকা কোলা', 'সফট ড্রিংক'], name: 'Regular Soda / Cola', bengaliName: 'কোকা কোলা / সোডা', defaultPortion: '1 can (355ml)', caloriesPerUnit: 140, proteinPerUnit: 0, carbsPerUnit: 39, fatsPerUnit: 0 },
  { keywords: ['orange juice', 'juice', 'জুস', 'ফলের রস'], name: 'Fresh Orange Juice', bengaliName: 'কমলার জুস', defaultPortion: '1 glass (240ml)', caloriesPerUnit: 112, proteinPerUnit: 1.7, carbsPerUnit: 26, fatsPerUnit: 0.5 },
  { keywords: ['tea', 'cha', 'চা', 'দুধ চা', 'লাল চা'], name: 'Milk Tea / Milk Coffee', bengaliName: 'দুধ চা / কফি', defaultPortion: '1 cup (180ml)', caloriesPerUnit: 90, proteinPerUnit: 3, carbsPerUnit: 12, fatsPerUnit: 3 },
  { keywords: ['coffee', 'latte', 'cappuccino', 'কফি'], name: 'Milk Coffee / Latte', bengaliName: 'কফি', defaultPortion: '1 cup (240ml)', caloriesPerUnit: 120, proteinPerUnit: 6, carbsPerUnit: 10, fatsPerUnit: 6 },
  { keywords: ['protein shake', 'whey protein', 'প্রোটিন শেক'], name: 'Whey Protein Shake', bengaliName: 'হুই প্রোটিন শেক', defaultPortion: '1 scoop with water (30g)', caloriesPerUnit: 120, proteinPerUnit: 24, carbsPerUnit: 3, fatsPerUnit: 1.5 },
  { keywords: ['chocolate', 'chocolate bar', 'চকলেট'], name: 'Milk Chocolate Bar', bengaliName: 'চকলেট বার', defaultPortion: '1 bar (43g)', caloriesPerUnit: 235, proteinPerUnit: 3, carbsPerUnit: 26, fatsPerUnit: 13 },
  { keywords: ['ice cream', 'আইসক্রিম'], name: 'Vanilla Ice Cream', bengaliName: 'ভ্যানিলা আইসক্রিম', defaultPortion: '1 scoop (72g)', caloriesPerUnit: 137, proteinPerUnit: 2.3, carbsPerUnit: 16, fatsPerUnit: 7.2 },
  { keywords: ['cake', 'chocolate cake', 'কেক'], name: 'Chocolate Cake Slice', bengaliName: 'চকলেট কেক', defaultPortion: '1 slice (100g)', caloriesPerUnit: 370, proteinPerUnit: 5, carbsPerUnit: 50, fatsPerUnit: 18 },
  { keywords: ['almonds', 'almond', 'কাঠবাদাম', 'বাদাম'], name: 'Raw Almonds', bengaliName: 'কাঠবাদাম', defaultPortion: '1 handful (28g / 23 nuts)', caloriesPerUnit: 164, proteinPerUnit: 6, carbsPerUnit: 6, fatsPerUnit: 14 },
  { keywords: ['peanut butter', 'বাদাম বাটার'], name: 'Peanut Butter', bengaliName: 'পিনাট বাটার', defaultPortion: '2 tbsp (32g)', caloriesPerUnit: 188, proteinPerUnit: 8, carbsPerUnit: 7, fatsPerUnit: 16 },
];

/**
 * Intelligent Dynamic Food Calorie Estimator for ANY unlisted food name
 */
export function estimateDynamicFoodCalories(query: string): ChatMessage['foodMacroCard'] {
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

  if (/salad|veggie|vegetable|fruit|apple|berry|cucumber|soup|আপেল|কলা|কমলা|আম|তরমুজ|শাক|সবজি/.test(lower)) {
    baseCal = 85; baseProt = 2.5; baseCarbs = 16; baseFat = 1.5;
  } else if (/chicken|turkey|breast|tuna|fish|shrimp|prawn|egg|protein|মুরগি|ডিম|মাছ|চিংড়ি/.test(lower)) {
    baseCal = 180; baseProt = 28; baseCarbs = 2; baseFat = 6;
  } else if (/beef|steak|pork|mutton|lamb|burger|meatball|গরু|খাসি|মাংস/.test(lower)) {
    baseCal = 280; baseProt = 25; baseCarbs = 2; baseFat = 18;
  } else if (/rice|pasta|bread|roti|noodle|spaghetti|oat|grain|corn|biryani|ভাত|রুটি|পরোটা|বিরিয়ানি|ডাল|নুডুলস/.test(lower)) {
    baseCal = 240; baseProt = 6; baseCarbs = 48; baseFat = 3;
  } else if (/pizza|fries|fried|burger|shawarma|taco|burrito|samosa|cheeseburger|সিঙ্গাড়া|সমুচা|শাওয়ারমা|বার্গার|পিজ্জা/.test(lower)) {
    baseCal = 350; baseProt = 14; baseCarbs = 38; baseFat = 16;
  } else if (/cake|donut|ice cream|chocolate|cookie|dessert|candy|sweet|কেক|চকলেট|আইসক্রিম|মিষ্টি/.test(lower)) {
    baseCal = 320; baseProt = 4; baseCarbs = 45; baseFat = 14;
  } else if (/shake|smoothie|juice|latte|milk|soda|দুধ|চা|কফি|জুস|সোডা/.test(lower)) {
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
 * Search the food database or estimate unlisted items dynamically
 */
export function searchFoodDatabase(query: string): Array<{
  name: string;
  bengaliName?: string;
  defaultPortion: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}> {
  const trimmed = query.toLowerCase().trim();
  if (!trimmed) {
    // Return top popular items by default
    return FOOD_DATABASE.map((item) => ({
      name: item.name,
      bengaliName: item.bengaliName,
      defaultPortion: item.defaultPortion,
      calories: item.caloriesPerUnit,
      protein: item.proteinPerUnit,
      carbs: item.carbsPerUnit,
      fats: item.fatsPerUnit,
    }));
  }

  // 1. Filter matching database items by English name, Bengali name, or keywords
  const matches = FOOD_DATABASE.filter((item) =>
    item.name.toLowerCase().includes(trimmed) ||
    (item.bengaliName && item.bengaliName.toLowerCase().includes(trimmed)) ||
    item.keywords.some((kw) => kw.toLowerCase().includes(trimmed) || trimmed.includes(kw.toLowerCase()))
  ).map((item) => ({
    name: item.name,
    bengaliName: item.bengaliName,
    defaultPortion: item.defaultPortion,
    calories: item.caloriesPerUnit,
    protein: item.proteinPerUnit,
    carbs: item.carbsPerUnit,
    fats: item.fatsPerUnit,
  }));

  // 2. If no direct match, add dynamic AI estimated food item
  if (matches.length === 0) {
    const estimated = estimateDynamicFoodCalories(query);
    if (estimated) {
      matches.push({
        name: estimated.foodName,
        bengaliName: estimated.foodName,
        defaultPortion: estimated.portion,
        calories: estimated.calories,
        protein: estimated.protein,
        carbs: estimated.carbs,
        fats: estimated.fats,
      });
    }
  }

  return matches;
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

/**
 * AI Activity Calorie Burn Estimator based on Clinical MET (Metabolic Equivalent of Task) values
 */
export function calculateAIActivityBurn(
  type: string,
  durationMinutes: number,
  weightKg: number = 70
): number {
  if (durationMinutes <= 0) return 0;

  // Clinical MET values
  let met = 6.0;
  const t = type.toLowerCase();

  if (t.includes('run') || t.includes('running')) {
    met = 9.8;
  } else if (t.includes('swim') || t.includes('swimming')) {
    met = 8.0;
  } else if (t.includes('cycle') || t.includes('cycling') || t.includes('bike')) {
    met = 7.5;
  } else if (t.includes('workout') || t.includes('gym') || t.includes('strength')) {
    met = 6.0;
  } else if (t.includes('walk') || t.includes('walking')) {
    met = 3.8;
  } else if (t.includes('yoga') || t.includes('stretch')) {
    met = 3.0;
  }

  // Formula: Calories = MET * 3.5 * weightKg / 200 * durationMinutes
  const burned = Math.round(met * 3.5 * (weightKg / 200) * durationMinutes);
  return Math.max(10, burned);
}

