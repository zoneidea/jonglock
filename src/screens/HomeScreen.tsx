import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import ActionItem from '../components/ActionItem';
import PromoCard from '../components/PromoCard';
import {colors, shadow} from '../theme/colors';
import type {MobileUser} from '../types/user';

function HomeScreen({user, firebaseAppName}: {user: MobileUser | null; firebaseAppName: string}) {
  const stats = useMemo(
    () => [
      {label: 'ตลาดเปิดจอง', value: '2'},
      {label: 'บูธพร้อมจอง', value: '46'},
      {label: 'รายการของฉัน', value: '3'},
    ],
    [],
  );

  return (
    <ScrollView contentContainerStyle={styles.homeScroll}>
      <View style={styles.homeTopbar}>
        <View>
          <Text style={styles.homeHello}>สวัสดี</Text>
          <Text style={styles.homeName}>{user?.name || 'ผู้ใช้งาน'}</Text>
        </View>
        <View style={styles.userChip}>
          <Text style={styles.userChipText}>{user ? 'Gmail' : 'Guest'}</Text>
        </View>
      </View>

      <LinearGradient colors={['#ffffff', '#dff8f4']} style={styles.bannerCard}>
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerBadgeText}>MARKET READY</Text>
        </View>
        <Text style={styles.bannerTitle}>เลือกพื้นที่ขายได้ง่ายในไม่กี่ขั้นตอน</Text>
        <Text style={styles.bannerText}>
          โครงสำหรับแสดงแคมเปญหลัก ข่าวประกาศ หรือโปรโมชันสำคัญของตลาด
        </Text>
        <View style={styles.bannerVisual}>
          <View style={styles.bannerBoothLarge} />
          <View style={styles.bannerBoothSmall} />
          <View style={styles.bannerBoothSmallAlt} />
        </View>
      </LinearGradient>

      <View style={styles.statGrid}>
        {stats.map((item) => (
          <View key={item.label} style={styles.statCard}>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>ข่าวสารและโปรโมชั่น</Text>
      <View style={styles.promoList}>
        <PromoCard title="ข่าวสารตลาด" text="พื้นที่สำหรับแสดงประกาศล่าสุดจากระบบจัดการ" />
        <PromoCard title="โปรโมชั่น" text="พื้นที่สำหรับคูปอง ส่วนลด และแคมเปญของตลาด" />
      </View>

      <Text style={styles.sectionTitle}>เมนูหลัก</Text>
      <View style={styles.actionList}>
        <ActionItem title="Firebase พร้อมใช้งาน" text={`Default app: ${firebaseAppName}`} />
        <ActionItem title="ค้นหาตลาด" text="ดูตลาดที่เปิดจองและวันที่พร้อมขาย" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  homeScroll: {
    padding: 22,
    paddingBottom: 120,
  },
  homeTopbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  homeHello: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  homeName: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
  },
  userChip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  userChipText: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
  },
  bannerCard: {
    minHeight: 230,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  bannerBadgeText: {
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bannerTitle: {
    marginTop: 14,
    color: colors.ink,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    maxWidth: 270,
  },
  bannerText: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    maxWidth: 250,
  },
  bannerVisual: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 116,
    height: 116,
  },
  bannerBoothLarge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: colors.teal,
    opacity: 0.18,
  },
  bannerBoothSmall: {
    position: 'absolute',
    left: 4,
    top: 8,
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.navy,
    opacity: 0.1,
  },
  bannerBoothSmallAlt: {
    position: 'absolute',
    left: 22,
    bottom: 10,
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.gold,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
  },
  statValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 26,
    marginBottom: 12,
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  promoList: {
    gap: 12,
  },
  actionList: {
    gap: 12,
  },
});

export default React.memo(HomeScreen);
