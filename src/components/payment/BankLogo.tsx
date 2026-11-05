import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

// Display exact cells from the supplied image without altering the bank artwork.
const cells: Record<string, [number, number]> = {
  'K PLUS': [1, 0], 'MAKE by KBank': [1, 0], 'Bangkok Bank': [0, 0],
  'Krungthai NEXT': [3, 0], 'SCB EASY': [7, 0], krungsri: [4, 1], Paotang: [3, 0],
};
export default function BankLogo({label}: {label: string}) {
  const cell = cells[label];
  return <View style={styles.frame}>
    {cell ? <Image source={require('../../assets/payment-bank-logos.png')} accessible={false}
      style={{position: 'absolute', width: 528, height: 228, left: -cell[0] * 60, top: -cell[1] * 60}} />
      : <Text style={styles.fallback}>{label === 'ttb touch' ? 'ttb' : label}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  frame: {width: 48, height: 48, overflow: 'hidden', borderRadius: 9, backgroundColor: '#eef6f7', alignItems: 'center', justifyContent: 'center'},
  fallback: {fontSize: 20, fontWeight: '800', color: '#115a86'},
});
