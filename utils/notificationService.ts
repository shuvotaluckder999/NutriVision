import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface NotificationSettings {
  calorieTargetReminders: boolean;
  calorieExcessAlerts: boolean;
  hydrationReminders: boolean;
  workoutLogAlerts: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'warning' | 'alert' | 'info' | 'success' | 'hydration' | 'workout';
  timestamp: string;
  read: boolean;
  actionType?: 'log_meal' | 'log_workout' | 'log_water';
  actionLabel?: string;
}

const NOTIFICATION_SETTINGS_KEY = '@nutrivision_notification_settings';
const NOTIFICATIONS_LIST_KEY = '@nutrivision_app_notifications_';

export const NotificationService = {
  /**
   * Default notification preferences
   */
  getDefaultSettings(): NotificationSettings {
    return {
      calorieTargetReminders: true,
      calorieExcessAlerts: true,
      hydrationReminders: true,
      workoutLogAlerts: true,
    };
  },

  /**
   * Load stored notification preferences
   */
  async getSettings(): Promise<NotificationSettings> {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (data) {
        return { ...this.getDefaultSettings(), ...JSON.parse(data) };
      }
    } catch (err) {
      console.warn('Error reading notification settings:', err);
    }
    return this.getDefaultSettings();
  },

  /**
   * Save updated notification preferences
   */
  async saveSettings(settings: NotificationSettings): Promise<boolean> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (err) {
      console.error('Error saving notification settings:', err);
      return false;
    }
  },

  /**
   * Get stored notifications list for user
   */
  async getStoredNotifications(userId: string): Promise<AppNotification[]> {
    if (!userId) return [];
    try {
      const key = `${NOTIFICATIONS_LIST_KEY}${userId}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      console.warn('Error reading notifications list:', err);
    }
    return [];
  },

  /**
   * Save notifications list for user
   */
  async saveStoredNotifications(userId: string, notifications: AppNotification[]): Promise<boolean> {
    if (!userId) return false;
    try {
      const key = `${NOTIFICATIONS_LIST_KEY}${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(notifications));
      return true;
    } catch (err) {
      console.error('Error saving notifications list:', err);
      return false;
    }
  },

  /**
   * Generate smart, real-time contextual notifications based on user stats
   */
  async generateSmartNotifications(
    userId: string,
    stats: {
      consumedCalories: number;
      targetCalories: number;
      consumedProtein: number;
      targetProtein: number;
      loggedWater: number;
      targetWater: number;
      burnedCalories: number;
      mealsCount: number;
      activitiesCount: number;
    }
  ): Promise<AppNotification[]> {
    const settings = await this.getSettings();
    const existing = await this.getStoredNotifications(userId);
    const notificationsMap = new Map<string, AppNotification>();
    
    // Existing notifications to map by ID
    existing.forEach((n) => notificationsMap.set(n.id, n));

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Excess Calories Notification -> Recommend Workout!
    if (settings.calorieExcessAlerts && stats.consumedCalories > stats.targetCalories) {
      const excess = stats.consumedCalories - stats.targetCalories;
      const id = `excess_calories_${new Date().toISOString().split('T')[0]}`;
      const isRead = existing.find((n) => n.id === id)?.read || false;
      
      notificationsMap.set(id, {
        id,
        title: '🔥 Calorie Surplus Alert!',
        body: `You exceeded your daily calorie target by ${excess} kcal! Log a workout session (e.g. 30-min cardio) to burn off excess calories.`,
        type: 'alert',
        timestamp: timeStr,
        read: isRead,
        actionType: 'log_workout',
        actionLabel: 'Log Workout',
      });
    }

    // 2. Daily Calorie Target Incomplete Notification
    if (settings.calorieTargetReminders && stats.consumedCalories < stats.targetCalories) {
      const remaining = stats.targetCalories - stats.consumedCalories;
      const id = `incomplete_calories_${new Date().toISOString().split('T')[0]}`;
      const isRead = existing.find((n) => n.id === id)?.read || false;

      notificationsMap.set(id, {
        id,
        title: '⚠️ Daily Calorie Target Incomplete',
        body: `You have consumed ${stats.consumedCalories.toLocaleString()} of ${stats.targetCalories.toLocaleString()} kcal (${remaining.toLocaleString()} kcal remaining). Remember to log your meals!`,
        type: 'warning',
        timestamp: timeStr,
        read: isRead,
        actionType: 'log_meal',
        actionLabel: 'Log Meal',
      });
    }

    // 3. Hydration Reminder Notification
    if (settings.hydrationReminders && stats.loggedWater < stats.targetWater) {
      const remainingWater = parseFloat((stats.targetWater - stats.loggedWater).toFixed(1));
      const id = `hydration_${new Date().toISOString().split('T')[0]}`;
      const isRead = existing.find((n) => n.id === id)?.read || false;

      notificationsMap.set(id, {
        id,
        title: '💧 Hydration Reminder',
        body: `You've logged ${stats.loggedWater}L of your ${stats.targetWater}L daily water target (${remainingWater}L left). Drink up to maintain optimal metabolism!`,
        type: 'hydration',
        timestamp: timeStr,
        read: isRead,
        actionType: 'log_water',
        actionLabel: 'Log Water',
      });
    }

    // 4. Protein Deficit Warning
    if (stats.consumedProtein < stats.targetProtein * 0.75) {
      const neededProtein = Math.round(stats.targetProtein - stats.consumedProtein);
      const id = `protein_deficit_${new Date().toISOString().split('T')[0]}`;
      const isRead = existing.find((n) => n.id === id)?.read || false;

      notificationsMap.set(id, {
        id,
        title: '💪 Protein Target Reminder',
        body: `You are ${neededProtein}g away from your muscle protein target (${stats.consumedProtein}g / ${stats.targetProtein}g). Include lean protein in your next meal!`,
        type: 'info',
        timestamp: timeStr,
        read: isRead,
        actionType: 'log_meal',
        actionLabel: 'Log Meal',
      });
    }

    // 5. Workout Accomplishment Praise
    if (settings.workoutLogAlerts && stats.burnedCalories > 0) {
      const id = `workout_done_${new Date().toISOString().split('T')[0]}`;
      const isRead = existing.find((n) => n.id === id)?.read || false;

      notificationsMap.set(id, {
        id,
        title: '🎉 Active Workout Praise!',
        body: `Awesome effort! You burned ${stats.burnedCalories} kcal today across ${stats.activitiesCount} logged exercise activity session(s).`,
        type: 'success',
        timestamp: timeStr,
        read: isRead,
        actionType: 'log_workout',
        actionLabel: 'Log Activity',
      });
    }

    const updatedList = Array.from(notificationsMap.values());
    await this.saveStoredNotifications(userId, updatedList);
    return updatedList;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<AppNotification[]> {
    const list = await this.getStoredNotifications(userId);
    const updated = list.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
    await this.saveStoredNotifications(userId, updated);
    return updated;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<AppNotification[]> {
    const list = await this.getStoredNotifications(userId);
    const updated = list.map((n) => ({ ...n, read: true }));
    await this.saveStoredNotifications(userId, updated);
    return updated;
  },

  /**
   * Clear all notifications for user
   */
  async clearAllNotifications(userId: string): Promise<boolean> {
    return this.saveStoredNotifications(userId, []);
  },

  /**
   * Legacy browser notification check
   */
  async checkCalorieNotification(consumedCalories: number, targetCalories: number) {
    const settings = await this.getSettings();
    if (!settings.calorieExcessAlerts && !settings.calorieTargetReminders) return;

    if (settings.calorieExcessAlerts && consumedCalories > targetCalories) {
      const excess = consumedCalories - targetCalories;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('⚠️ Calorie Warning - NutriVision', {
            body: `You have exceeded your daily calorie target by ${excess} kcal! Log a workout to burn excess calories.`,
          });
        }
      }
    }
  },
};
