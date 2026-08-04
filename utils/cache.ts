import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface TokenCache {
  getToken: (key: string) => Promise<string | null>;
  saveToken: (key: string, value: string) => Promise<void>;
  clearToken?: (key: string) => Promise<void>;
}

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      }
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      console.error('SecureStore get item error: ', error);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('SecureStore save item error: ', err);
    }
  },
  async clearToken(key: string) {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
        return;
      }
      return await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.error('SecureStore clear item error: ', err);
    }
  },
};
