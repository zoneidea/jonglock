import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors} from '../theme/colors';

function PromoCard({title, text}: {title: string; text: string}) {
  return (
    <Pressable style={styles.promoCard}>
      <View style={styles.promoMarker} />
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText}>{text}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 86,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promoMarker: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.soft,
    borderWidth: 8,
    borderColor: '#d7f2ee',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
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
});

export default PromoCard;
