import NetInfo from '@react-native-community/netinfo';
import React, {useState} from 'react';
import {ActivityIndicator, Image, Platform, Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import appIcon from '../assets/app-icon.png';
import {shadow} from '../theme/colors';
import {useTheme} from '../theme/theme';

function OfflineScreen() {
  const {palette, resolvedTheme} = useTheme();
  const [retrying, setRetrying] = useState(false);
  const iconSource = Platform.OS === 'android' ? {uri: 'ic_launcher_round'} : appIcon;

  async function handleRetry() {
    setRetrying(true);
    try {
      await NetInfo.refresh();
      await NetInfo.fetch();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: palette.background}]}>
      <View style={styles.container}>
        <LinearGradient
          colors={resolvedTheme === 'dark' ? ['#102532', '#07131d'] : ['#def8f3', '#f7fbfb']}
          style={[styles.heroCard, {borderColor: palette.border}]}>
          <Image source={iconSource} style={styles.appIcon} resizeMode="cover" />
          <View style={[styles.badge, {backgroundColor: resolvedTheme === 'dark' ? palette.surface : '#ffffff'}]}>
            <MaterialCommunityIcons name="wifi-off" size={16} color={palette.danger} />
            <Text style={[styles.badgeText, {color: palette.danger}]}>ออฟไลน์</Text>
          </View>
          <Text style={[styles.title, {color: palette.text}]}>ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้</Text>
          <Text style={[styles.message, {color: palette.muted}]}>
            ตรวจสอบ Wi-Fi หรือเครือข่ายมือถือ แล้วลองเชื่อมต่อใหม่อีกครั้งเพื่อใช้งาน Jonglock ต่อ
          </Text>

          <Pressable
            onPress={handleRetry}
            disabled={retrying}
            style={[
              styles.retryButton,
              {backgroundColor: palette.accent},
              retrying && styles.retryButtonDisabled,
            ]}>
            {retrying ? (
              <ActivityIndicator color={palette.inverseText} />
            ) : (
              <>
                <MaterialCommunityIcons name="refresh" size={18} color={palette.inverseText} />
                <Text style={[styles.retryText, {color: palette.inverseText}]}>ลองใหม่</Text>
              </>
            )}
          </Pressable>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
    ...shadow,
  },
  appIcon: {
    width: 104,
    height: 104,
    borderRadius: 28,
  },
  badge: {
    marginTop: 18,
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    marginTop: 18,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 22,
    minWidth: 180,
    height: 54,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '900',
  },
});

export default React.memo(OfflineScreen);
