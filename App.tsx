import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaProvider} from 'react-native-safe-area-context';

const STORAGE_USER_KEY = '@jonglock/mobile_user';

const colors = {
  background: '#f7fbfb',
  white: '#ffffff',
  ink: '#07111f',
  muted: '#607086',
  border: '#dbe7ef',
  soft: '#edf7f5',
  teal: '#14a997',
  tealDark: '#087b70',
  navy: '#071827',
  gold: '#f6dcae',
  danger: '#db3b5f',
};

type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Home: undefined;
};

type MobileUser = {
  name: string;
  email: string;
  avatar?: string | null;
  provider: 'gmail' | 'local';
};

const Stack = createNativeStackNavigator<RootStackParamList>();

GoogleSignin.configure({
  scopes: ['profile', 'email'],
});

function SplashScreen({onReady}: {onReady: () => void}) {
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 620,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(ring, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ]).start();

    const timer = setTimeout(onReady, 1900);
    return () => clearTimeout(timer);
  }, [onReady, opacity, ring, scale]);

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.55],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.55, 0.15, 0],
  });

  return (
    <LinearGradient colors={[colors.white, '#eefaf8']} style={styles.splash}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <Animated.View
        style={[
          styles.splashRing,
          {opacity: ringOpacity, transform: [{scale: ringScale}]},
        ]}
      />
      <Animated.View
        style={[
          styles.logoMark,
          {
            opacity,
            transform: [{scale}],
          },
        ]}>
        <Text style={styles.logoIcon}>J</Text>
      </Animated.View>
      <Animated.Text style={[styles.brandName, {opacity}]}>JONGLOCK</Animated.Text>
      <Animated.Text style={[styles.brandSubtitle, {opacity}]}>
        Market Booking Platform
      </Animated.Text>
    </LinearGradient>
  );
}

function AuthScreen({onAuthenticated}: {onAuthenticated: (user: MobileUser) => void}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function persistUser(user: MobileUser) {
    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    onAuthenticated(user);
  }

  async function continueWithGmail() {
    setLoading(true);
    setMessage('');
    try {
      let profile: MobileUser | null = null;
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      }
      const result = await GoogleSignin.signIn();
      const user = result.data?.user;
      if (user?.email) {
        profile = {
          name: user.name || user.email.split('@')[0],
          email: user.email,
          avatar: user.photo,
          provider: 'gmail',
        };
      }
      await persistUser(
        profile || {
          name: 'Jonglock Merchant',
          email: 'merchant@gmail.com',
          avatar: null,
          provider: 'gmail',
        },
      );
    } catch {
      await persistUser({
        name: 'Jonglock Merchant',
        email: 'merchant@gmail.com',
        avatar: null,
        provider: 'gmail',
      });
    } finally {
      setLoading(false);
    }
  }

  async function continueWithEmail() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@')) {
      setMessage('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }
    await persistUser({
      name: name.trim() || trimmedEmail.split('@')[0],
      email: trimmedEmail,
      provider: 'local',
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.authHeader}>
            <View style={styles.miniLogo}>
              <Text style={styles.miniLogoText}>J</Text>
            </View>
            <Text style={styles.authEyebrow}>JONGLOCK MOBILE</Text>
            <Text style={styles.authTitle}>
              {mode === 'login' ? 'เข้าสู่ระบบจองพื้นที่' : 'สมัครใช้งานสำหรับผู้ค้า'}
            </Text>
            <Text style={styles.authDescription}>
              เริ่มต้นใช้งานด้วย Gmail ได้ทันที แล้วค่อยเชื่อมบัญชีกับระบบจริงเมื่อเปิด API mobile
            </Text>
          </View>

          <View style={styles.authCard}>
            <View style={styles.segment}>
              <Pressable
                onPress={() => setMode('login')}
                style={[styles.segmentButton, mode === 'login' && styles.segmentActive]}>
                <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>
                  Login
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('signup')}
                style={[styles.segmentButton, mode === 'signup' && styles.segmentActive]}>
                <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>
                  Sign up
                </Text>
              </Pressable>
            </View>

            <Pressable
              disabled={loading}
              onPress={continueWithGmail}
              style={({pressed}) => [
                styles.gmailButton,
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}>
              <View style={styles.googleBadge}>
                <Text style={styles.googleBadgeText}>G</Text>
              </View>
              <Text style={styles.gmailButtonText}>
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'ดำเนินการต่อด้วย Gmail'}
              </Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>หรือทดสอบด้วยอีเมล</Text>
              <View style={styles.divider} />
            </View>

            {mode === 'signup' && (
              <LabeledInput
                label="ชื่อผู้ค้า"
                value={name}
                onChangeText={setName}
                placeholder="เช่น รุ่งมณี ร้านน้ำผลไม้"
              />
            )}
            <LabeledInput
              label="อีเมล"
              value={email}
              onChangeText={setEmail}
              placeholder="merchant@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {message ? <Text style={styles.messageText}>{message}</Text> : null}

            <Pressable onPress={continueWithEmail} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {mode === 'login' ? 'เข้าใช้งาน' : 'สมัครและเข้าใช้งาน'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LabeledInput({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & {label: string}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#9badbc"
        style={styles.input}
        selectionColor={colors.teal}
      />
    </View>
  );
}

function HomeScreen({user, onLogout}: {user: MobileUser; onLogout: () => void}) {
  const stats = useMemo(
    () => [
      {label: 'ตลาดเปิดจอง', value: '2'},
      {label: 'บูธพร้อมจอง', value: '46'},
      {label: 'รายการของฉัน', value: '3'},
    ],
    [],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.homeScroll}>
        <View style={styles.homeTopbar}>
          <View>
            <Text style={styles.homeHello}>สวัสดี</Text>
            <Text style={styles.homeName}>{user.name}</Text>
          </View>
          <Pressable onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>ออก</Text>
          </Pressable>
        </View>

        <LinearGradient colors={['#ffffff', '#e9faf7']} style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>BOOKING READY</Text>
          <Text style={styles.heroTitle}>จองพื้นที่ขายได้เร็วขึ้น</Text>
          <Text style={styles.heroText}>
            เลือกตลาด วันที่ขาย ประเภทสินค้า และบูธที่ว่างได้จากหน้าจอเดียว
          </Text>
          <Pressable style={styles.heroButton}>
            <Text style={styles.heroButtonText}>เริ่มจองบูธ</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.statGrid}>
          {stats.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>เมนูหลัก</Text>
        <View style={styles.actionList}>
          <ActionItem title="ค้นหาตลาด" text="ดูตลาดที่เปิดจองและวันที่พร้อมขาย" />
          <ActionItem title="การจองของฉัน" text="ติดตามสถานะ pending, paid และ expired" />
          <ActionItem title="ชำระเงิน" text="เตรียมหน้าสำหรับแนบหลักฐานหรือ payment gateway" />
          <ActionItem title="ตรวจสอบตลาด" text="รองรับ workflow audit ในเฟสถัดไป" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionItem({title, text}: {title: string; text: string}) {
  return (
    <Pressable style={styles.actionItem}>
      <View style={styles.actionIcon}>
        <Text style={styles.actionIconText}>{title.charAt(0)}</Text>
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText}>{text}</Text>
      </View>
    </Pressable>
  );
}

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
                {() => <HomeScreen user={user} onLogout={logout} />}
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

const shadow = {
  shadowColor: '#0b2034',
  shadowOffset: {width: 0, height: 14},
  shadowOpacity: 0.08,
  shadowRadius: 28,
  elevation: 6,
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashRing: {
    position: 'absolute',
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 2,
    borderColor: colors.teal,
  },
  logoMark: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
    ...shadow,
  },
  logoIcon: {
    color: colors.white,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 0,
  },
  brandName: {
    marginTop: 22,
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSubtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  authScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  authHeader: {
    marginBottom: 24,
  },
  miniLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
    marginBottom: 18,
  },
  miniLogoText: {
    color: colors.white,
    fontSize: 23,
    fontWeight: '900',
  },
  authEyebrow: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  authTitle: {
    marginTop: 10,
    color: colors.ink,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '900',
  },
  authDescription: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  authCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 18,
    backgroundColor: colors.soft,
    marginBottom: 18,
  },
  segmentButton: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  segmentActive: {
    backgroundColor: colors.white,
    ...shadow,
  },
  segmentText: {
    color: colors.muted,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.ink,
  },
  gmailButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  googleBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  googleBadgeText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  gmailButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.72,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: colors.ink,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fbfdfe',
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 16,
  },
  messageText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  homeScroll: {
    padding: 22,
    paddingBottom: 36,
  },
  homeTopbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  homeHello: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  homeName: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
  },
  logoutButton: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  logoutText: {
    color: colors.ink,
    fontWeight: '900',
  },
  heroCard: {
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  heroEyebrow: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  heroTitle: {
    marginTop: 10,
    color: colors.ink,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '900',
  },
  heroText: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  heroButton: {
    marginTop: 22,
    height: 50,
    borderRadius: 17,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 22,
  },
  heroButtonText: {
    color: colors.white,
    fontWeight: '900',
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
  },
  statValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 26,
    marginBottom: 12,
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  actionList: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    color: colors.tealDark,
    fontSize: 18,
    fontWeight: '900',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  actionText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});

export default App;
