import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Feeding, Settings, ActiveSession } from '@/types/feeding';
import { storageService, defaultSettings } from '@/utils/storage';
import {
  calculateNextFeedingTime,
  getNextSuggestedSide,
  adjustForNightMode,
} from '@/utils/calculations';
import { notificationService } from '@/utils/notifications';

interface FeedingContextType {
  feedings: Feeding[];
  settings: Settings;
  activeSession: ActiveSession | null;
  lastSide: 'left' | 'right';
  nextFeedingTime: Date | null;
  isLoading: boolean;
  startFeeding: (type: 'left' | 'right' | 'bottle') => Promise<void>;
  stopFeeding: (quantityMl?: number) => Promise<void>;
  updateSettings: (newSettings: Settings) => Promise<void>;
  refreshData: () => Promise<void>;
  deleteFeeding: (id: string) => Promise<void>;
  updateFeeding: (feeding: Feeding) => Promise<void>;
}

const FeedingContext = createContext<FeedingContextType | undefined>(undefined);

export function FeedingProvider({ children }: { children: React.ReactNode }) {
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [lastSide, setLastSide] = useState<'left' | 'right'>('right');
  const [nextFeedingTime, setNextFeedingTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [loadedFeedings, loadedSettings, loadedSession, loadedLastSide] = await Promise.all([
        storageService.getFeedings(),
        storageService.getSettings(),
        storageService.getActiveSession(),
        storageService.getLastSide(),
      ]);

      setFeedings(loadedFeedings);
      setSettings(loadedSettings);
      setActiveSession(loadedSession);
      setLastSide(loadedLastSide);

      // ⏱️ Recalcule prochaine tétée à partir de l’HEURE DE DÉBUT
      if (loadedFeedings.length > 0 && !loadedSession) {
        const lastFeeding = loadedFeedings[0];
        const baseTime = lastFeeding.startTime || lastFeeding.endTime;
        const nextTime = calculateNextFeedingTime(baseTime, loadedSettings.intervalMinutes);
        setNextFeedingTime(nextTime);

        const adjustedTime = adjustForNightMode(nextTime, loadedSettings.nightNotificationsEnabled);
        if (adjustedTime.getTime() > Date.now()) {
          const suggestedSide = getNextSuggestedSide(loadedLastSide);
          await notificationService.startCountdownUpdates(adjustedTime, suggestedSide);
        }
      }

      await notificationService.requestPermissions();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startFeeding = async (type: 'left' | 'right' | 'bottle') => {
    const session: ActiveSession = {
      type,
      startTime: new Date().toISOString(),
    };

    setActiveSession(session);
    await storageService.saveActiveSession(session);

    if (type === 'left' || type === 'right') {
      setLastSide(type);
      await storageService.saveLastSide(type);
    }

    await notificationService.cancelAllNotifications();
  };

  const stopFeeding = async (quantityMl?: number) => {
    if (!activeSession) return;

    const endTime = new Date().toISOString();
    const startTimeMs = new Date(activeSession.startTime).getTime();
    const endTimeMs = new Date(endTime).getTime();
    const durationMinutes = Math.round((endTimeMs - startTimeMs) / (1000 * 60));

    const feeding: Feeding = {
      id: Date.now().toString(),
      type: activeSession.type,
      startTime: activeSession.startTime,
      endTime,
      durationMinutes,
      quantityMl,
    };

    await storageService.saveFeeding(feeding);
    setFeedings(prev => [feeding, ...prev]);

    setActiveSession(null);
    await storageService.saveActiveSession(null);

    // ✅ Prochaine tétée calculée depuis l’heure de DÉBUT
    const nextTime = calculateNextFeedingTime(activeSession.startTime, settings.intervalMinutes);
    setNextFeedingTime(nextTime);

    const adjustedTime = adjustForNightMode(nextTime, settings.nightNotificationsEnabled);
    const suggestedSide = getNextSuggestedSide(lastSide);
    await notificationService.scheduleFeeding(adjustedTime, suggestedSide);
  };

  const updateSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await storageService.saveSettings(newSettings);

    if (feedings.length > 0 && !activeSession) {
      const lastFeeding = feedings[0];
      const baseTime = lastFeeding.startTime || lastFeeding.endTime;
      const nextTime = calculateNextFeedingTime(baseTime, newSettings.intervalMinutes);
      setNextFeedingTime(nextTime);

      const adjustedTime = adjustForNightMode(nextTime, newSettings.nightNotificationsEnabled);
      const suggestedSide = getNextSuggestedSide(lastSide);
      await notificationService.scheduleFeeding(adjustedTime, suggestedSide);
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  const deleteFeeding = async (id: string) => {
    const updated = await storageService.deleteFeeding(id);
    setFeedings(updated);
  };

  const updateFeeding = async (feeding: Feeding) => {
    const updated = await storageService.updateFeeding(feeding);
    setFeedings(updated);
  };

  return (
    <FeedingContext.Provider
      value={{
        feedings,
        settings,
        activeSession,
        lastSide,
        nextFeedingTime,
        isLoading,
        startFeeding,
        stopFeeding,
        updateSettings,
        refreshData,
        deleteFeeding,
        updateFeeding,
      }}
    >
      {children}
    </FeedingContext.Provider>
  );
}

export function useFeeding() {
  const ctx = useContext(FeedingContext);
  if (!ctx) throw new Error('useFeeding must be used within FeedingProvider');
  return ctx;
}
