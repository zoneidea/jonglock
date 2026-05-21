import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {colors, shadow} from '../theme/colors';
import {useTheme} from '../theme/theme';

function AppDialog({
  visible,
  icon = 'information-outline',
  title,
  message,
  cancelLabel = 'ยกเลิก',
  confirmLabel = 'ตกลง',
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  icon?: string;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const {palette, resolvedTheme} = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, {backgroundColor: palette.backdrop}]}>
        <View style={[styles.card, {backgroundColor: palette.surface}]}>
          <LinearGradient
            colors={resolvedTheme === 'dark' ? [palette.surfaceMuted, palette.surface] : ['#e4fbf8', '#ffffff']}
            style={styles.iconWrap}>
            <MaterialCommunityIcons name={icon} size={28} color={palette.accentDark} />
          </LinearGradient>
          <Text style={[styles.title, {color: palette.text}]}>{title}</Text>
          <Text style={[styles.message, {color: palette.muted}]}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={[styles.secondaryButton, {borderColor: palette.border, backgroundColor: palette.surfaceMuted}]}>
              <Text style={[styles.secondaryText, {color: palette.text}]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.primaryButton, {backgroundColor: palette.accent}]}>
              <Text style={[styles.primaryText, {color: palette.inverseText}]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 17, 31, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    ...shadow,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    marginTop: 22,
    width: '100%',
    gap: 10,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fbfc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  primaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
});

export default React.memo(AppDialog);
