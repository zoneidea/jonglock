import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

import {API_BASE_URL} from '../config/api';
import type {MobileUser} from '../types/user';

export type PushNotificationMessage = {
  title: string;
  body: string;
  data: Record<string, string>;
};

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

type PushRegistrationContext = {
  user: Pick<MobileUser, 'email' | 'name'>;
  organizationId: number;
};

const PUSH_REGISTRATION_CONTEXT_KEY = 'jonglock.pushRegistrationContext';

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {message?: string};
    return payload.message || 'Notification request failed';
  } catch {
    return 'Notification request failed';
  }
}

function normalizeData(data?: {[key: string]: unknown}) {
  return Object.entries(data || {}).reduce<Record<string, string>>((result, [key, value]) => {
    if (value === undefined || value === null) {
      return result;
    }
    result[key] = typeof value === 'string' ? value : String(value);
    return result;
  }, {});
}

function mapRemoteMessage(remoteMessage: {
  notification?: {title?: string; body?: string};
  data?: {[key: string]: unknown};
}): PushNotificationMessage {
  const data = normalizeData(remoteMessage.data);
  return {
    title: remoteMessage.notification?.title || data.title || 'Jonglock',
    body: remoteMessage.notification?.body || data.body || '',
    data,
  };
}

async function ensureDeviceRegisteredForRemoteMessages() {
  if (Platform.OS !== 'ios') {
    return;
  }
  if (!messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging().registerDeviceForRemoteMessages();
  }
}

export async function requestPushPermission() {
  await ensureDeviceRegisteredForRemoteMessages();
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
  await ensureDeviceRegisteredForRemoteMessages();
  return messaging().getToken();
}

async function postPushDeviceToken({
  user,
  organizationId,
  fcmToken,
}: PushRegistrationContext & {
  fcmToken: string;
}) {
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

async function readPushRegistrationContext() {
  try {
    const rawContext = await AsyncStorage.getItem(PUSH_REGISTRATION_CONTEXT_KEY);
    if (!rawContext) {
      return null;
    }
    const context = JSON.parse(rawContext) as PushRegistrationContext;
    if (!context.user?.email || !context.organizationId) {
      return null;
    }
    return context;
  } catch {
    return null;
  }
}

async function writePushRegistrationContext(context: PushRegistrationContext) {
  await AsyncStorage.setItem(PUSH_REGISTRATION_CONTEXT_KEY, JSON.stringify(context));
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

  const context = {user: {email: user.email, name: user.name}, organizationId};
  const result = await postPushDeviceToken({...context, fcmToken});
  await writePushRegistrationContext(context);
  return result;
}

export async function registerLatestPushDeviceToken() {
  const context = await readPushRegistrationContext();
  if (!context) {
    return null;
  }
  const fcmToken = await getPushToken();
  if (!fcmToken) {
    return null;
  }
  return postPushDeviceToken({...context, fcmToken});
}

export function subscribeToForegroundPushMessages(onMessage: (message: PushNotificationMessage) => void) {
  return messaging().onMessage(async (remoteMessage) => {
    onMessage(mapRemoteMessage(remoteMessage));
  });
}

export function subscribeToNotificationOpenEvents(onOpen: (message: PushNotificationMessage) => void) {
  let active = true;
  const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
    onOpen(mapRemoteMessage(remoteMessage));
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (active && remoteMessage) {
        onOpen(mapRemoteMessage(remoteMessage));
      }
    })
    .catch(() => undefined);

  return () => {
    active = false;
    unsubscribeOpened();
  };
}

export function subscribeToPushTokenRefresh() {
  return messaging().onTokenRefresh(async (fcmToken) => {
    try {
      const context = await readPushRegistrationContext();
      if (!context) {
        return;
      }
      await postPushDeviceToken({...context, fcmToken});
    } catch {
      // Token refresh will be retried on the next app session or token registration flow.
    }
  });
}
