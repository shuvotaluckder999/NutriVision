import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface LoggedMeal {
  id: string;
  foodName: string;
  portion: string;
  weightGrams?: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | string;
  timestamp: string;
  createdAt: string;
}

export interface AccumulatedConsumed {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const MEALS_KEY_PREFIX = '@nutrivision_meals_';
const ACCUMULATED_KEY_PREFIX = '@nutrivision_accumulated_consumed_';
const LAST_MEAL_DATE_KEY_PREFIX = '@nutrivision_last_meal_date_';

export const MealStorage = {
  /**
   * Helper to get today's YYYY-MM-DD date string
   */
  getTodayDateStr(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Storage key for local AsyncStorage cache per user
   */
  getKey(userId: string): string {
    return `${MEALS_KEY_PREFIX}${userId}`;
  },

  /**
   * Get accumulated consumed key for user (date-specific)
   */
  getAccumulatedKey(userId: string, dateStr?: string): string {
    const date = dateStr || this.getTodayDateStr();
    return `${ACCUMULATED_KEY_PREFIX}${userId}_${date}`;
  },

  /**
   * Check if today is a new day and reset daily progress if date changed
   */
  async checkAndResetDaily(userId: string): Promise<boolean> {
    if (!userId) return false;
    const today = this.getTodayDateStr();
    const lastDateKey = `${LAST_MEAL_DATE_KEY_PREFIX}${userId}`;
    try {
      const lastDate = await AsyncStorage.getItem(lastDateKey);
      if (lastDate !== today) {
        // New day detected! Update last date
        await AsyncStorage.setItem(lastDateKey, today);
        return true;
      }
    } catch (err) {
      console.warn('Error checking last meal date:', err);
    }
    return false;
  },

  /**
   * Retrieve meals logged by user today.
   * Checks AsyncStorage cache first for speed, then syncs with Firebase Firestore.
   * Filters by today's date so previous days' meals don't bleed into today's list.
   */
  async getUserMeals(userId: string): Promise<LoggedMeal[]> {
    if (!userId) return [];

    const todayStr = this.getTodayDateStr();
    let cachedMeals: LoggedMeal[] = [];

    // 1. Check local AsyncStorage cache
    try {
      const localData = await AsyncStorage.getItem(this.getKey(userId));
      if (localData) {
        cachedMeals = JSON.parse(localData);
      }
    } catch (err) {
      console.warn('Error reading local meals cache:', err);
    }

    // Filter today's meals from cache
    const todayCachedMeals = cachedMeals.filter((meal) => {
      if (!meal.createdAt) return true;
      return meal.createdAt.substring(0, 10) === todayStr;
    });

    // 2. Fetch from Firestore (users/{userId}/meals)
    try {
      const mealsRef = collection(db, 'users', userId, 'meals');
      const q = query(mealsRef, orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);

      const firestoreMeals: LoggedMeal[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt || new Date().toISOString();
        // Only include today's meals for the daily tracker list
        if (createdAt.substring(0, 10) === todayStr) {
          firestoreMeals.push({
            id: docSnap.id,
            foodName: data.foodName || 'Food Item',
            portion: data.portion || '1 serving',
            weightGrams: Number(data.weightGrams) || 100,
            calories: Number(data.calories) || 0,
            protein: Number(data.protein) || 0,
            carbs: Number(data.carbs) || 0,
            fats: Number(data.fats) || 0,
            mealType: data.mealType || 'snack',
            timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt,
          });
        }
      });

      if (firestoreMeals.length > 0 || querySnapshot.empty) {
        await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(firestoreMeals));
        return firestoreMeals;
      }
    } catch (fsErr) {
      console.warn('Error fetching meals from Firestore (using local cache):', fsErr);
    }

    return todayCachedMeals;
  },

  /**
   * Log a new meal to Firestore and update local storage cache
   */
  async addMeal(
    userId: string,
    mealData: Omit<LoggedMeal, 'id' | 'createdAt'>
  ): Promise<LoggedMeal> {
    const createdAt = new Date().toISOString();
    const timestamp = mealData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMealPayload = {
      foodName: mealData.foodName,
      portion: mealData.portion,
      weightGrams: Number(mealData.weightGrams) || 100,
      calories: Math.round(Number(mealData.calories) || 0),
      protein: parseFloat((Number(mealData.protein) || 0).toFixed(1)),
      carbs: parseFloat((Number(mealData.carbs) || 0).toFixed(1)),
      fats: parseFloat((Number(mealData.fats) || 0).toFixed(1)),
      mealType: mealData.mealType || 'snack',
      timestamp,
      createdAt,
    };

    let generatedId = `local_${Date.now()}`;

    // Save to Firestore
    try {
      const mealsRef = collection(db, 'users', userId, 'meals');
      const docRef = await addDoc(mealsRef, newMealPayload);
      generatedId = docRef.id;
      console.log('Successfully saved meal to Firestore with ID:', docRef.id);
    } catch (fsErr) {
      console.error('Error saving meal to Firestore:', fsErr);
    }

    const createdMeal: LoggedMeal = {
      id: generatedId,
      ...newMealPayload,
    };

    // Update local cache
    try {
      const currentMeals = await this.getUserMeals(userId);
      const updatedList = [createdMeal, ...currentMeals.filter((m) => m.id !== generatedId)];
      await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(updatedList));

      // Auto-accumulate consumed calories & macros for today
      await this.addAccumulatedConsumed(userId, {
        calories: createdMeal.calories,
        protein: createdMeal.protein,
        carbs: createdMeal.carbs,
        fats: createdMeal.fats,
      });
    } catch (err) {
      console.error('Error updating local meal cache:', err);
    }

    return createdMeal;
  },

  /**
   * Get accumulated consumed calories & macros for today
   */
  async getAccumulatedConsumed(userId: string, dateStr?: string): Promise<AccumulatedConsumed> {
    if (!userId) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    await this.checkAndResetDaily(userId);
    try {
      const key = this.getAccumulatedKey(userId, dateStr);
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      console.warn('Error reading accumulated consumed data:', err);
    }
    return { calories: 0, protein: 0, carbs: 0, fats: 0 };
  },

  /**
   * Add calories & macros to accumulated total for today
   */
  async addAccumulatedConsumed(
    userId: string,
    added: { calories: number; protein: number; carbs: number; fats: number },
    dateStr?: string
  ): Promise<AccumulatedConsumed> {
    const current = await this.getAccumulatedConsumed(userId, dateStr);
    const updated: AccumulatedConsumed = {
      calories: Math.round(current.calories + (added.calories || 0)),
      protein: parseFloat((current.protein + (added.protein || 0)).toFixed(1)),
      carbs: parseFloat((current.carbs + (added.carbs || 0)).toFixed(1)),
      fats: parseFloat((current.fats + (added.fats || 0)).toFixed(1)),
    };
    try {
      const key = this.getAccumulatedKey(userId, dateStr);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving accumulated consumed data:', err);
    }
    return updated;
  },

  /**
   * Delete a meal by ID from Firestore and local cache.
   */
  async deleteMeal(userId: string, mealId: string): Promise<boolean> {
    if (!userId || !mealId) return false;

    // 1. Delete from Firestore
    try {
      const docRef = doc(db, 'users', userId, 'meals', mealId);
      await deleteDoc(docRef);
      console.log('Deleted meal from Firestore list view:', mealId);
    } catch (fsErr) {
      console.warn('Error deleting meal from Firestore:', fsErr);
    }

    // 2. Remove from local list cache
    try {
      const localData = await AsyncStorage.getItem(this.getKey(userId));
      if (localData) {
        const list: LoggedMeal[] = JSON.parse(localData);
        const filtered = list.filter((item) => item.id !== mealId);
        await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(filtered));
      }
      return true;
    } catch (err) {
      console.error('Error updating local cache after meal deletion:', err);
      return false;
    }
  },

  /**
   * Clear today's meals cache and reset accumulated tracking to 0
   */
  async clearTodayMeals(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      await AsyncStorage.removeItem(this.getKey(userId));
      await AsyncStorage.removeItem(this.getAccumulatedKey(userId));
      return true;
    } catch (err) {
      console.error('Error clearing today meals cache:', err);
      return false;
    }
  },
};

