import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

export interface NotificationSettings {
  calorieTargetReminders: boolean;
  calorieExcessAlerts: boolean;
  hydrationReminders: boolean;
  workoutLogAlerts: boolean;
}

const NOTIFICATION_SETTINGS_KEY = '@nutrivision_notification_settings';

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
   * Check calorie intake and issue excess or deficit alerts
   */
  async checkCalorieNotification(consumedCalories: number, targetCalories: number) {
    const settings = await this.getSettings();
    if (!settings.calorieExcessAlerts && !settings.calorieTargetReminders) return;

    if (settings.calorieExcessAlerts && consumedCalories > targetCalories) {
      const excess = consumedCalories - targetCalories;
      console.log(`Calorie Warning: Consumed ${consumedCalories} kcal (Exceeded target by ${excess} kcal)`);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('⚠️ Calorie Warning - NutriVision', {
            body: `You have exceeded your daily calorie target by ${excess} kcal!`,
          });
        }
      }
    } else if (settings.calorieTargetReminders && consumedCalories < targetCalories * 0.5) {
      const currentHour = new Date().getHours();
      if (currentHour >= 19) {
        console.log(`Calorie Reminder: Consumed ${consumedCalories} kcal of ${targetCalories} kcal`);
      }
    }
  },
};
