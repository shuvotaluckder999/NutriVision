import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

import { db } from '../config/firebase';

export interface UserActivity {
  id: string;
  title: string;
  type: 'workout' | 'running' | 'walking' | 'cycling' | 'swimming' | 'yoga' | string;
  caloriesBurned: number;
  durationMinutes: number;
  timestamp: string;
  createdAt: string;
}

const ACTIVITIES_KEY_PREFIX = '@nutrivision_activities_';
const ACCUMULATED_BURNED_KEY_PREFIX = '@nutrivision_accumulated_burned_';
const LAST_ACTIVITY_DATE_KEY_PREFIX = '@nutrivision_last_activity_date_';

export const ActivityStorage = {
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
   * Get storage key for user activities cache
   */
  getKey(userId: string): string {
    return `${ACTIVITIES_KEY_PREFIX}${userId}`;
  },

  /**
   * Get accumulated burned calories key for user (date-specific)
   */
  getAccumulatedBurnedKey(userId: string, dateStr?: string): string {
    const date = dateStr || this.getTodayDateStr();
    return `${ACCUMULATED_BURNED_KEY_PREFIX}${userId}_${date}`;
  },

  /**
   * Check if today is a new day and update last activity date
   */
  async checkAndResetDaily(userId: string): Promise<boolean> {
    if (!userId) return false;
    const today = this.getTodayDateStr();
    const lastDateKey = `${LAST_ACTIVITY_DATE_KEY_PREFIX}${userId}`;
    try {
      const lastDate = await AsyncStorage.getItem(lastDateKey);
      if (lastDate !== today) {
        await AsyncStorage.setItem(lastDateKey, today);
        return true;
      }
    } catch (err) {
      console.warn('Error checking last activity date:', err);
    }
    return false;
  },

  /**
   * Get total accumulated calories burned by user today
   */
  async getAccumulatedBurned(userId: string, dateStr?: string): Promise<number> {
    if (!userId) return 0;
    await this.checkAndResetDaily(userId);
    try {
      const key = this.getAccumulatedBurnedKey(userId, dateStr);
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return Number(JSON.parse(data)) || 0;
      }
    } catch (err) {
      console.warn('Error reading accumulated burned data:', err);
    }
    return 0;
  },

  /**
   * Add calories burned to accumulated total for today
   */
  async addAccumulatedBurned(userId: string, calories: number, dateStr?: string): Promise<number> {
    if (!userId || calories <= 0) return await this.getAccumulatedBurned(userId, dateStr);
    const current = await this.getAccumulatedBurned(userId, dateStr);
    const updated = Math.round(current + calories);
    try {
      const key = this.getAccumulatedBurnedKey(userId, dateStr);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving accumulated burned data:', err);
    }
    return updated;
  },

  /**
   * Get user activities from local storage first, then fallback/sync with Firestore.
   * Filters by today's date so previous days' activities don't bleed into today's list.
   */
  async getUserActivities(userId: string): Promise<UserActivity[]> {
    if (!userId) return [];

    const todayStr = this.getTodayDateStr();
    let cachedActivities: UserActivity[] = [];

    // 1. Try local AsyncStorage cache
    try {
      const localData = await AsyncStorage.getItem(this.getKey(userId));
      if (localData) {
        cachedActivities = JSON.parse(localData);
      }
    } catch (err) {
      console.warn('Error reading local activities cache:', err);
    }

    // Filter today's activities from cache
    const todayCachedActivities = cachedActivities.filter((activity) => {
      if (!activity.createdAt) return true;
      return activity.createdAt.substring(0, 10) === todayStr;
    });

    // 2. Fetch from Firestore (users/{userId}/activities)
    try {
      const activitiesRef = collection(db, 'users', userId, 'activities');
      const q = query(activitiesRef, orderBy('createdAt', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);

      const firestoreActivities: UserActivity[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt || new Date().toISOString();
        if (createdAt.substring(0, 10) === todayStr) {
          firestoreActivities.push({
            id: docSnap.id,
            title: data.title || 'Workout Activity',
            type: data.type || 'workout',
            caloriesBurned: Number(data.caloriesBurned) || 0,
            durationMinutes: Number(data.durationMinutes) || 0,
            timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt,
          });
        }
      });

      // Update local cache with Firestore data if retrieved
      if (firestoreActivities.length > 0 || querySnapshot.empty) {
        await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(firestoreActivities));
        return firestoreActivities;
      }
    } catch (fsErr) {
      console.warn('Error fetching activities from Firestore (using local cache):', fsErr);
    }

    return todayCachedActivities;
  },

  /**
   * Add a new activity to Firestore and update local storage
   */
  async addActivity(
    userId: string,
    activityData: Omit<UserActivity, 'id' | 'createdAt'>
  ): Promise<UserActivity> {
    const createdAt = new Date().toISOString();
    const timestamp = activityData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newActivityPayload = {
      title: activityData.title,
      type: activityData.type,
      caloriesBurned: Number(activityData.caloriesBurned),
      durationMinutes: Number(activityData.durationMinutes),
      timestamp,
      createdAt,
    };

    let generatedId = `local_${Date.now()}`;

    // Save to Firestore
    try {
      const activitiesRef = collection(db, 'users', userId, 'activities');
      const docRef = await addDoc(activitiesRef, newActivityPayload);
      generatedId = docRef.id;
      console.log('Successfully saved activity to Firestore with ID:', docRef.id);
    } catch (fsErr) {
      console.error('Error saving activity to Firestore:', fsErr);
    }

    const createdActivity: UserActivity = {
      id: generatedId,
      ...newActivityPayload,
    };

    // Update local cache
    try {
      const currentActivities = await this.getUserActivities(userId);
      const updatedList = [createdActivity, ...currentActivities.filter((a) => a.id !== generatedId)];
      await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(updatedList));

      // Auto-accumulate burned calories (never reduced on activity deletion from UI list)
      await this.addAccumulatedBurned(userId, createdActivity.caloriesBurned);
    } catch (err) {
      console.error('Error updating local activity cache:', err);
    }

    return createdActivity;
  },

  /**
   * Delete an activity by ID from Firestore and local cache.
   * NOTE: Per user requirements, deleting an activity item removes it from the UI list,
   * but DOES NOT reduce/decrement the Calories burned in the Calories & Macros Tracker.
   */
  async deleteActivity(userId: string, activityId: string): Promise<boolean> {
    if (!userId || !activityId) return false;

    // 1. Delete from Firestore
    try {
      const docRef = doc(db, 'users', userId, 'activities', activityId);
      await deleteDoc(docRef);
      console.log('Deleted activity from Firestore:', activityId);
    } catch (fsErr) {
      console.warn('Error deleting activity from Firestore:', fsErr);
    }

    // 2. Remove from local list cache (burned calories tracker remains unchanged)
    try {
      const localData = await AsyncStorage.getItem(this.getKey(userId));
      if (localData) {
        const list: UserActivity[] = JSON.parse(localData);
        const filtered = list.filter((item) => item.id !== activityId);
        await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(filtered));
      }
      return true;
    } catch (err) {
      console.error('Error updating local cache after activity deletion:', err);
      return false;
    }
  },

  /**
   * Update an existing activity by ID in Firestore and local cache
   */
  async updateActivity(
    userId: string,
    activityId: string,
    updatedFields: Partial<Omit<UserActivity, 'id' | 'createdAt'>>
  ): Promise<boolean> {
    if (!userId || !activityId) return false;

    // 1. Update in Firestore if not local ID
    if (!activityId.startsWith('local_')) {
      try {
        const docRef = doc(db, 'users', userId, 'activities', activityId);
        await updateDoc(docRef, updatedFields);
        console.log('Updated activity in Firestore:', activityId);
      } catch (fsErr) {
        console.warn('Error updating activity in Firestore:', fsErr);
      }
    }

    // 2. Update local cache
    try {
      const localData = await AsyncStorage.getItem(this.getKey(userId));
      if (localData) {
        const list: UserActivity[] = JSON.parse(localData);
        let calorieDiff = 0;
        const updatedList = list.map((item) => {
          if (item.id === activityId) {
            const oldCal = item.caloriesBurned || 0;
            const newCal = updatedFields.caloriesBurned !== undefined ? updatedFields.caloriesBurned : oldCal;
            if (newCal > oldCal) {
              calorieDiff = newCal - oldCal;
            }
            return { ...item, ...updatedFields };
          }
          return item;
        });
        await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(updatedList));

        if (calorieDiff > 0) {
          await this.addAccumulatedBurned(userId, calorieDiff);
        }
      }
      return true;
    } catch (err) {
      console.error('Error updating local activity cache after edit:', err);
      return false;
    }
  },
};


