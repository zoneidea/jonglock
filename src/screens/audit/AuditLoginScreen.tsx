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
import {loginAudit} from '../../services/audit';
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
  const [organizationCode, setOrganizationCode] = useState('');
  const [staffCode, setStaffCode] = useState('');
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
    const trimmedOrganizationCode = organizationCode.trim().toUpperCase();
    const trimmedStaffCode = staffCode.trim();

    if (!trimmedOrganizationCode) {
      setMessage('กรุณากรอกรหัสองค์กร');
      return;
    }
    if (!trimmedStaffCode) {
      setMessage('กรุณากรอกรหัสเจ้าหน้าที่');
      return;
    }
    if (password.trim().length < 6) {
      setMessage('กรุณากรอกรหัสผ่านเจ้าหน้าที่');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const user = await loginAudit({
        organizationCode: trimmedOrganizationCode,
        username: trimmedStaffCode,
        password: password.trim(),
      });
      onAuthenticated(user);
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
          </LinearGradient>

          <View style={[styles.formCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
            <Text style={[styles.formTitle, {color: palette.text}]}>ยืนยันตัวตนเจ้าหน้าที่</Text>

            <LabeledInput
              label="รหัสองค์กร"
              value={organizationCode}
              onChangeText={setOrganizationCode}
              placeholder="เช่น ORG001"
              autoCapitalize="characters"
            />
            <LabeledInput
              label="รหัสเจ้าหน้าที่"
              value={staffCode}
              onChangeText={setStaffCode}
              placeholder="เช่น audit"
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
    minHeight: 172,
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
