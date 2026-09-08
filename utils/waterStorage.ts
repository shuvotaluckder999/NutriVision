import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const WATER_LOG_KEY_PREFIX = '@nutrivision_water_log_';

export const WaterStorage = {
  /**
   * Get today's date string YYYY-MM-DD
   */
  getTodayDateStr(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  },

  /**
   * Get key for user's daily water intake
   */
  getKey(userId: string, dateStr?: string): string {
    const date = dateStr || this.getTodayDateStr();
    return `${WATER_LOG_KEY_PREFIX}${userId}_${date}`;
  },

  /**
   * Get water consumed today in Liters
   */
  async getLoggedWater(userId: string, dateStr?: string): Promise<number> {
    if (!userId) return 0;
    const date = dateStr || this.getTodayDateStr();
    const key = this.getKey(userId, date);

    // 1. Check local AsyncStorage
    try {
      const localData = await AsyncStorage.getItem(key);
      if (localData !== null) {
        return Number(JSON.parse(localData)) || 0;
      }
    } catch (err) {
      console.warn('Error reading local water log:', err);
    }

    // 2. Fallback check from Firestore
    try {
      const docRef = doc(db, 'users', userId, 'waterLogs', date);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const val = Number(snap.data()?.waterLiters) || 0;
        await AsyncStorage.setItem(key, JSON.stringify(val));
        return val;
      }
    } catch (fsErr) {
      console.warn('Error fetching water log from Firestore:', fsErr);
    }

    return 0;
  },

  /**
   * Add water intake in Liters to today's log
   */
  async addWaterLog(userId: string, litersToAdd: number): Promise<number> {
    if (!userId || litersToAdd <= 0) return await this.getLoggedWater(userId);

    const current = await this.getLoggedWater(userId);
    const updated = parseFloat((current + litersToAdd).toFixed(2));
    await this.setWaterLog(userId, updated);
    return updated;
  },

  /**
   * Set total water intake in Liters for today
   */
  async setWaterLog(userId: string, totalLiters: number, dateStr?: string): Promise<number> {
    if (!userId) return 0;
    const date = dateStr || this.getTodayDateStr();
    const key = this.getKey(userId, date);
    const sanitized = Math.max(0, parseFloat(totalLiters.toFixed(2)));

    // 1. Save to AsyncStorage
    try {
      await AsyncStorage.setItem(key, JSON.stringify(sanitized));
    } catch (err) {
      console.error('Error saving local water log:', err);
    }

    // 2. Sync to Firestore (users/{userId}/waterLogs/{dateStr})
    try {
      const docRef = doc(db, 'users', userId, 'waterLogs', date);
      await setDoc(
        docRef,
        {
          waterLiters: sanitized,
          waterGlasses: Math.round(sanitized * 4),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Error syncing water log to Firestore:', fsErr);
    }

    return sanitized;
  },

  /**
   * Reset today's logged water intake to 0
   */
  async resetWaterLog(userId: string): Promise<number> {
    return this.setWaterLog(userId, 0);
  },
};
