import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';

import {API_BASE_URL} from '../config/api';
import type {MobileUser} from '../types/user';

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {message?: string};
    return payload.message || 'Notification request failed';
  } catch {
    return 'Notification request failed';
  }
}

export async function requestPushPermission() {
  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED
    || status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function getPushToken() {
  const allowed = await requestPushPermission();
  if (!allowed) {
    return '';
  }
  return messaging().getToken();
}

export async function registerPushDeviceToken({
  user,
  organizationId,
}: {
  user: MobileUser;
  organizationId: number;
}) {
  if (!user.email || !organizationId) {
    return null;
  }
  const fcmToken = await getPushToken();
  if (!fcmToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/public/profile/device-token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user: {email: user.email, name: user.name},
      organizationId,
      fcmToken,
      platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as ApiResponse<{registered: boolean}>;
  return payload.data;
}

export function subscribeToForegroundPushMessages(onMessage: (message: {title: string; body: string}) => void) {
  return messaging().onMessage(async (remoteMessage) => {
    onMessage({
      title: remoteMessage.notification?.title || String(remoteMessage.data?.title || 'Jonglock'),
      body: remoteMessage.notification?.body || String(remoteMessage.data?.body || ''),
    });
  });
}
