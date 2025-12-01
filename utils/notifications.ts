import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let countdownUpdateInterval: NodeJS.Timeout | null = null;

export const notificationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('feeding-reminders', {
          name: 'Feeding Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#A0D8B3',
          sound: 'default',
          enableVibrate: true,
        });

        await Notifications.setNotificationChannelAsync('feeding-countdown', {
          name: 'Feeding Countdown',
          importance: Notifications.AndroidImportance.LOW,
          sound: null,
          enableVibrate: false,
          showBadge: false,
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  },

  formatTimeRemaining(targetTime: Date): { timeText: string; timeAt: string } {
    const now = Date.now();
    const diff = targetTime.getTime() - now;

    if (diff <= 0) {
      return { timeText: 'Now', timeAt: formatTime(targetTime) };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let timeText = '';
    if (hours > 0) {
      timeText = `${hours}h ${minutes}m`;
    } else {
      timeText = `${minutes}m`;
    }

    return { timeText, timeAt: formatTime(targetTime) };
  },

  async showCountdownNotification(
    targetTime: Date,
    suggestedSide: 'left' | 'right' | 'bottle'
  ): Promise<void> {
    try {
      const { timeText, timeAt } = this.formatTimeRemaining(targetTime);
      const sideText = suggestedSide === 'bottle'
        ? 'Bottle'
        : `${suggestedSide.charAt(0).toUpperCase() + suggestedSide.slice(1)} breast`;

      const content: Notifications.NotificationContentInput = {
        title: 'Next Feeding',
        body: `Next feeding in ${timeText} (at ${timeAt}) - Suggested: ${sideText}`,
        sound: null,
        priority: Platform.OS === 'android' ? Notifications.AndroidNotificationPriority.LOW : undefined,
        sticky: Platform.OS === 'android' ? true : undefined,
        autoDismiss: false,
        data: { type: 'countdown' },
      };

      if (Platform.OS === 'android') {
        await Notifications.dismissNotificationAsync('countdown');
        await Notifications.presentNotificationAsync({
          identifier: 'countdown',
          content: {
            ...content,
            android: {
              channelId: 'feeding-countdown',
              priority: Notifications.AndroidNotificationPriority.LOW,
            },
          },
        } as any);
      } else {
        await Notifications.dismissNotificationAsync('countdown');
        await Notifications.presentNotificationAsync({
          identifier: 'countdown',
          content,
        } as any);
      }
    } catch (error) {
      console.error('Error showing countdown notification:', error);
    }
  },

  async startCountdownUpdates(
    targetTime: Date,
    suggestedSide: 'left' | 'right' | 'bottle'
  ): Promise<void> {
    this.stopCountdownUpdates();

    await this.showCountdownNotification(targetTime, suggestedSide);

    countdownUpdateInterval = setInterval(async () => {
      const now = Date.now();
      if (targetTime.getTime() <= now) {
        this.stopCountdownUpdates();
        await Notifications.dismissNotificationAsync('countdown');
        return;
      }

      await this.showCountdownNotification(targetTime, suggestedSide);
    }, 60000);
  },

  stopCountdownUpdates(): void {
    if (countdownUpdateInterval) {
      clearInterval(countdownUpdateInterval);
      countdownUpdateInterval = null;
    }
  },

  async scheduleFeeding(
    triggerTime: Date,
    suggestedSide: 'left' | 'right' | 'bottle'
  ): Promise<string | null> {
    try {
      await this.cancelAllNotifications();

      const now = new Date();
      const triggerSeconds = Math.floor((triggerTime.getTime() - now.getTime()) / 1000);

      if (triggerSeconds <= 0) {
        console.warn('Cannot schedule notification in the past');
        return null;
      }

      const sideText = suggestedSide === 'bottle'
        ? 'Next feeding now - Suggested side: Bottle'
        : `Next feeding now - Suggested side: ${suggestedSide.charAt(0).toUpperCase() + suggestedSide.slice(1)} breast`;

      const notificationContent: Notifications.NotificationContentInput = {
        title: 'Time to feed the baby',
        body: sideText,
        sound: 'default',
        priority: Platform.OS === 'android' ? Notifications.AndroidNotificationPriority.MAX : undefined,
        data: { type: 'feeding-alarm', screen: 'home' },
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: Platform.OS === 'android' ? {
          ...notificationContent,
          android: {
            channelId: 'feeding-reminders',
            priority: Notifications.AndroidNotificationPriority.MAX,
            sound: 'default',
          },
        } : notificationContent,
        trigger: {
          seconds: triggerSeconds,
        },
      });

      await this.startCountdownUpdates(triggerTime, suggestedSide);

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  },

  async cancelAllNotifications(): Promise<void> {
    try {
      this.stopCountdownUpdates();
      await Notifications.dismissNotificationAsync('countdown');
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
