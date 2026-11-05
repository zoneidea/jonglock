import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, FlatList, Linking, RefreshControl, StyleSheet, Text, View} from 'react-native';

import ApiLoadingState from '../components/ApiLoadingState';
import PromoCard from '../components/PromoCard';
import AnnouncementCarousel from '../components/announcements/AnnouncementCarousel';
import {getAnnouncements, type Announcement} from '../services/announcements';
import {colors} from '../theme/colors';
import {useTheme} from '../theme/theme';
import type {MobileUser} from '../types/user';
import AnnouncementDetailScreen from './AnnouncementDetailScreen';

function HomeScreen({user}: {user: MobileUser | null}) {
  const {palette} = useTheme();
  const [items, setItems] = useState<Announcement[]>([]);
  const [banners, setBanners] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const [nextBanners, nextItems] = await Promise.all([
        getAnnouncements({type: 'banner', limit: 6}),
        getAnnouncements({type: 'news', limit: 20}),
      ]);
      setBanners(nextBanners);
      setItems(nextItems);
    } catch {
      setBanners([]);
      Alert.alert('ข่าวสารตลาด', 'ยังไม่สามารถโหลดข่าวสารได้ กรุณาลองใหม่', [{text: 'ตกลง'}]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAnnouncements();
    } finally {
      setRefreshing(false);
    }
  }, [loadAnnouncements]);

  const feedItems = useMemo(
    () => items.map((item) => ({...item, relativeTime: formatRelativeTime(item.createdAt || item.startDate || '')})),
    [items],
  );


  const renderFeedItem = useCallback(({item}: {item: Announcement & {relativeTime: string}}) => (
    <PromoCard
      title={item.title}
      text={item.description}
      marketName={item.marketName}
      relativeTime={item.relativeTime}
      imageUrl={item.imageUrl}
      type={item.type}
      onPress={() => setSelectedAnnouncement(item)}
    />
  ), []);

  const openBannerMarket = useCallback((announcement: Announcement) => {
    if (!announcement.marketId || !announcement.organizationId) {
      setSelectedAnnouncement(announcement);
      return;
    }
    // Reuse the app's existing market deep-link flow and market detail screen.
    const url = `jonglock://market?organizationId=${encodeURIComponent(announcement.organizationId)}&marketId=${encodeURIComponent(announcement.marketId)}`;
    Linking.openURL(url).catch(() => Alert.alert('ข้อมูลตลาด', 'เปิดรายละเอียดตลาดไม่สำเร็จ กรุณาลองใหม่', [{text: 'ตกลง'}]));
  }, []);

  const renderHeader = useCallback(() => (
    <>
      <View style={styles.homeTopbar}>
        <Text style={[styles.homeHello, {color: palette.text}]}>สวัสดี</Text>
        <Text style={[styles.homeName, {color: palette.text}]} numberOfLines={1}>{user?.name || 'ผู้ใช้งาน'}</Text>
      </View>

      {loading && banners.length === 0 ? (
        <ApiLoadingState label="กำลังโหลดแบนเนอร์" style={styles.bannerLoadingCard} />
      ) : <AnnouncementCarousel items={banners} onPress={openBannerMarket} />}

      <Text style={[styles.sectionTitle, {color: palette.text}]}>ข่าวสารและโปรโมชั่น</Text>
    </>
  ), [banners, loading, openBannerMarket, palette, user]);

  const renderEmptyFeed = useCallback(() => (
    loading ? (
      <ApiLoadingState label="กำลังโหลดข่าวสารและโปรโมชั่น" />
    ) : (
      <View style={[styles.emptyCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
        <Text style={[styles.emptyTitle, {color: palette.text}]}>ยังไม่มีข่าวสารและโปรโมชั่น</Text>
        <Text style={[styles.emptyText, {color: palette.muted}]}>รายการประกาศจากตลาดจะมาแสดงที่หน้านี้</Text>
      </View>
    )
  ), [loading, palette]);

  if (selectedAnnouncement) {
    return (
      <AnnouncementDetailScreen
        announcement={selectedAnnouncement}
        relativeTime={formatRelativeTime(selectedAnnouncement.createdAt || selectedAnnouncement.startDate || '')}
        onBack={() => setSelectedAnnouncement(null)}
      />
    );
  }

  return (
    <FlatList
      data={feedItems}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderFeedItem}
      contentContainerStyle={[styles.homeScroll, {backgroundColor: palette.background}]}
      ItemSeparatorComponent={FeedSeparator}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyFeed}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.accent} />}
      removeClippedSubviews
      initialNumToRender={6}
      maxToRenderPerBatch={8}
      windowSize={5}
    />
  );
}

function FeedSeparator() {
  return <View style={styles.feedSeparator} />;
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
    gap: 16,
    marginBottom: 18,
  },
  homeHello: {
    color: colors.muted,
    fontSize: 15,
    flexShrink: 0,
    fontWeight: '800',
  },
  homeName: {
    flex: 1,
    textAlign: 'right',
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  bannerLoadingCard: {width: '100%', height: 220},
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
  feedSeparator: {
    height: 12,
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
