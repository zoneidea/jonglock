import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, {useNetInfo} from '@react-native-community/netinfo';
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import React, {useCallback, useEffect, useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {STORAGE_AUDIT_USER_KEY, STORAGE_USER_KEY} from './src/constants/storage';
import AuditShell from './src/screens/AuditShell';
import AppShell from './src/screens/AppShell';
import OfflineScreen from './src/screens/OfflineScreen';
import SplashScreen from './src/screens/SplashScreen';
import {syncDynamicAppIcon} from './src/services/appIcon';
import {unregisterPushDeviceToken} from './src/services/notifications';
import {ThemeProvider} from './src/theme/theme';
import type {AuditUser, MobileUser} from './src/types/user';

export type AppDeepLink = {
  type: 'market';
  organizationCode?: string;
  organizationId?: string;
  marketId?: string;
  marketCode?: string;
};

type LinkingModule = {
  getInitialURL?: () => Promise<string | null>;
  addEventListener?: (eventType: 'url', listener: (event: {url: string}) => void) => {remove: () => void};
};

GoogleSignin.configure({
  scopes: ['profile', 'email'],
  webClientId: '1087957238231-4mv90nlc1fkl0bv32rakoq3tue8k4h0c.apps.googleusercontent.com',
  offlineAccess: false,
});

function App(): React.JSX.Element {
  const netInfo = useNetInfo();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [auditUser, setAuditUser] = useState<AuditUser | null>(null);
  const [activeExperience, setActiveExperience] = useState<'customer' | 'audit'>('customer');
  const [pendingDeepLink, setPendingDeepLink] = useState<AppDeepLink | null>(null);
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  useEffect(() => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return;
    }
    syncDynamicAppIcon();
    Promise.all([
      AsyncStorage.getItem(STORAGE_USER_KEY),
      AsyncStorage.getItem(STORAGE_AUDIT_USER_KEY),
    ])
      .then(([mobileValue, auditValue]) => {
        if (mobileValue) {
          setUser(JSON.parse(mobileValue));
        }
        if (auditValue) {
          setAuditUser(JSON.parse(auditValue));
          setActiveExperience('audit');
        }
      })
      .catch(() => undefined);
  }, []);

  const handleIncomingUrl = useCallback((url: string | null) => {
    const deepLink = parseAppDeepLink(url);
    if (!deepLink) {
      return;
    }
    setActiveExperience('customer');
    setPendingDeepLink(deepLink);
  }, []);

  useEffect(() => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return undefined;
    }
    let LinkingModuleValue: LinkingModule | null = null;
    try {
      // Avoid the react-native named export getter in Jest while keeping native Linking in runtime.
      const loadedModule = require('react-native/Libraries/Linking/Linking') as {default?: LinkingModule} & LinkingModule;
      LinkingModuleValue = loadedModule.default || loadedModule;
    } catch {
      return undefined;
    }
    const linking = LinkingModuleValue;
    if (
      typeof linking.getInitialURL !== 'function'
      || typeof linking.addEventListener !== 'function'
    ) {
      return undefined;
    }
    linking.getInitialURL().then(handleIncomingUrl).catch(() => undefined);
    const subscription = linking.addEventListener('url', (event) => handleIncomingUrl(event.url));
    return () => subscription?.remove();
  }, [handleIncomingUrl]);

  useEffect(() => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return undefined;
    }
    NetInfo.fetch().catch(() => undefined);
    return undefined;
  }, []);

  const persistUser = useCallback(async (nextUser: MobileUser) => {
    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const persistAuditUser = useCallback(async (nextUser: AuditUser) => {
    await AsyncStorage.setItem(STORAGE_AUDIT_USER_KEY, JSON.stringify(nextUser));
    setAuditUser(nextUser);
    setActiveExperience('audit');
  }, []);

  const logout = useCallback(async () => {
    await unregisterPushDeviceToken().catch(() => undefined);
    await AsyncStorage.removeItem(STORAGE_USER_KEY);
    try {
      await GoogleSignin.signOut();
    } catch {
      // Google native config is optional in this UI-first MVP.
    }
    try {
      await auth().signOut();
    } catch {
      // Firebase Auth session may not exist.
    }
    setUser(null);
  }, []);

  const logoutAudit = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_AUDIT_USER_KEY);
    setAuditUser(null);
    setActiveExperience('customer');
  }, []);

  const openAuditPortal = useCallback(() => {
    setActiveExperience('audit');
  }, []);

  const returnToCustomer = useCallback(() => {
    setActiveExperience('customer');
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {booting ? (
          <SplashScreen onReady={() => setBooting(false)} />
        ) : isOffline ? (
          <OfflineScreen />
        ) : activeExperience === 'audit' ? (
          <AuditShell
            user={auditUser}
            onAuthenticated={persistAuditUser}
            onLogout={logoutAudit}
            onBackToCustomer={returnToCustomer}
          />
        ) : (
          <AppShell
            user={user}
            onLogout={logout}
            onAuthenticated={persistUser}
            onUserChange={persistUser}
            onOpenAuditPortal={openAuditPortal}
            deepLink={pendingDeepLink}
            onDeepLinkConsumed={() => setPendingDeepLink(null)}
          />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function parseAppDeepLink(url: string | null): AppDeepLink | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    const customSchemeMarket = parsed.protocol === 'jonglock:' && parsed.hostname === 'market';
    const universalMarket = /^https?:$/i.test(parsed.protocol) && parsed.pathname.replace(/\/+$/, '') === '/market';
    if (!customSchemeMarket && !universalMarket) {
      return null;
    }
    return {
      type: 'market',
      organizationCode: parsed.searchParams.get('organizationCode') || undefined,
      organizationId: parsed.searchParams.get('organizationId') || undefined,
      marketId: parsed.searchParams.get('marketId') || undefined,
      marketCode: parsed.searchParams.get('marketCode') || undefined,
    };
  } catch {
    return null;
  }
}

export default App;
