import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import GoogleIcon from '../components/GoogleIcon';
import LabeledInput from '../components/LabeledInput';
import {STORAGE_USER_KEY} from '../constants/storage';
import {colors, shadow} from '../theme/colors';
import type {MobileUser} from '../types/user';

const POWERED_BY_TEXT = 'Powered by zone-idea innovation co.,ltd.';

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
      if (isCancelledResponse(result)) {
        setMessage('ยกเลิกการเข้าสู่ระบบด้วย Gmail');
        return;
      }
      if (!isSuccessResponse(result)) {
        setMessage('ยังไม่สามารถเข้าสู่ระบบด้วย Gmail ได้');
        return;
      }
      const user = result.data.user;
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
      const code = isErrorWithCode(error) ? String(error.code) : '';
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        setMessage('ยกเลิกการเข้าสู่ระบบด้วย Gmail');
      } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setMessage('Google Play Services ยังไม่พร้อมใช้งาน');
      } else if (code === '10' || code === 'DEVELOPER_ERROR') {
        setMessage('ตั้งค่า Google Sign-In ยังไม่ครบ กรุณาตรวจสอบ SHA-1/SHA-256 ใน Firebase');
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
          <Text style={styles.poweredByText}>{POWERED_BY_TEXT}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
  poweredByText: {
    marginTop: 22,
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
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
});

export default AuthScreen;
