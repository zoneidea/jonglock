import React, {useCallback, useRef, useState} from 'react';
import {Animated, SafeAreaView, StatusBar, StyleSheet, View} from 'react-native';

import BottomTabItem from '../components/BottomTabItem';
import {colors} from '../theme/colors';
import {TabKey, tabs} from '../types/tabs';
import type {MobileUser} from '../types/user';
import BookingScreen from './BookingScreen';
import CartScreen from './CartScreen';
import HomeScreen from './HomeScreen';
import ProfileScreen from './ProfileScreen';

function AppShell({
  user,
  onLogout,
  onAuthenticated,
  onUserChange,
}: {
  user: MobileUser | null;
  onLogout: () => void;
  onAuthenticated: (user: MobileUser) => void;
  onUserChange: (user: MobileUser) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const changeTab = useCallback((nextTab: TabKey) => {
    if (nextTab === activeTab) {
      return;
    }
    contentOpacity.stopAnimation();
    contentOpacity.setValue(0.94);
    setActiveTab(nextTab);
    requestAnimationFrame(() => {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start();
    });
  }, [activeTab, contentOpacity]);

  function renderTabContent() {
    if (activeTab === 'home') {
      return <HomeScreen user={user} />;
    }
    if (activeTab === 'booking') {
      return <BookingScreen user={user} onRequireAuth={() => changeTab('profile')} />;
    }
    if (activeTab === 'cart') {
      return <CartScreen />;
    }
    return (
      <ProfileScreen
        user={user}
        onLogout={onLogout}
        onAuthenticated={onAuthenticated}
        onUserChange={onUserChange}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Animated.View style={[styles.shellContent, {opacity: contentOpacity}]}>
        {renderTabContent()}
      </Animated.View>
      <View style={styles.bottomBar}>
        {tabs.map((tab) => (
          <BottomTabItem
            key={tab.key}
            item={tab}
            active={tab.key === activeTab}
            onPress={() => changeTab(tab.key)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  shellContent: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 22,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#f5f8fb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    overflow: 'visible',
    shadowColor: '#091827',
    shadowOffset: {width: 0, height: 14},
    shadowOpacity: 0.16,
    shadowRadius: 24,
    zIndex: 20,
    elevation: 20,
  },
});

export default AppShell;
