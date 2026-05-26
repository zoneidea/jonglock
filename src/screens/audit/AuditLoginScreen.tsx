import React, {useMemo, useState} from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import LabeledInput from '../../components/LabeledInput';
import {colors, shadow} from '../../theme/colors';
import {useTheme} from '../../theme/theme';
import type {AuditUser} from '../../types/user';

const POWERED_BY_TEXT = 'Powered by zone-idea innovation co.,ltd.';

function AuditLoginScreen({
  onAuthenticated,
  onBackToCustomer,
}: {
  onAuthenticated: (user: AuditUser) => void;
  onBackToCustomer: () => void;
}) {
  const [staffCode, setStaffCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const {palette, resolvedTheme} = useTheme();

  const gradientColors = useMemo(
    () =>
      resolvedTheme === 'dark'
        ? ['#09111b', '#101d2a', '#0c1822']
        : ['#0b1827', '#11263d', '#1b3550'],
    [resolvedTheme],
  );

  async function handleLogin() {
    const trimmedStaffCode = staffCode.trim().toUpperCase();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedStaffCode) {
      setMessage('กรุณากรอกรหัสเจ้าหน้าที่');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      setMessage('กรุณากรอกอีเมลเจ้าหน้าที่ให้ถูกต้อง');
      return;
    }
    if (password.trim().length < 6) {
      setMessage('กรุณากรอกรหัสผ่านเจ้าหน้าที่');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      onAuthenticated({
        name: `เจ้าหน้าที่ ${trimmedStaffCode}`,
        email: trimmedEmail,
        staffCode: trimmedStaffCode,
        role: 'audit',
      });
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถเข้าสู่ระบบเจ้าหน้าที่ได้');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#08111a" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={gradientColors} style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.badgeWrap}>
                <MaterialCommunityIcons name="shield-check-outline" size={24} color="#dff7ff" />
              </View>
              <Text style={styles.eyebrow}>AUDIT ACCESS</Text>
            </View>
            <Text style={styles.title}>เข้าสู่ระบบเจ้าหน้าที่ตรวจสอบตลาด</Text>
            <Text style={styles.description}>
              เส้นทางนี้แยกจากผู้ใช้งานทั่วไปโดยเฉพาะ ใช้สำหรับตรวจสอบการจอง การขาย และการทำผิดกฎภายในตลาด
            </Text>
            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#70e1d0" />
                <Text style={styles.featureText}>โหมดตรวจสอบแยกจากโหมดผู้จอง</Text>
              </View>
              <View style={styles.featureRow}>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#70e1d0" />
                <Text style={styles.featureText}>โครงสร้างหน้าจอและ route คนละชุด</Text>
              </View>
              <View style={styles.featureRow}>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#70e1d0" />
                <Text style={styles.featureText}>พร้อมต่อยอด workflow งานตรวจภาคสนาม</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.formCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
            <Text style={[styles.formTitle, {color: palette.text}]}>ยืนยันตัวตนเจ้าหน้าที่</Text>
            <Text style={[styles.formSubtitle, {color: palette.muted}]}>
              ระบุข้อมูลเจ้าหน้าที่เพื่อเข้าสู่โหมดตรวจสอบ
            </Text>

            <LabeledInput
              label="รหัสเจ้าหน้าที่"
              value={staffCode}
              onChangeText={setStaffCode}
              placeholder="เช่น AUDIT-001"
              autoCapitalize="characters"
            />
            <LabeledInput
              label="อีเมลเจ้าหน้าที่"
              value={email}
              onChangeText={setEmail}
              placeholder="audit@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <LabeledInput
              label="รหัสผ่าน"
              value={password}
              onChangeText={setPassword}
              placeholder="กรอกรหัสผ่านเจ้าหน้าที่"
              secureTextEntry
            />

            {message ? <Text style={styles.messageText}>{message}</Text> : null}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({pressed}) => [
                styles.auditButton,
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}>
              <Text style={styles.auditButtonText}>
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่โหมดตรวจสอบ'}
              </Text>
            </Pressable>

            <Pressable onPress={onBackToCustomer} style={styles.backLink}>
              <MaterialCommunityIcons name="arrow-left" size={16} color={palette.muted} />
              <Text style={[styles.backLinkText, {color: palette.muted}]}>กลับไปโหมดผู้ใช้งานทั่วไป</Text>
            </Pressable>
          </View>

          <Text style={styles.poweredByText}>{POWERED_BY_TEXT}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  safe: {
    flex: 1,
    backgroundColor: '#08111a',
  },
  scroll: {
    flexGrow: 1,
    padding: 22,
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 30,
    padding: 24,
    minHeight: 260,
    ...shadow,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  badgeWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#8dc8ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    color: '#ffffff',
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '900',
  },
  description: {
    marginTop: 12,
    color: '#b9cad9',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
  },
  featureList: {
    marginTop: 22,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    color: '#d8edf5',
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    marginTop: 18,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    ...shadow,
  },
  formTitle: {
    fontSize: 23,
    fontWeight: '900',
  },
  formSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 18,
  },
  messageText: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  auditButton: {
    marginTop: 18,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#0f2238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  backLink: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {opacity: 0.84},
  disabled: {opacity: 0.72},
  poweredByText: {
    marginTop: 22,
    color: '#7f94a8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});

export default AuditLoginScreen;
