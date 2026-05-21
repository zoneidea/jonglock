import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, shadow} from '../theme/colors';
import {useTheme} from '../theme/theme';

type PlaceholderPanelProps = {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

function PlaceholderPanel({title, text, actionLabel, onAction}: PlaceholderPanelProps) {
  const {palette} = useTheme();

  return (
    <View style={[styles.placeholderCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
      <Text style={[styles.eyebrow, {color: palette.accentDark}]}>COMING NEXT</Text>
      <Text style={[styles.placeholderTitle, {color: palette.text}]}>{title}</Text>
      <Text style={[styles.placeholderText, {color: palette.muted}]}>{text}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} style={[styles.actionButton, {backgroundColor: palette.accent}]}>
          <Text style={[styles.actionButtonText, {color: palette.inverseText}]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderCard: {
    minHeight: 360,
    borderRadius: 30,
    padding: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    ...shadow,
  },
  eyebrow: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  placeholderTitle: {
    marginTop: 10,
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
  },
  placeholderText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  actionButton: {
    marginTop: 22,
    height: 50,
    borderRadius: 17,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 22,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '900',
  },
});

export default PlaceholderPanel;
