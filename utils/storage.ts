import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feeding, Settings, ActiveSession } from '@/types/feeding';

const FEEDINGS_KEY = '@baby_feedings';
const SETTINGS_KEY = '@baby_settings';
const ACTIVE_SESSION_KEY = '@active_session';
const LAST_SIDE_KEY = '@last_side';

export const defaultSettings: Settings = {
  intervalMinutes: 120,
  nightNotificationsEnabled: true,
  babyName: 'Baby',
  babyBirthDate: new Date().toISOString(),
};

export const storageService = {
  async getFeedings(): Promise<Feeding[]> {
    try {
      const data = await AsyncStorage.getItem(FEEDINGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading feedings:', error);
      return [];
    }
  },

  async saveFeeding(feeding: Feeding): Promise<void> {
    try {
      const feedings = await this.getFeedings();
      feedings.unshift(feeding);
      await AsyncStorage.setItem(FEEDINGS_KEY, JSON.stringify(feedings));
    } catch (error) {
      console.error('Error saving feeding:', error);
    }
  },

  // ✅ Réécrit toute la liste
  async saveFeedings(feedings: Feeding[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FEEDINGS_KEY, JSON.stringify(feedings));
    } catch (error) {
      console.error('Error saving feedings list:', error);
    }
  },

  async getSettings(): Promise<Settings> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      return data ? JSON.parse(data) : defaultSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return defaultSettings;
    }
  },

  async saveSettings(settings: Settings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  async getActiveSession(): Promise<ActiveSession | null> {
    try {
      const data = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading active session:', error);
      return null;
    }
  },

  async saveActiveSession(session: ActiveSession | null): Promise<void> {
    try {
      if (!session) {
        await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
      } else {
        await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      }
    } catch (error) {
      console.error('Error saving active session:', error);
    }
  },

  async getLastSide(): Promise<'left' | 'right'> {
    try {
      const data = await AsyncStorage.getItem(LAST_SIDE_KEY);
      return (data as 'left' | 'right') || 'right';
    } catch (error) {
      console.error('Error loading last side:', error);
      return 'right';
    }
  },

  async saveLastSide(side: 'left' | 'right'): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SIDE_KEY, side);
    } catch (error) {
      console.error('Error saving last side:', error);
    }
  },

  // ✅ SUPPRIMER une tétée
  async deleteFeeding(id: string): Promise<Feeding[]> {
    const feedings = await this.getFeedings();
    const updated = feedings.filter(f => f.id !== id);
    await this.saveFeedings(updated);
    return updated;
  },

  // ✅ METTRE À JOUR une tétée
  async updateFeeding(updatedFeeding: Feeding): Promise<Feeding[]> {
    const feedings = await this.getFeedings();
    const updated = feedings.map(f => (f.id === updatedFeeding.id ? updatedFeeding : f));
    await this.saveFeedings(updated);
    return updated;
  },
};
