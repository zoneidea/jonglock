import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, InteractionManager, SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';

import BottomTabItem from '../components/BottomTabItem';
import {getCartBookings} from '../services/markets';
import {colors} from '../theme/colors';
import {useTheme} from '../theme/theme';
import {TabKey, tabs} from '../types/tabs';
import type {MobileUser} from '../types/user';
import BookingScreen from './BookingScreen';
import CartScreen from './CartScreen';
import CheckinScreen from './CheckinScreen';
import HomeScreen from './HomeScreen';
import ProfileScreen from './ProfileScreen';

const POWERED_BY_TEXT = 'Powered by zone-idea innovation co.,ltd.';

function AppShell({
  user,
  onLogout,
  onAuthenticated,
  onUserChange,
  onOpenAuditPortal,
}: {
  user: MobileUser | null;
  onLogout: () => void;
  onAuthenticated: (user: MobileUser) => void;
  onUserChange: (user: MobileUser) => void;
  onOpenAuditPortal: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [renderedTab, setRenderedTab] = useState<TabKey>('home');
  const [bookingTabHidden, setBookingTabHidden] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const transitionTaskRef = useRef<{cancel: () => void} | null>(null);
  const {palette, resolvedTheme} = useTheme();

  const refreshCartCount = useCallback(async () => {
    if (!user?.email) {
      setCartItemCount(0);
      return;
    }
    try {
      const bookings = await getCartBookings({email: user.email, name: user.name});
      setCartItemCount(bookings.length);
    } catch {
      setCartItemCount(0);
    }
  }, [user]);

  React.useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

  useEffect(() => () => {
    transitionTaskRef.current?.cancel();
  }, []);

  const changeTab = useCallback((nextTab: TabKey) => {
    if (nextTab === activeTab) {
      return;
    }
    contentOpacity.stopAnimation();
    contentOpacity.setValue(0.94);
    setActiveTab(nextTab);
    transitionTaskRef.current?.cancel();
    transitionTaskRef.current = InteractionManager.runAfterInteractions(() => {
      setRenderedTab(nextTab);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start();
    });
  }, [activeTab, contentOpacity]);

  function renderTabContent() {
    if (renderedTab === 'home') {
      return <HomeScreen user={user} />;
    }
    if (renderedTab === 'booking') {
      return (
        <BookingScreen
          user={user}
          onRequireAuth={() => changeTab('profile')}
          onBottomTabHiddenChange={setBookingTabHidden}
          onCartChanged={refreshCartCount}
          onOpenCart={() => changeTab('cart')}
        />
      );
    }
    if (renderedTab === 'cart') {
      return <CartScreen user={user} onCountChange={setCartItemCount} />;
    }
    if (renderedTab === 'checkin') {
      return <CheckinScreen user={user} onRequireAuth={() => changeTab('profile')} />;
    }
    return (
      <ProfileScreen
        user={user}
        onLogout={onLogout}
        onAuthenticated={onAuthenticated}
        onUserChange={onUserChange}
        onOpenAuditPortal={onOpenAuditPortal}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: palette.background}]}>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={palette.background}
      />
      <Animated.View style={[styles.shellContent, {opacity: contentOpacity}]}>
        {renderTabContent()}
      </Animated.View>
      {!(activeTab === 'booking' && bookingTabHidden) ? (
        <>
          <View style={[styles.bottomBar, {backgroundColor: palette.surface, borderColor: palette.border}]}>
            {tabs.map((tab) => (
              <BottomTabItem
                key={tab.key}
                item={tab}
                active={tab.key === activeTab}
                badgeCount={tab.key === 'cart' ? cartItemCount : 0}
                onPress={() => changeTab(tab.key)}
              />
            ))}
          </View>
          <Text style={[styles.poweredByText, {color: palette.muted}]}>{POWERED_BY_TEXT}</Text>
        </>
      ) : null}
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
  poweredByText: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
    zIndex: 19,
  },
});

export default AppShell;
