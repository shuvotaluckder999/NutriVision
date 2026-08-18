import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

import { AINutritionPlan } from '../services/geminiService';

export interface UserOnboardingData {
  gender: 'male' | 'female' | 'other' | string;
  goal: 'gain' | 'lose' | 'maintain' | string;
  workoutDays: '2-3 days' | '3-7 Days' | '7-15 Days' | '1 month' | string;
  birthdate: {
    day: string;
    month: string;
    year: string;
  };
  height: {
    feet: string;
    inches: string;
  };
  weight: {
    kg: string;
  };
  onboardingCompleted: boolean;
  nutritionPlan?: AINutritionPlan;
  updatedAt: string;
}

const ONBOARDING_KEY_PREFIX = '@nutrivision_onboarding_';

export interface SaveResult {
  success: boolean;
  asyncStorageSaved: boolean;
  firestoreSaved: boolean;
}

export const OnboardingStorage = {
  /**
   * Get onboarding key for a given user ID
   */
  getKey(userId: string): string {
    return `${ONBOARDING_KEY_PREFIX}${userId}`;
  },

  /**
   * Save onboarding data & AI generated nutrition plan to AsyncStorage & Firestore
   */
  async saveOnboardingData(
    userId: string,
    data: Partial<UserOnboardingData>,
    nutritionPlan?: AINutritionPlan
  ): Promise<SaveResult> {
    const fullData: UserOnboardingData = {
      gender: data.gender || '',
      goal: data.goal || '',
      workoutDays: data.workoutDays || '',
      birthdate: data.birthdate || { day: '', month: '', year: '' },
      height: data.height || { feet: '5', inches: '9' },
      weight: data.weight || { kg: '70' },
      onboardingCompleted: true,
      nutritionPlan: nutritionPlan || data.nutritionPlan,
      updatedAt: new Date().toISOString(),
    };

    let asyncStorageSaved = false;
    let firestoreSaved = false;

    // 1. Save to AsyncStorage
    try {
      await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(fullData));
      asyncStorageSaved = true;
    } catch (e) {
      console.error('Error saving onboarding data to AsyncStorage:', e);
    }

    // 2. Sync to Firebase Firestore (Strictly for this user only)
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      const firestorePayload: any = {
        onboardingCompleted: true,
        gender: fullData.gender,
        goal: fullData.goal,
        workoutDays: fullData.workoutDays,
        birthdate: fullData.birthdate,
        height: fullData.height,
        weight: fullData.weight,
        updatedAt: fullData.updatedAt,
      };

      if (fullData.nutritionPlan) {
        firestorePayload.nutritionPlan = fullData.nutritionPlan;
      }

      if (userSnap.exists()) {
        await updateDoc(userRef, firestorePayload);
      } else {
        await setDoc(
          userRef,
          {
            uid: userId,
            ...firestorePayload,
            createdAt: fullData.updatedAt,
          },
          { merge: true }
        );
      }
      firestoreSaved = true;
      console.log('Successfully saved user profile & AI Nutrition Plan to Firestore for user:', userId);
    } catch (e) {
      console.error('Error syncing user profile & AI Nutrition Plan to Firestore:', e);
    }

    return {
      success: asyncStorageSaved && firestoreSaved,
      asyncStorageSaved,
      firestoreSaved,
    };
  },

  /**
   * Check if user completed onboarding (check local AsyncStorage first, fallback to Firestore)
   */
  async isOnboardingCompleted(userId: string): Promise<boolean> {
    if (!userId) return false;

    // Check local storage
    try {
      const localData = await AsyncStorage.getItem(this.getKey(userId));
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed?.onboardingCompleted) {
          return true;
        }
      }
    } catch (e) {
      console.error('Error reading onboarding data from AsyncStorage:', e);
    }

    // Fallback to Firestore check
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const firestoreData = userSnap.data();
        if (firestoreData?.onboardingCompleted) {
          // Cache locally for faster subsequent launches
          await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(firestoreData));
          return true;
        }
      }
    } catch (e) {
      console.error('Error checking onboarding status from Firestore:', e);
    }

    return false;
  },

  /**
   * Get user onboarding data
   */
  async getOnboardingData(userId: string): Promise<UserOnboardingData | null> {
    if (!userId) return null;

    try {
      const localData = await AsyncStorage.getItem(this.getKey(userId));
      if (localData) {
        return JSON.parse(localData);
      }
    } catch (e) {
      console.error('Error getting local onboarding data:', e);
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserOnboardingData;
        if (data?.onboardingCompleted) {
          return data;
        }
      }
    } catch (e) {
      console.error('Error getting Firestore onboarding data:', e);
    }

    return null;
  },

  /**
   * Update user target calorie goal in AsyncStorage and Firestore
   */
  async updateCalorieGoal(userId: string, newCalories: number): Promise<boolean> {
    return this.updateNutritionGoals(userId, { calories: newCalories });
  },

  /**
   * Update full or partial user nutrition targets (Calories, Protein, Carbs, Fats, Water) in AsyncStorage and Firestore
   */
  async updateNutritionGoals(
    userId: string,
    goals: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fats?: number;
      waterLiters?: number;
    }
  ): Promise<boolean> {
    if (!userId) return false;
    try {
      let data = await this.getOnboardingData(userId);
      if (!data) {
        data = {
          gender: 'other',
          goal: 'maintain',
          workoutDays: '3-7 Days',
          birthdate: { day: '1', month: '1', year: '2000' },
          height: { feet: '5', inches: '9' },
          weight: { kg: '70' },
          onboardingCompleted: true,
          updatedAt: new Date().toISOString(),
        };
      }

      const defaultCal = goals.calories || 2200;
      if (!data.nutritionPlan) {
        data.nutritionPlan = {
          calories: goals.calories || 2200,
          protein: goals.protein || Math.round((defaultCal * 0.25) / 4),
          carbs: goals.carbs || Math.round((defaultCal * 0.50) / 4),
          fats: goals.fats || Math.round((defaultCal * 0.25) / 9),
          waterLiters: goals.waterLiters || 3.0,
          waterGlasses: Math.round((goals.waterLiters || 3.0) * 4),
          bmi: 22.4,
          bmiCategory: 'Normal Weight',
          bmr: 1680,
          fitnessAdvice: 'Custom target goal updated by user',
          mealTips: [],
          workoutRecommendation: 'Balanced training',
          generatedAt: new Date().toISOString(),
        };
      } else {
        if (goals.calories !== undefined) data.nutritionPlan.calories = goals.calories;
        if (goals.protein !== undefined) data.nutritionPlan.protein = goals.protein;
        if (goals.carbs !== undefined) data.nutritionPlan.carbs = goals.carbs;
        if (goals.fats !== undefined) data.nutritionPlan.fats = goals.fats;
        if (goals.waterLiters !== undefined) {
          data.nutritionPlan.waterLiters = goals.waterLiters;
          data.nutritionPlan.waterGlasses = Math.round(goals.waterLiters * 4);
        }
      }
      data.updatedAt = new Date().toISOString();

      // Save locally
      await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(data));

      // Sync to Firestore
      try {
        const userRef = doc(db, 'users', userId);
        const firestoreUpdates: Record<string, any> = {
          updatedAt: data.updatedAt,
        };
        if (goals.calories !== undefined) firestoreUpdates['nutritionPlan.calories'] = goals.calories;
        if (goals.protein !== undefined) firestoreUpdates['nutritionPlan.protein'] = goals.protein;
        if (goals.carbs !== undefined) firestoreUpdates['nutritionPlan.carbs'] = goals.carbs;
        if (goals.fats !== undefined) firestoreUpdates['nutritionPlan.fats'] = goals.fats;
        if (goals.waterLiters !== undefined) {
          firestoreUpdates['nutritionPlan.waterLiters'] = goals.waterLiters;
          firestoreUpdates['nutritionPlan.waterGlasses'] = Math.round(goals.waterLiters * 4);
        }

        await updateDoc(userRef, firestoreUpdates);
      } catch (fsErr) {
        console.warn('Firestore nutrition goal update note:', fsErr);
      }

      return true;
    } catch (e) {
      console.error('Error in updateNutritionGoals:', e);
      return false;
    }
  },

  /**
   * Update full fitness profile parameters (Height, Weight, Goal, Gender, Workout Days, Birthdate)
   * and recalculate AI Nutrition Targets automatically.
   */
  async updateFitnessProfile(
    userId: string,
    profileData: {
      gender?: string;
      goal?: string;
      workoutDays?: string;
      birthdate?: { day: string; month: string; year: string };
      height?: { feet: string; inches: string };
      weight?: { kg: string };
    }
  ): Promise<UserOnboardingData | null> {
    if (!userId) return null;
    try {
      let current = await this.getOnboardingData(userId);
      if (!current) {
        current = {
          gender: profileData.gender || 'male',
          goal: profileData.goal || 'maintain',
          workoutDays: profileData.workoutDays || '3-7 Days',
          birthdate: profileData.birthdate || { day: '15', month: '06', year: '1998' },
          height: profileData.height || { feet: '5', inches: '9' },
          weight: profileData.weight || { kg: '70' },
          onboardingCompleted: true,
          updatedAt: new Date().toISOString(),
        };
      } else {
        if (profileData.gender) current.gender = profileData.gender;
        if (profileData.goal) current.goal = profileData.goal;
        if (profileData.workoutDays) current.workoutDays = profileData.workoutDays;
        if (profileData.birthdate) current.birthdate = profileData.birthdate;
        if (profileData.height) current.height = profileData.height;
        if (profileData.weight) current.weight = profileData.weight;
        current.updatedAt = new Date().toISOString();
      }

      // Import calculateFallbackMetrics dynamically or use metabolic math
      const selections = {
        gender: current.gender,
        goal: current.goal,
        workoutDays: current.workoutDays,
        birthdate: current.birthdate,
        height: current.height,
        weight: current.weight,
      };

      const { calculateFallbackMetrics } = require('../services/geminiService');
      const recalculatedPlan = calculateFallbackMetrics(selections);
      current.nutritionPlan = recalculatedPlan;

      // Save locally
      await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(current));

      // Sync to Firestore
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          gender: current.gender,
          goal: current.goal,
          workoutDays: current.workoutDays,
          birthdate: current.birthdate,
          height: current.height,
          weight: current.weight,
          nutritionPlan: current.nutritionPlan,
          updatedAt: current.updatedAt,
        });
      } catch (fsErr) {
        console.warn('Firestore update fitness profile sync note:', fsErr);
      }

      return current;
    } catch (err) {
      console.error('Error updating fitness profile:', err);
      return null;
    }
  },
};
