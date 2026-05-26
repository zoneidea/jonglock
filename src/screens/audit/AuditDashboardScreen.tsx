import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {fetchAuditSummary} from '../../services/audit';
import type {AuditUser} from '../../types/user';

function AuditDashboardScreen({
  user,
  onLogout,
}: {
  user: AuditUser;
  onLogout: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
  const [loading, setLoading] = useState(Boolean(user.token));
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState({
    totalJobs: 0,
    pendingJobs: 0,
    violationJobs: 0,
    totalFineAmount: 0,
  });

  useEffect(() => {
    if (!user.token) {
      setLoading(false);
      setMessage('ไม่พบ session สำหรับโหลดข้อมูลสรุป');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMessage('');
    fetchAuditSummary({token: user.token, date: selectedDate})
      .then((nextSummary) => {
        if (cancelled) {
          return;
        }
        setSummary({
          totalJobs: nextSummary.totalJobs,
          pendingJobs: nextSummary.pendingJobs,
          violationJobs: nextSummary.violationJobs,
          totalFineAmount: nextSummary.totalFineAmount,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setMessage((error as Error).message || 'ยังไม่สามารถโหลดข้อมูลสรุปได้');
        setSummary({
          totalJobs: 0,
          pendingJobs: 0,
          violationJobs: 0,
          totalFineAmount: 0,
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, user.token]);

  const subtitle = useMemo(
    () => `${user.name} · ${user.staffCode} · ${formatThaiDate(selectedDate)}`,
    [selectedDate, user.name, user.staffCode],
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>AUDIT MODE</Text>
          <Text style={styles.title}>งานตรวจสอบตลาด</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <MaterialCommunityIcons name="logout" size={18} color="#ff95a7" />
        </Pressable>
      </View>

      <View style={styles.dateCard}>
        <View style={styles.dateCardHeader}>
          <Text style={styles.dateCardLabel}>วันที่สรุปข้อมูล</Text>
          <Pressable onPress={() => setSelectedDate(toIsoDate(new Date()))} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>วันนี้</Text>
          </Pressable>
        </View>
        <View style={styles.datePickerRow}>
          <Pressable
            onPress={() => setSelectedDate((currentDate) => shiftIsoDate(currentDate, -1))}
            style={styles.dateNavButton}>
            <MaterialCommunityIcons name="chevron-left" size={20} color="#d8edf5" />
          </Pressable>
          <View style={styles.dateValueWrap}>
            <Text style={styles.dateValue}>{formatThaiDate(selectedDate)}</Text>
          </View>
          <Pressable
            onPress={() => setSelectedDate((currentDate) => shiftIsoDate(currentDate, 1))}
            style={styles.dateNavButton}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#d8edf5" />
          </Pressable>
        </View>
        {message ? <Text style={styles.messageText}>{message}</Text> : null}
      </View>

      <View style={styles.cardRow}>
        <MetricCard label="งานตรวจทั้งหมด" value={loading ? '...' : formatCount(summary.totalJobs)} icon="clipboard-check-outline" />
        <MetricCard label="รอตรวจ" value={loading ? '...' : formatCount(summary.pendingJobs)} icon="clock-time-four-outline" />
      </View>
      <View style={styles.cardRow}>
        <MetricCard label="ผิดกฎ" value={loading ? '...' : formatCount(summary.violationJobs)} icon="alert-outline" />
        <MetricCard label="ค่าปรับรวม" value={loading ? '...' : formatCurrency(summary.totalFineAmount)} icon="cash-multiple" />
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

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftIsoDate(value: string, amount: number) {
  const baseDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) {
    return toIsoDate(new Date());
  }
  baseDate.setDate(baseDate.getDate() + amount);
  return toIsoDate(baseDate);
}

function formatThaiDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatCount(value: number) {
  return value.toLocaleString('th-TH');
}

function formatCurrency(value: number) {
  return `฿${value.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  dateCard: {
    marginBottom: 12,
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#101b27',
    borderWidth: 1,
    borderColor: '#1d3144',
  },
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateCardLabel: {
    color: '#8ea4b8',
    fontSize: 13,
    fontWeight: '800',
  },
  todayButton: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#18354a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: {
    color: '#d8edf5',
    fontSize: 12,
    fontWeight: '900',
  },
  datePickerRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateNavButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#142435',
    borderWidth: 1,
    borderColor: '#284057',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateValueWrap: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: '#0c1622',
    borderWidth: 1,
    borderColor: '#24384c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dateValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  messageText: {
    marginTop: 12,
    color: '#ff95a7',
    fontSize: 12,
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
