import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {shadow} from '../theme/colors';
import {useTheme} from '../theme/theme';

export type NoticeType = 'success' | 'warning' | 'error';

type NoticeState = {
  visible: boolean;
  type: NoticeType;
  title?: string;
  message: string;
};

type NoticeContextValue = {
  showNotice: (type: NoticeType, message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
};

const SUCCESS_AUTO_DISMISS_MS = 2000;

const NOTICE_META: Record<NoticeType, {icon: string; defaultTitle: string}> = {
  success: {icon: 'check-circle-outline', defaultTitle: 'สำเร็จ'},
  warning: {icon: 'alert-outline', defaultTitle: 'คำเตือน'},
  error: {icon: 'alert-circle-outline', defaultTitle: 'เกิดข้อผิดพลาด'},
};

const NoticeContext = createContext<NoticeContextValue | null>(null);

export function NoticeProvider({children}: {children: React.ReactNode}) {
  const {palette} = useTheme();
  const [notice, setNotice] = useState<NoticeState>({visible: false, type: 'success', message: ''});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const hide = useCallback(() => {
    clearTimer();
    setNotice((current) => ({...current, visible: false}));
  }, [clearTimer]);

  const showNotice = useCallback((type: NoticeType, message: string, title?: string) => {
    clearTimer();
    setNotice({visible: true, type, message, title});
    if (type === 'success') {
      timerRef.current = setTimeout(() => {
        setNotice((current) => (current.type === 'success' ? {...current, visible: false} : current));
      }, SUCCESS_AUTO_DISMISS_MS);
    }
  }, [clearTimer]);

  const value = useMemo<NoticeContextValue>(() => ({
    showNotice,
    showSuccess: (message, title) => showNotice('success', message, title),
    showWarning: (message, title) => showNotice('warning', message, title),
    showError: (message, title) => showNotice('error', message, title),
  }), [showNotice]);

  const meta = NOTICE_META[notice.type];
  const accentColor = notice.type === 'success'
    ? palette.accent
    : notice.type === 'warning'
      ? palette.gold
      : palette.danger;
  const dismissible = notice.type !== 'success';

  return (
    <NoticeContext.Provider value={value}>
      {children}
      <Modal
        visible={notice.visible}
        transparent
        animationType="fade"
        onRequestClose={dismissible ? hide : undefined}>
        <View
          style={[styles.backdrop, {backgroundColor: dismissible ? palette.backdrop : 'transparent'}]}
          pointerEvents={dismissible ? 'auto' : 'box-none'}>
          <View style={[styles.card, {backgroundColor: palette.surface, borderColor: accentColor}, shadow]}>
            <View style={[styles.iconWrap, {backgroundColor: `${accentColor}1f`}]}>
              <MaterialCommunityIcons name={meta.icon} size={28} color={accentColor} />
            </View>
            <Text style={[styles.title, {color: palette.text}]}>{notice.title || meta.defaultTitle}</Text>
            <Text style={[styles.message, {color: palette.muted}]}>{notice.message}</Text>
            {dismissible ? (
              <Pressable onPress={hide} style={[styles.button, {backgroundColor: accentColor}]}>
                <Text style={styles.buttonText}>ตกลง</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const context = useContext(NoticeContext);
  if (!context) {
    throw new Error('useNotice must be used within NoticeProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 64,
    paddingHorizontal: 26,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    minWidth: 120,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
