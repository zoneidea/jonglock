import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors} from '../theme/colors';

function ActionItem({title, text}: {title: string; text: string}) {
  return (
    <Pressable style={styles.actionItem}>
      <View style={styles.actionIcon}>
        <Text style={styles.actionIconText}>{title.charAt(0)}</Text>
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText}>{text}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    color: colors.tealDark,
    fontSize: 18,
    fontWeight: '900',
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

export default ActionItem;
