import React from 'react';
import {ScrollView, StyleSheet} from 'react-native';

import PlaceholderPanel from '../components/PlaceholderPanel';

function BookingScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <PlaceholderPanel
        title="จองบูธ"
        text="โครงหน้าจอสำหรับเลือกตลาด วันที่ขาย ประเภทสินค้า และแผนผังบูธ"
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

export default React.memo(BookingScreen);
