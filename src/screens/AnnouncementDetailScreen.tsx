import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type {Announcement} from '../services/announcements';
import {colors, shadow} from '../theme/colors';
import {useTheme} from '../theme/theme';

function AnnouncementDetailScreen({
  announcement,
  relativeTime,
  onBack,
}: {
  announcement: Announcement;
  relativeTime: string;
  onBack: () => void;
}) {
  const {palette} = useTheme();
  const fullDate = formatFullDate(announcement.createdAt || announcement.startDate || '');

  return (
    <View style={[styles.screen, {backgroundColor: palette.background}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={onBack}
            style={[
              styles.backButton,
              {backgroundColor: palette.surface, borderColor: palette.border},
            ]}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
            <Text style={[styles.backText, {color: palette.text}]}>กลับ</Text>
          </Pressable>
        </View>

        <View style={[styles.heroCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
          {announcement.imageUrl ? (
            <Image source={{uri: announcement.imageUrl}} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#071827', '#0d3448', '#14a997']} style={styles.heroFallback}>
              <View style={styles.heroGlowPrimary} />
              <View style={styles.heroGlowSecondary} />
              <MaterialCommunityIcons
                name={announcement.type === 'banner' ? 'bullhorn-outline' : 'newspaper-variant-outline'}
                size={42}
                color={colors.white}
              />
            </LinearGradient>
          )}
          <LinearGradient colors={['transparent', 'rgba(7, 17, 31, 0.9)']} style={styles.heroOverlay}>
            <View style={styles.metaRow}>
              <Text style={styles.marketName} numberOfLines={1}>
                {announcement.marketName || 'ข่าวสารจากระบบ'}
              </Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {announcement.type === 'banner' ? 'โปรโมชัน' : 'ข่าวสาร'}
                </Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{announcement.title}</Text>
          </LinearGradient>
        </View>

        <View style={[styles.detailCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
          <View style={styles.detailMetaRow}>
            <View style={styles.detailMetaItem}>
              <Text style={[styles.metaLabel, {color: palette.muted}]}>เผยแพร่</Text>
              <Text style={[styles.metaValue, {color: palette.text}]}>{fullDate || '-'}</Text>
            </View>
            <View style={styles.detailMetaItem}>
              <Text style={[styles.metaLabel, {color: palette.muted}]}>อัปเดต</Text>
              <Text style={[styles.metaValue, {color: palette.text}]}>{relativeTime}</Text>
            </View>
          </View>

          <Text style={[styles.contentTitle, {color: palette.text}]}>รายละเอียด</Text>
          <Text style={[styles.contentText, {color: palette.muted}]}>
            {announcement.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function formatFullDate(value: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: 22,
    paddingBottom: 120,
  },
  headerRow: {
    marginBottom: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 42,
    paddingRight: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  backText: {
    fontSize: 14,
    fontWeight: '900',
  },
  heroCard: {
    height: 340,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadow,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlowPrimary: {
    position: 'absolute',
    right: -26,
    top: -10,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroGlowSecondary: {
    position: 'absolute',
    left: -38,
    bottom: -28,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(20,169,151,0.2)',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 22,
    minHeight: 150,
    justifyContent: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  marketName: {
    flex: 1,
    color: '#dff8f4',
    fontSize: 12,
    fontWeight: '900',
  },
  typeBadge: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
  },
  typeBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  heroTitle: {
    marginTop: 12,
    color: colors.white,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '900',
  },
  detailCard: {
    marginTop: 16,
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
    ...shadow,
  },
  detailMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailMetaItem: {
    flex: 1,
    minHeight: 70,
    borderRadius: 18,
    backgroundColor: '#f5f9fc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  metaValue: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  contentTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: '900',
  },
  contentText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
  },
});

export default AnnouncementDetailScreen;
