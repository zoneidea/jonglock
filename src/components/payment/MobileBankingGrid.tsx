import {Text} from '../AppText';
import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BankLogo from './BankLogo';
import type {PaymentOption} from './paymentMethods';
import {colors} from '../../theme/colors';

export default function MobileBankingGrid({options, selected, disabled, onSelect}: {
  options: PaymentOption[]; selected: string; disabled?: boolean; onSelect: (name: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const columns = width >= 336 ? 3 : 2;
  return <View style={styles.grid} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {options.map(option => {
      const active = selected === option.name;
      return <Pressable key={option.name} accessibilityRole="radio" accessibilityLabel={option.label}
        accessibilityState={{selected: active, disabled}} disabled={disabled} onPress={() => onSelect(option.name)}
        style={[styles.cell, {width: width ? (width - 8 * (columns - 1)) / columns : '48%'}, active && styles.active, disabled && styles.disabled]}>
        <BankLogo label={option.label} />
        <Text style={styles.label}>{option.label}</Text>
        {active ? <MaterialCommunityIcons name="check-circle" size={19} color={colors.teal} style={styles.check} /> : null}
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  cell: {minHeight: 106, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white},
  active: {borderColor: colors.teal, backgroundColor: '#f0fbf9'}, disabled: {opacity: 0.55},
  label: {fontSize: 13, fontWeight: '800', textAlign: 'center', color: colors.ink},
  check: {position: 'absolute', top: 5, right: 5},
});
