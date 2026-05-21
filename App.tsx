import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {STORAGE_USER_KEY} from './src/constants/storage';
import AppShell from './src/screens/AppShell';
import SplashScreen from './src/screens/SplashScreen';
import {ThemeProvider} from './src/theme/theme';
import type {RootStackParamList} from './src/types/navigation';
import type {MobileUser} from './src/types/user';

const Stack = createNativeStackNavigator<RootStackParamList>();

GoogleSignin.configure({
  scopes: ['profile', 'email'],
});

function App(): React.JSX.Element {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<MobileUser | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_USER_KEY)
      .then((value) => {
        if (value) {
          setUser(JSON.parse(value));
        }
      })
      .catch(() => undefined);
  }, []);

  const persistUser = useCallback(async (nextUser: MobileUser) => {
    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
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

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {booting ? (
          <SplashScreen onReady={() => setBooting(false)} />
        ) : (
          <NavigationContainer>
            <Stack.Navigator screenOptions={{headerShown: false}}>
              <Stack.Screen name="Home">
                {() => (
                  <AppShell
                    user={user}
                    onLogout={logout}
                    onAuthenticated={persistUser}
                    onUserChange={persistUser}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
