import React from 'react';
import {ScrollView, StyleSheet} from 'react-native';

import PlaceholderPanel from '../components/PlaceholderPanel';

function CartScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <PlaceholderPanel
        title="ตระกร้า"
        text="โครงหน้าจอสรุปรายการที่เลือก รอชำระเงิน และสถานะการจอง"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenScroll: {
    padding: 22,
    paddingBottom: 120,
  },
});

export default CartScreen;
