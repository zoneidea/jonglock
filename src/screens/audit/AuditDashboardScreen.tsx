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
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
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

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>โครงสร้าง Audit แยกจากผู้ใช้งานทั่วไปแล้ว</Text>
        <View style={styles.featureList}>
          <FeatureItem text="เส้นทางเข้าใช้งานอยู่ใต้แท็บโปรไฟล์ของผู้ใช้ทั่วไป" />
          <FeatureItem text="ล็อกอินเจ้าหน้าที่คนละหน้ากับผู้จอง" />
          <FeatureItem text="session และ storage ของ audit แยกคนละชุด" />
          <FeatureItem text="พร้อมต่อยอดเมนูงานตรวจ ประวัติการตรวจ และค่าปรับ" />
        </View>
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

function FeatureItem({text}: {text: string}) {
  return (
    <View style={styles.featureRow}>
      <MaterialCommunityIcons name="check-decagram" size={16} color="#72decc" />
      <Text style={styles.featureText}>{text}</Text>
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
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#284057',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0e1824',
  },
  logoutText: {
    color: '#ffcad3',
    fontWeight: '800',
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
  panel: {
    marginTop: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#1d3144',
    backgroundColor: '#101b27',
    padding: 20,
  },
  panelTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
  },
  featureList: {
    marginTop: 18,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    flex: 1,
    color: '#c7d7e5',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
});

export default AuditDashboardScreen;
