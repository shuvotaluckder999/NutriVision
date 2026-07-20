import * as SecureStore from 'expo-secure-store';

/**
 * A secure key-value storage helper that behaves like localStorage
 * but encrypts the stored values on the device keychain/keystore.
 */
export const LocalStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`LocalStorage Error writing key "${key}":`, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`LocalStorage Error reading key "${key}":`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`LocalStorage Error deleting key "${key}":`, error);
    }
  },
};
