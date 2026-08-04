import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
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

export const ActivityStorage = {
  /**
   * Get storage key for user activities cache
   */
  getKey(userId: string): string {
    return `${ACTIVITIES_KEY_PREFIX}${userId}`;
  },

  /**
   * Get user activities from local storage first, then fallback/sync with Firestore
   */
  async getUserActivities(userId: string): Promise<UserActivity[]> {
    if (!userId) return [];

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

    // 2. Fetch from Firestore (users/{userId}/activities)
    try {
      const activitiesRef = collection(db, 'users', userId, 'activities');
      const q = query(activitiesRef, orderBy('createdAt', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);

      const firestoreActivities: UserActivity[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        firestoreActivities.push({
          id: docSnap.id,
          title: data.title || 'Workout Activity',
          type: data.type || 'workout',
          caloriesBurned: Number(data.caloriesBurned) || 0,
          durationMinutes: Number(data.durationMinutes) || 0,
          timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });

      // Update local cache with Firestore data if retrieved
      if (firestoreActivities.length > 0 || querySnapshot.empty) {
        await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(firestoreActivities));
        return firestoreActivities;
      }
    } catch (fsErr) {
      console.warn('Error fetching activities from Firestore (using local cache):', fsErr);
    }

    return cachedActivities;
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
    } catch (err) {
      console.error('Error updating local activity cache:', err);
    }

    return createdActivity;
  },

  /**
   * Delete an activity by ID from Firestore and local cache
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

    // 2. Remove from local cache
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
};
