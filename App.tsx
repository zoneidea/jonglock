import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '@react-native-firebase/app';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
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

type TabKey = 'home' | 'booking' | 'cart' | 'profile';

type TabItem = {
  key: TabKey;
  label: string;
  icon: string;
};

const tabs: TabItem[] = [
  {key: 'home', label: 'หน้าหลัก', icon: 'H'},
  {key: 'booking', label: 'จอง', icon: 'B'},
  {key: 'cart', label: 'ตระกร้า', icon: 'C'},
  {key: 'profile', label: 'โปรไฟล์', icon: 'P'},
];

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
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      }
      const result = await GoogleSignin.signIn();
      const user = result.data?.user;
      if (user?.email) {
        await persistUser({
          name: user.name || user.email.split('@')[0],
          email: user.email,
          avatar: user.photo,
          provider: 'gmail',
        });
        return;
      }
      setMessage('ไม่พบข้อมูล Gmail สำหรับเข้าสู่ระบบ');
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as {code?: string}).code)
          : '';
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        setMessage('ยกเลิกการเข้าสู่ระบบด้วย Gmail');
      } else {
        setMessage('ยังไม่สามารถเข้าสู่ระบบด้วย Gmail ได้');
      }
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
              <GoogleIcon />
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

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleIconText}>G</Text>
      <View style={[styles.googleDot, styles.googleDotRed]} />
      <View style={[styles.googleDot, styles.googleDotYellow]} />
      <View style={[styles.googleDot, styles.googleDotGreen]} />
    </View>
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

function AppShell({user, onLogout}: {user: MobileUser; onLogout: () => void}) {
  const firebaseApp = firebase.app();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const contentOpacity = useRef(new Animated.Value(1)).current;

  function changeTab(nextTab: TabKey) {
    if (nextTab === activeTab) {
      return;
    }
    Animated.sequence([
      Animated.timing(contentOpacity, {
        toValue: 0.28,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
    setActiveTab(nextTab);
  }

  function renderTabContent() {
    if (activeTab === 'home') {
      return <HomeContent user={user} firebaseAppName={firebaseApp.name} />;
    }
    if (activeTab === 'booking') {
      return (
        <PlaceholderContent
          title="จองบูธ"
          text="โครงหน้าจอสำหรับเลือกตลาด วันที่ขาย ประเภทสินค้า และแผนผังบูธ"
        />
      );
    }
    if (activeTab === 'cart') {
      return (
        <PlaceholderContent
          title="ตระกร้า"
          text="โครงหน้าจอสรุปรายการที่เลือก รอชำระเงิน และสถานะการจอง"
        />
      );
    }
    return (
      <ProfileContent user={user} onLogout={onLogout} />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Animated.View style={[styles.shellContent, {opacity: contentOpacity}]}>
        {renderTabContent()}
      </Animated.View>
      <View style={styles.bottomBar}>
        {tabs.map((tab) => (
          <BottomTabItem
            key={tab.key}
            item={tab}
            active={tab.key === activeTab}
            onPress={() => changeTab(tab.key)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

function HomeContent({user, firebaseAppName}: {user: MobileUser; firebaseAppName: string}) {
  const stats = useMemo(
    () => [
      {label: 'ตลาดเปิดจอง', value: '2'},
      {label: 'บูธพร้อมจอง', value: '46'},
      {label: 'รายการของฉัน', value: '3'},
    ],
    [],
  );

  return (
    <ScrollView contentContainerStyle={styles.homeScroll}>
      <View style={styles.homeTopbar}>
        <View>
          <Text style={styles.homeHello}>สวัสดี</Text>
          <Text style={styles.homeName}>{user.name}</Text>
        </View>
        <View style={styles.userChip}>
          <Text style={styles.userChipText}>Gmail</Text>
        </View>
      </View>

      <LinearGradient colors={['#ffffff', '#dff8f4']} style={styles.bannerCard}>
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerBadgeText}>MARKET READY</Text>
        </View>
        <Text style={styles.bannerTitle}>เลือกพื้นที่ขายได้ง่ายในไม่กี่ขั้นตอน</Text>
        <Text style={styles.bannerText}>
          โครงสำหรับแสดงแคมเปญหลัก ข่าวประกาศ หรือโปรโมชันสำคัญของตลาด
        </Text>
        <View style={styles.bannerVisual}>
          <View style={styles.bannerBoothLarge} />
          <View style={styles.bannerBoothSmall} />
          <View style={styles.bannerBoothSmallAlt} />
        </View>
      </LinearGradient>

      <View style={styles.statGrid}>
        {stats.map((item) => (
          <View key={item.label} style={styles.statCard}>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>ข่าวสารและโปรโมชั่น</Text>
      <View style={styles.promoList}>
        <PromoCard title="ข่าวสารตลาด" text="พื้นที่สำหรับแสดงประกาศล่าสุดจากระบบจัดการ" />
        <PromoCard title="โปรโมชั่น" text="พื้นที่สำหรับคูปอง ส่วนลด และแคมเปญของตลาด" />
      </View>

      <Text style={styles.sectionTitle}>เมนูหลัก</Text>
      <View style={styles.actionList}>
        <ActionItem title="Firebase พร้อมใช้งาน" text={`Default app: ${firebaseAppName}`} />
        <ActionItem title="ค้นหาตลาด" text="ดูตลาดที่เปิดจองและวันที่พร้อมขาย" />
      </View>
    </ScrollView>
  );
}

function PromoCard({title, text}: {title: string; text: string}) {
  return (
    <Pressable style={styles.promoCard}>
      <View style={styles.promoMarker} />
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText}>{text}</Text>
      </View>
    </Pressable>
  );
}

function PlaceholderContent({title, text}: {title: string; text: string}) {
  return (
    <ScrollView contentContainerStyle={styles.homeScroll}>
      <View style={styles.placeholderCard}>
        <Text style={styles.heroEyebrow}>COMING NEXT</Text>
        <Text style={styles.placeholderTitle}>{title}</Text>
        <Text style={styles.placeholderText}>{text}</Text>
      </View>
    </ScrollView>
  );
}

function ProfileContent({user, onLogout}: {user: MobileUser; onLogout: () => void}) {
  return (
    <ScrollView contentContainerStyle={styles.homeScroll}>
      <View style={styles.placeholderCard}>
        <Text style={styles.heroEyebrow}>PROFILE</Text>
        <Text style={styles.placeholderTitle}>{user.name}</Text>
        <Text style={styles.placeholderText}>{user.email}</Text>
        <Pressable onPress={onLogout} style={styles.heroButton}>
          <Text style={styles.heroButtonText}>ออกจากระบบ</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function BottomTabItem({
  item,
  active,
  onPress,
}: {
  item: TabItem;
  active: boolean;
  onPress: () => void;
}) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: active ? 1 : 0,
      friction: 7,
      tension: 80,
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [58, 104],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.bottomTab,
          active && styles.bottomTabActive,
          {width, transform: [{scale}]},
        ]}>
        <Text style={[styles.bottomTabIcon, active && styles.bottomTabIconActive]}>
          {item.icon}
        </Text>
        {active ? <Text style={styles.bottomTabText}>{item.label}</Text> : null}
      </Animated.View>
    </Pressable>
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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    ...shadow,
  },
  googleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#e2e7ef',
  },
  googleIconText: {
    color: '#4285f4',
    fontSize: 19,
    fontWeight: '900',
  },
  googleDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  googleDotRed: {
    top: 6,
    right: 7,
    backgroundColor: '#ea4335',
  },
  googleDotYellow: {
    bottom: 6,
    right: 7,
    backgroundColor: '#fbbc05',
  },
  googleDotGreen: {
    bottom: 6,
    left: 7,
    backgroundColor: '#34a853',
  },
  gmailButtonText: {
    color: colors.ink,
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
  shellContent: {
    flex: 1,
  },
  homeScroll: {
    padding: 22,
    paddingBottom: 120,
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
  userChip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  userChipText: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
  },
  bannerCard: {
    minHeight: 230,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  bannerBadgeText: {
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bannerTitle: {
    marginTop: 14,
    color: colors.ink,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    maxWidth: 270,
  },
  bannerText: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    maxWidth: 250,
  },
  bannerVisual: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 116,
    height: 116,
  },
  bannerBoothLarge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: colors.teal,
    opacity: 0.18,
  },
  bannerBoothSmall: {
    position: 'absolute',
    left: 4,
    top: 8,
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.navy,
    opacity: 0.1,
  },
  bannerBoothSmallAlt: {
    position: 'absolute',
    left: 22,
    bottom: 10,
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.gold,
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
  promoList: {
    gap: 12,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 86,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promoMarker: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.soft,
    borderWidth: 8,
    borderColor: '#d7f2ee',
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
  placeholderCard: {
    minHeight: 360,
    borderRadius: 30,
    padding: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    ...shadow,
  },
  placeholderTitle: {
    marginTop: 10,
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
  },
  placeholderText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    height: 76,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    ...shadow,
  },
  bottomTab: {
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  bottomTabActive: {
    backgroundColor: colors.teal,
  },
  bottomTabIcon: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '900',
  },
  bottomTabIconActive: {
    color: colors.white,
  },
  bottomTabText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
});

export default App;
