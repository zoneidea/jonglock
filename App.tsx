import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {STORAGE_USER_KEY} from './src/constants/storage';
import AppShell from './src/screens/AppShell';
import AuthScreen from './src/screens/AuthScreen';
import SplashScreen from './src/screens/SplashScreen';
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

  async function logout() {
    await AsyncStorage.removeItem(STORAGE_USER_KEY);
    try {
      await GoogleSignin.signOut();
    } catch {
      // Google native config is optional in this UI-first MVP.
    }
    setUser(null);
  }

  return (
    <SafeAreaProvider>
      {booting ? (
        <SplashScreen onReady={() => setBooting(false)} />
      ) : (
        <NavigationContainer>
          <Stack.Navigator screenOptions={{headerShown: false}}>
            {user ? (
              <Stack.Screen name="Home">
                {() => <AppShell user={user} onLogout={logout} />}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="Auth">
                {() => <AuthScreen onAuthenticated={setUser} />}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

export default App;
