import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import React, {useCallback, useEffect, useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {STORAGE_AUDIT_USER_KEY, STORAGE_USER_KEY} from './src/constants/storage';
import AuditShell from './src/screens/AuditShell';
import AppShell from './src/screens/AppShell';
import SplashScreen from './src/screens/SplashScreen';
import {ThemeProvider} from './src/theme/theme';
import type {AuditUser, MobileUser} from './src/types/user';

GoogleSignin.configure({
  scopes: ['profile', 'email'],
});

function App(): React.JSX.Element {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [auditUser, setAuditUser] = useState<AuditUser | null>(null);
  const [activeExperience, setActiveExperience] = useState<'customer' | 'audit'>('customer');

  useEffect(() => {
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
          />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
