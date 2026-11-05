import {Text} from '../AppText';
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, StyleSheet, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type {ReservepayConfig} from '../../services/reservepay';
import {colors} from '../../theme/colors';
import PaymentQrCode from './PaymentQrCode';
import type {PaymentOption} from './paymentMethods';
import {useReservepayCheckout} from './useReservepayCheckout';
import CardTokenModal from './CardTokenModal';

function ReservepayCheckoutPanel({
  config,
  option,
  amountBaht,
  bookingIds,
  organizationId,
  user,
  unavailableReason,
  onBusyChange,
  onPaid,
}: {
  config: ReservepayConfig;
  option: PaymentOption;
  amountBaht: number;
  bookingIds: number[];
  organizationId: number;
  user: {email: string; name?: string} | null;
  /** When set, the pay button is disabled and this text is shown instead. */
  unavailableReason?: string;
  onBusyChange?: (busy: boolean) => void;
  onPaid: () => void;
}) {
  const {state, start, cancel} = useReservepayCheckout();
  const [cardVisible, setCardVisible] = useState(false);
  const cardRequest = useRef<{resolve: (token: string) => void; reject: (error: Error) => void} | null>(null);
  const lastAlert = useRef('');
  useEffect(() => {
    const failed = ['failed', 'expired', 'error'].includes(state.phase);
    if (!failed) {lastAlert.current = ''; return;}
    if (state.message && lastAlert.current !== state.message) {
      lastAlert.current = state.message;
      Alert.alert('การชำระเงิน', state.message, [{text: 'ตกลง'}]);
    }
  }, [state.phase, state.message]);
  useEffect(() => () => {cardRequest.current?.reject(new Error('ปิดฟอร์มบัตร'));}, []);
  const busy = ['starting', 'qr', 'redirect', 'waiting'].includes(state.phase);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Changing the method resets any finished/failed attempt.
  useEffect(() => {
    cancel();
  }, [cancel, option.name]);

  const pay = () => {
    if (!user?.email) {return;}
    start({config, paymentMethod: option.name, amountBaht, bookingIds, organizationId, user, onSuccess: onPaid,
      getCardToken: () => new Promise<string>((resolve, reject) => {cardRequest.current = {resolve, reject}; setCardVisible(true);}),
    });
  };

  if (unavailableReason) {
    return (
      <View style={styles.noticeBox}>
        <MaterialCommunityIcons name="information-outline" size={18} color={colors.tealDark} />
        <Text style={styles.noticeText}>{unavailableReason}</Text>
      </View>
    );
  }

  if (state.phase === 'qr' && state.qrPayload) {
    return (
      <View style={styles.qrBox}>
        <Text style={styles.qrTitle}>สแกนเพื่อชำระด้วย {option.label}</Text>
        <PaymentQrCode value={state.qrPayload} size={220} />
        <Countdown expiresAtMs={state.expiresAtMs} />
        <View style={styles.waitingRow}>
          <ActivityIndicator size="small" color={colors.teal} />
          <Text style={styles.waitingText}>กำลังรอการชำระเงิน…</Text>
        </View>
        <CancelButton onPress={cancel} />
      </View>
    );
  }

  if (state.phase === 'redirect' || state.phase === 'waiting') {
    return (
      <View style={styles.qrBox}>
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={styles.qrTitle}>{state.phase === 'waiting' ? 'กำลังตรวจสอบผลชำระเงิน' : `ทำรายการต่อใน ${option.label}`}</Text>
        <Text style={styles.helperText}>{state.message || 'เมื่อชำระเสร็จแล้ว กลับมาที่ Jonglock ระบบจะอัปเดตสถานะให้อัตโนมัติ'}</Text>
        <CancelButton onPress={cancel} />
      </View>
    );
  }

  if (state.phase === 'success') {
    return (
      <View style={[styles.qrBox, styles.successBox]}>
        <MaterialCommunityIcons name="check-circle" size={42} color={colors.teal} />
        <Text style={styles.qrTitle}>ชำระเงินสำเร็จ</Text>
      </View>
    );
  }

  const failed = state.phase === 'failed' || state.phase === 'expired' || state.phase === 'error';

  return (
    <View style={styles.payBox}>
      <CardTokenModal visible={cardVisible} onToken={token => {cardRequest.current?.resolve(token); cardRequest.current = null; setCardVisible(false);}}
        onCancel={() => {cancel(); cardRequest.current?.reject(new Error('ยกเลิกการกรอกบัตร')); cardRequest.current = null; setCardVisible(false);}} />
      <Pressable
        onPress={pay}
        disabled={busy || !user?.email}
        style={[styles.payButton, (busy || !user?.email) && styles.payButtonDisabled]}>
        {state.phase === 'starting' ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <MaterialCommunityIcons name={option.kind === 'qr' ? 'qrcode' : 'cellphone-arrow-down'} size={19} color={colors.white} />
            <Text style={styles.payButtonText}>{failed ? 'ลองอีกครั้ง' : `ชำระด้วย ${option.label}`}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function CancelButton({onPress}: {onPress: () => void}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.cancelButton}>
      <Text style={styles.cancelText}>พักหน้าชำระเงิน / ตรวจสอบภายหลัง</Text>
    </Pressable>
  );
}

function Countdown({expiresAtMs}: {expiresAtMs?: number | null}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAtMs) {return;}
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAtMs]);
  if (!expiresAtMs) {return null;}
  const seconds = Math.max(0, Math.round((expiresAtMs - now) / 1000));
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return <Text style={styles.countdown}>QR หมดอายุใน {label} นาที</Text>;
}

const styles = StyleSheet.create({
  payBox: {
    gap: 10,
  },
  payButton: {
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.teal,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.soft,
  },
  noticeText: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fdecef',
  },
  errorText: {
    color: colors.danger,
  },
  qrBox: {
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  successBox: {
    borderColor: colors.teal,
  },
  qrTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  helperText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  countdown: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waitingText: {
    color: colors.tealDark,
    fontSize: 13,
    fontWeight: '800',
  },
  cancelButton: {
    paddingVertical: 6,
  },
  cancelText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

export default ReservepayCheckoutPanel;
