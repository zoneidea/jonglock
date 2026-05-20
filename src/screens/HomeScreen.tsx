import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import PromoCard from '../components/PromoCard';
import {getAnnouncements, type Announcement} from '../services/announcements';
import {colors, shadow} from '../theme/colors';
import type {MobileUser} from '../types/user';

const MOCK_HOME_BANNER: Announcement = {
  id: 0,
  organizationId: 0,
  marketId: null,
  marketCode: '',
  marketName: 'Jonglock',
  type: 'banner',
  title: 'Jonglock Market Operating System',
  description: 'จองบูธ บริหารตลาด และจัดการข่าวสารได้ในระบบเดียว รองรับการเติบโตหลายตลาด',
  imageUrl: '',
  startDate: null,
  endDate: null,
  createdAt: new Date().toISOString(),
};

function HomeScreen({user}: {user: MobileUser | null}) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [banners, setBanners] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [nextBanners, nextItems] = await Promise.all([
        getAnnouncements({type: 'banner', limit: 6}),
        getAnnouncements({type: 'news', limit: 20}),
      ]);
      setBanners(nextBanners);
      setItems(nextItems);
    } catch {
      setBanners([]);
      setMessage('ยังไม่สามารถโหลดข้อมูลหน้าหลักได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const feedItems = useMemo(
    () => items.map((item) => ({...item, relativeTime: formatRelativeTime(item.createdAt || item.startDate || '')})),
    [items],
  );

  const bannerItems = useMemo(() => (banners.length ? banners : [MOCK_HOME_BANNER]), [banners]);

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

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselTrack}>
        {bannerItems.map((item) => (
          <HomeAdCard key={item.id || item.title} banner={item} />
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>ข่าวสารและโปรโมชั่น</Text>
      {message ? <Text style={styles.messageText}>{message}</Text> : null}
      <View style={styles.promoList}>
        {feedItems.map((item) => (
          <PromoCard
            key={item.id}
            title={item.title}
            text={item.description}
            marketName={item.marketName}
            relativeTime={item.relativeTime}
            imageUrl={item.imageUrl}
            type={item.type}
          />
        ))}
        {!loading && feedItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>ยังไม่มีข่าวสารและโปรโมชั่น</Text>
            <Text style={styles.emptyText}>รายการประกาศจากตลาดจะมาแสดงที่หน้านี้</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function HomeAdCard({banner}: {banner: Announcement}) {
  return (
    <View style={styles.bannerCard}>
      {banner.imageUrl ? <Image source={{uri: banner.imageUrl}} style={styles.bannerImage} resizeMode="cover" /> : null}
      {!banner.imageUrl ? (
        <LinearGradient colors={['#071827', '#0d3448', '#14a997']} style={styles.bannerMockBackground}>
          <View style={styles.bannerGlowPrimary} />
          <View style={styles.bannerGlowSecondary} />
        </LinearGradient>
      ) : null}
      <View style={styles.bannerAdsBadge}>
        <Text style={styles.bannerAdsBadgeText}>Ads</Text>
      </View>
      <LinearGradient colors={['transparent', 'rgba(7, 17, 31, 0.88)']} style={styles.bannerOverlay}>
        <Text style={styles.bannerMarketName}>{banner.marketName || 'Jonglock'}</Text>
        <Text style={styles.bannerTitle}>{banner.title}</Text>
        <Text style={styles.bannerDescription} numberOfLines={2}>
          {banner.description || 'พื้นที่สำหรับแสดงโฆษณาหลักของระบบและตลาด'}
        </Text>
      </LinearGradient>
    </View>
  );
}

function formatRelativeTime(input: string) {
  if (!input) {
    return 'เมื่อสักครู่';
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return 'เมื่อสักครู่';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'เมื่อสักครู่';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} นาทีที่แล้ว`;
  }
  if (diffHours < 24) {
    return `${diffHours} ชั่วโมงที่แล้ว`;
  }
  return `${diffDays} วันที่แล้ว`;
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
  carouselTrack: {
    gap: 14,
    paddingRight: 22,
  },
  bannerCard: {
    width: 320,
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...shadow,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerMockBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerGlowPrimary: {
    position: 'absolute',
    right: -26,
    top: 18,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bannerGlowSecondary: {
    position: 'absolute',
    left: 28,
    bottom: 30,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bannerAdsBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    minWidth: 38,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerAdsBadgeText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    minHeight: 98,
    justifyContent: 'flex-end',
  },
  bannerMarketName: {
    color: '#dff8f4',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '900',
  },
  bannerTitle: {
    marginTop: 4,
    color: colors.white,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  bannerDescription: {
    marginTop: 8,
    color: '#dce7ee',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    maxWidth: 236,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  messageText: {
    marginBottom: 12,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  promoList: {
    gap: 12,
  },
  emptyCard: {
    minHeight: 112,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default React.memo(HomeScreen);
