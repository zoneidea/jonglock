import firebase from '@react-native-firebase/app';
import React, {useRef, useState} from 'react';
import {Animated, SafeAreaView, StatusBar, StyleSheet, View} from 'react-native';

import BottomTabItem from '../components/BottomTabItem';
import {colors, shadow} from '../theme/colors';
import {TabKey, tabs} from '../types/tabs';
import type {MobileUser} from '../types/user';
import BookingScreen from './BookingScreen';
import CartScreen from './CartScreen';
import HomeScreen from './HomeScreen';
import ProfileScreen from './ProfileScreen';

function AppShell({user, onLogout}: {user: MobileUser; onLogout: () => void}) {
  const firebaseApp = firebase.app();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const contentOpacity = useRef(new Animated.Value(1)).current;

  function changeTab(nextTab: TabKey) {
    if (nextTab === activeTab) {
      return;
    }
    Animated.sequence([
      Animated.timing(contentOpacity, {
        toValue: 0.28,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
    setActiveTab(nextTab);
  }

  function renderTabContent() {
    if (activeTab === 'home') {
      return <HomeScreen user={user} firebaseAppName={firebaseApp.name} />;
    }
    if (activeTab === 'booking') {
      return <BookingScreen />;
    }
    if (activeTab === 'cart') {
      return <CartScreen />;
    }
    return <ProfileScreen user={user} onLogout={onLogout} />;
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
    left: 18,
    right: 18,
    bottom: 18,
    height: 76,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    ...shadow,
  },
});

export default AppShell;
