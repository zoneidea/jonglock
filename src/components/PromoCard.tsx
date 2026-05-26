import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import {colors} from '../theme/colors';
import {useTheme} from '../theme/theme';

function PromoCard({
  title,
  text,
  marketName,
  relativeTime,
  imageUrl,
  type,
  onPress,
}: {
  title: string;
  text: string;
  marketName: string;
  relativeTime: string;
  imageUrl?: string;
  type: 'news' | 'banner';
  onPress?: () => void;
}) {
  const {palette} = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.promoCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
      {imageUrl ? (
        <Image source={{uri: imageUrl}} style={styles.coverImage} resizeMode="cover" />
      ) : (
        <View style={[styles.promoMarker, {backgroundColor: palette.surfaceMuted, borderColor: palette.border}]} />
      )}
      <View style={styles.actionCopy}>
        <View style={styles.metaRow}>
          <Text style={[styles.marketName, {color: palette.accentDark}]} numberOfLines={1}>
            {marketName || 'ข่าวสารจากระบบ'}
          </Text>
          <View style={[styles.typeBadge, {backgroundColor: palette.surfaceMuted}]}>
            <Text style={[styles.typeBadgeText, {color: palette.accentDark}]}>
              {type === 'banner' ? 'โปรโมชัน' : 'ข่าวสาร'}
            </Text>
          </View>
        </View>
        <Text style={[styles.actionTitle, {color: palette.text}]}>{title}</Text>
        <Text style={[styles.actionText, {color: palette.muted}]} numberOfLines={2}>
          {text || 'ไม่มีรายละเอียดเพิ่มเติม'}
        </Text>
        <Text style={[styles.timeText, {color: palette.muted}]}>{relativeTime}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  promoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    minHeight: 106,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promoMarker: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: colors.soft,
    borderWidth: 8,
    borderColor: '#d7f2ee',
  },
  coverImage: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: colors.soft,
  },
  actionCopy: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  marketName: {
    flex: 1,
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '800',
  },
  typeBadge: {
    height: 22,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: colors.soft,
    justifyContent: 'center',
  },
  typeBadgeText: {
    color: colors.tealDark,
    fontSize: 10,
    fontWeight: '900',
  },
  actionTitle: {
    marginTop: 6,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  actionText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  timeText: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default PromoCard;
