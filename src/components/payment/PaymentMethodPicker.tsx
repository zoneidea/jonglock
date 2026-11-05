import {Text} from '../AppText';
import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {colors} from '../../theme/colors';
import MobileBankingGrid from './MobileBankingGrid';
import type {PaymentOption} from './paymentMethods';

export const MANUAL_TRANSFER_OPTION = 'MANUAL_TRANSFER';

/**
 * Payment channel list:
 *   PromptPay QR / WeChat Pay / Alipay / TrueMoney / Card
 *   Mobile banking  ->  K PLUS, Bangkok Bank, ttb touch, MAKE by KBank, Krungthai NEXT, SCB EASY, krungsri, Paotang
 * Only channels enabled for this app's ReservePay installation are passed in.
 */
function PaymentMethodPicker({
  primary,
  banking,
  manualAvailable,
  selected,
  disabled,
  onSelect,
}: {
  primary: PaymentOption[];
  banking: PaymentOption[];
  manualAvailable: boolean;
  selected: string;
  disabled?: boolean;
  onSelect: (name: string) => void;
}) {
  const bankingSelected = banking.some((option) => option.name === selected);
  const [bankingOpen, setBankingOpen] = useState(bankingSelected);

  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {primary.map((option) => (
        <MethodRow
          key={option.name}
          icon={option.icon}
          label={option.label}
          badge={option.comingSoon ? 'เร็ว ๆ นี้' : undefined}
          selected={selected === option.name}
          disabled={disabled || option.comingSoon}
          onPress={() => onSelect(option.name)}
        />
      ))}

      {banking.length > 0 ? (
        <>
          <Pressable
            onPress={() => setBankingOpen((open) => !open)}
            disabled={disabled}
            style={[styles.row, bankingSelected && styles.rowGroupActive]}
            accessibilityRole="button"
            accessibilityState={{expanded: bankingOpen}}>
            <View style={[styles.iconWrap, bankingSelected && styles.iconWrapActive]}>
              <MaterialCommunityIcons name="cellphone-text" size={18} color={bankingSelected ? colors.white : colors.tealDark} />
            </View>
            <Text style={styles.label}>โมบายแบงกิ้ง</Text>
            <MaterialCommunityIcons name={bankingOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
          </Pressable>
          {bankingOpen ? (
            <MobileBankingGrid options={banking} selected={selected} disabled={disabled} onSelect={onSelect} />
          ) : null}
        </>
      ) : null}

      {manualAvailable ? (
        <MethodRow
          icon="bank-transfer"
          label="โอนเงินเข้าบัญชีตลาด / แนบสลิป"
          selected={selected === MANUAL_TRANSFER_OPTION}
          disabled={disabled}
          onPress={() => onSelect(MANUAL_TRANSFER_OPTION)}
        />
      ) : null}
    </View>
  );
}

function MethodRow({
  icon,
  label,
  badge,
  selected,
  disabled,
  compact,
  onPress,
}: {
  icon: string;
  label: string;
  badge?: string;
  selected: boolean;
  disabled?: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.row, compact && styles.rowCompact, selected && styles.rowSelected, disabled && !selected && styles.rowDisabled]}
      accessibilityRole="radio"
      accessibilityState={{selected, disabled}}>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <MaterialCommunityIcons name="check" size={14} color={colors.white} /> : null}
      </View>
      {!compact ? (
        <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
          <MaterialCommunityIcons name={icon} size={18} color={selected ? colors.white : colors.tealDark} />
        </View>
      ) : null}
      <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  rowCompact: {
    minHeight: 44,
    borderRadius: 13,
  },
  rowSelected: {
    borderColor: colors.teal,
    backgroundColor: '#f0fbf9',
  },
  rowGroupActive: {
    borderColor: colors.teal,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#b8c7d3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  radioSelected: {
    borderColor: colors.tealDark,
    backgroundColor: colors.teal,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.soft,
  },
  iconWrapActive: {
    backgroundColor: colors.teal,
  },
  label: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  labelCompact: {
    fontSize: 14,
    fontWeight: '800',
  },
  subList: {
    marginLeft: 22,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.soft,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.gold,
  },
  badgeText: {
    color: '#7a5418',
    fontSize: 11,
    fontWeight: '900',
  },
});

export default React.memo(PaymentMethodPicker);
