import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import PromoCard from '../components/PromoCard';
import {getAnnouncements, type Announcement} from '../services/announcements';
import {colors} from '../theme/colors';
import type {MobileUser} from '../types/user';

function HomeScreen({user}: {user: MobileUser | null}) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const nextItems = await getAnnouncements({limit: 20});
      setItems(nextItems);
    } catch {
      setMessage('ยังไม่สามารถโหลดข่าวสารและโปรโมชั่นได้');
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
  sectionTitle: {
    marginTop: 10,
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
