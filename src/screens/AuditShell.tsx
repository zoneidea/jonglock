import React from 'react';
import {SafeAreaView, StyleSheet, Text} from 'react-native';

import {useTheme} from '../theme/theme';
import type {AuditUser} from '../types/user';
import AuditDashboardScreen from './audit/AuditDashboardScreen';
import AuditLoginScreen from './audit/AuditLoginScreen';

const POWERED_BY_TEXT = 'Powered by zone-idea innovation co.,ltd.';

function AuditShell({
  user,
  onAuthenticated,
  onLogout,
  onBackToCustomer,
}: {
  user: AuditUser | null;
  onAuthenticated: (user: AuditUser) => void;
  onLogout: () => void;
  onBackToCustomer: () => void;
}) {
  const {palette} = useTheme();

  return (
    <SafeAreaView style={styles.safe}>
      {user ? (
        <AuditDashboardScreen user={user} onLogout={onLogout} />
      ) : (
        <AuditLoginScreen onAuthenticated={onAuthenticated} onBackToCustomer={onBackToCustomer} />
      )}
      {user ? <Text style={[styles.poweredByText, {color: palette.muted}]}>{POWERED_BY_TEXT}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#08111a',
  },
  poweredByText: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});

export default AuditShell;
