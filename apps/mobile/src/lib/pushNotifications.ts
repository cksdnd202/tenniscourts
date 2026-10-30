import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

async function prepareAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: '예약 오픈 알림',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6FCF97',
  });
}

export async function getNotificationPermissions() {
  if (Platform.OS === 'web') return null;
  return Notifications.getPermissionsAsync();
}

export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') {
    throw new Error('알림 테스트는 실제 Android 또는 iPhone에서 진행해 주세요.');
  }
  if (!Device.isDevice) {
    throw new Error('알림 테스트는 실제 휴대폰에서 진행해 주세요.');
  }

  await prepareAndroidNotificationChannel();
  const currentPermissions = await Notifications.getPermissionsAsync();
  if (currentPermissions.granted || !currentPermissions.canAskAgain) return currentPermissions;
  return Notifications.requestPermissionsAsync();
}

export async function registerForPushNotifications() {
  if (Platform.OS === 'web') {
    throw new Error('알림 테스트는 실제 Android 또는 iPhone에서 진행해 주세요.');
  }

  if (!Device.isDevice) {
    throw new Error('푸시 토큰 테스트는 실제 휴대폰에서 진행해 주세요.');
  }

  await prepareAndroidNotificationChannel();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error('Expo 프로젝트 연결이 필요합니다. EAS 초기 설정 후 다시 시도해 주세요.');
  }

  const finalPermissions = await requestNotificationPermissions();
  if (!finalPermissions.granted) {
    throw new Error('휴대폰 설정에서 Courts Korea의 알림을 허용해 주세요.');
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}
