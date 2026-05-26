import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type {AuditUser} from '../../types/user';

function AuditDashboardScreen({
  user,
  onLogout,
}: {
  user: AuditUser;
  onLogout: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>AUDIT MODE</Text>
          <Text style={styles.title}>งานตรวจสอบตลาด</Text>
          <Text style={styles.subtitle}>{user.name} · {user.staffCode}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <MaterialCommunityIcons name="logout" size={18} color="#ff95a7" />
        </Pressable>
      </View>

      <View style={styles.cardRow}>
        <MetricCard label="งานตรวจวันนี้" value="12" icon="clipboard-check-outline" />
        <MetricCard label="รอตรวจ" value="4" icon="clock-time-four-outline" />
      </View>
      <View style={styles.cardRow}>
        <MetricCard label="ผิดกฎ" value="2" icon="alert-outline" />
        <MetricCard label="ค่าปรับวันนี้" value="฿600" icon="cash-multiple" />
      </View>
    </ScrollView>
  );
}

function MetricCard({label, value, icon}: {label: string; value: string; icon: string}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color="#7bd7c9" />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 22,
    paddingBottom: 48,
    backgroundColor: '#08111a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 22,
  },
  eyebrow: {
    color: '#8fc4ff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  title: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    color: '#9cb0c3',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#284057',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0e1824',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    minHeight: 136,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#101b27',
    borderWidth: 1,
    borderColor: '#1d3144',
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#142435',
  },
  metricLabel: {
    marginTop: 18,
    color: '#8ea4b8',
    fontSize: 13,
    fontWeight: '700',
  },
  metricValue: {
    marginTop: 10,
    color: '#ffffff',
    fontSize: 31,
    fontWeight: '900',
  },
});

export default AuditDashboardScreen;
