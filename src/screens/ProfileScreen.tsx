import React from 'react';
import {ScrollView, StyleSheet} from 'react-native';

import PlaceholderPanel from '../components/PlaceholderPanel';
import type {MobileUser} from '../types/user';

function ProfileScreen({user, onLogout}: {user: MobileUser; onLogout: () => void}) {
  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <PlaceholderPanel
        title={user.name}
        text={user.email}
        actionLabel="ออกจากระบบ"
        onAction={onLogout}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenScroll: {
    padding: 22,
    paddingBottom: 120,
  },
});

export default ProfileScreen;
