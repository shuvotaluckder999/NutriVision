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
  }
};
