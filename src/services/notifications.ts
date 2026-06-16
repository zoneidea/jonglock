import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {PermissionsAndroid, Platform} from 'react-native';

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
const PUSH_INSTALLATION_ID_KEY = 'jonglock.pushInstallationId';
const LAST_BACKGROUND_PUSH_KEY = 'jonglock.lastBackgroundPushMessage';
const GLOBAL_PUSH_TOPIC = 'jonglock-all-mobile';

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

function buildPushTopics(organizationId: number) {
  return [GLOBAL_PUSH_TOPIC, `org-${organizationId}`];
}

async function ensureAndroidNotificationPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }
  const sdkVersion = typeof Platform.Version === 'number'
    ? Platform.Version
    : Number(Platform.Version || 0);
  if (sdkVersion < 33) {
    return true;
  }
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  const granted = await PermissionsAndroid.check(permission);
  if (granted) {
    return true;
  }
  const status = await PermissionsAndroid.request(permission);
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestPushPermission() {
  const androidAllowed = await ensureAndroidNotificationPermission();
  if (!androidAllowed) {
    return false;
  }
  await ensureDeviceRegisteredForRemoteMessages();
  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED
    || status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

async function getCurrentPushTokenSilently() {
  try {
    await ensureDeviceRegisteredForRemoteMessages();
    return await messaging().getToken();
  } catch {
    return '';
  }
}

async function getInstallationId() {
  const current = await AsyncStorage.getItem(PUSH_INSTALLATION_ID_KEY);
  if (current) {
    return current;
  }
  const generated = `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(PUSH_INSTALLATION_ID_KEY, generated);
  return generated;
}

export async function getPushToken() {
  const allowed = await requestPushPermission();
  if (!allowed) {
    return '';
  }
  await ensureDeviceRegisteredForRemoteMessages();
  return messaging().getToken();
}

async function syncPushTopics({
  nextOrganizationId,
  previousOrganizationId,
}: {
  nextOrganizationId?: number | null;
  previousOrganizationId?: number | null;
}) {
  if (previousOrganizationId && previousOrganizationId !== nextOrganizationId) {
    const previousTopics = buildPushTopics(previousOrganizationId);
    await Promise.all(
      previousTopics.map((topic) => messaging().unsubscribeFromTopic(topic).catch(() => undefined)),
    );
  }

  if (!nextOrganizationId) {
    return;
  }

  const topics = buildPushTopics(nextOrganizationId);
  await Promise.all(
    topics.map((topic) => messaging().subscribeToTopic(topic).catch(() => undefined)),
  );
}

export async function primePushNotifications() {
  const allowed = await requestPushPermission();
  if (!allowed) {
    return false;
  }
  await messaging().subscribeToTopic(GLOBAL_PUSH_TOPIC).catch(() => undefined);
  return true;
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
      deviceId: await getInstallationId(),
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as ApiResponse<{registered: boolean}>;
  return payload.data;
}

async function postDeletePushDeviceToken({
  user,
  organizationId,
  fcmToken,
}: PushRegistrationContext & {
  fcmToken: string;
}) {
  const response = await fetch(`${API_BASE_URL}/public/profile/device-token/remove`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user: {email: user.email, name: user.name},
      organizationId,
      fcmToken,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as ApiResponse<{removed: boolean}>;
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

async function clearPushRegistrationContext() {
  await AsyncStorage.removeItem(PUSH_REGISTRATION_CONTEXT_KEY);
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
  const previousContext = await readPushRegistrationContext();
  const context = {user: {email: user.email, name: user.name}, organizationId};
  await writePushRegistrationContext(context);
  const fcmToken = await getPushToken();
  if (!fcmToken) {
    return null;
  }
  await syncPushTopics({
    nextOrganizationId: organizationId,
    previousOrganizationId: previousContext?.organizationId,
  });
  const result = await postPushDeviceToken({...context, fcmToken});
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
  await syncPushTopics({nextOrganizationId: context.organizationId});
  return postPushDeviceToken({...context, fcmToken});
}

export async function unregisterPushDeviceToken() {
  const context = await readPushRegistrationContext();
  const fcmToken = await getCurrentPushTokenSilently();

  if (context?.organizationId) {
    await syncPushTopics({previousOrganizationId: context.organizationId});
  } else {
    await messaging().unsubscribeFromTopic(GLOBAL_PUSH_TOPIC).catch(() => undefined);
  }

  if (context && fcmToken) {
    await postDeletePushDeviceToken({...context, fcmToken}).catch(() => undefined);
  }

  if (fcmToken) {
    await messaging().deleteToken().catch(() => undefined);
  }

  await clearPushRegistrationContext();
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

export async function handleBackgroundPushMessage(remoteMessage: {
  notification?: {title?: string; body?: string};
  data?: {[key: string]: unknown};
}) {
  const message = mapRemoteMessage(remoteMessage);
  await AsyncStorage.setItem(
    LAST_BACKGROUND_PUSH_KEY,
    JSON.stringify({
      ...message,
      receivedAt: new Date().toISOString(),
    }),
  );
}
