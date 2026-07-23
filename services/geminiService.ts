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
