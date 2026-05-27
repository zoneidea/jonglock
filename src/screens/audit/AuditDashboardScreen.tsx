import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Camera, useCameraDevice, useCameraPermission, useCodeScanner} from 'react-native-vision-camera';

import {
  fetchAuditInspections,
  fetchAuditSummary,
  type AuditInspectionFilter,
  type AuditInspectionItem,
} from '../../services/audit';
import {colors} from '../../theme/colors';
import type {AuditUser} from '../../types/user';

const INSPECTION_FILTERS: Record<AuditInspectionFilter, {title: string; emptyText: string}> = {
  all: {
    title: 'งานตรวจทั้งหมด',
    emptyText: 'ยังไม่มีรายการจองที่ชำระเงินแล้วในวันที่เลือก',
  },
  pending: {
    title: 'รอตรวจ',
    emptyText: 'ไม่มีรายการที่รอตรวจในวันที่เลือก',
  },
  violation: {
    title: 'ผิดกฎ',
    emptyText: 'ไม่มีรายการผิดกฎในวันที่เลือก',
  },
  fine: {
    title: 'รายการค่าปรับ',
    emptyText: 'ไม่มีรายการค่าปรับในวันที่เลือก',
  },
};

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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [inspectionFilter, setInspectionFilter] = useState<AuditInspectionFilter | null>(null);
  const [inspectionItems, setInspectionItems] = useState<AuditInspectionItem[]>([]);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionMessage, setInspectionMessage] = useState('');
  const [summary, setSummary] = useState({
    totalJobs: 0,
    pendingJobs: 0,
    violationJobs: 0,
    totalFineAmount: 0,
  });
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

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

  useEffect(() => {
    if (!inspectionFilter || !user.token) {
      return;
    }

    let cancelled = false;
    setInspectionLoading(true);
    setInspectionMessage('');
    fetchAuditInspections({token: user.token, date: selectedDate, filter: inspectionFilter})
      .then((result) => {
        if (cancelled) {
          return;
        }
        setInspectionItems(result.items);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setInspectionItems([]);
        setInspectionMessage((error as Error).message || 'ยังไม่สามารถโหลดรายการตรวจสอบได้');
      })
      .finally(() => {
        if (!cancelled) {
          setInspectionLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [inspectionFilter, selectedDate, user.token]);

  const subtitle = useMemo(
    () => `${user.name} · ${user.staffCode} · ${formatThaiDate(selectedDate)}`,
    [selectedDate, user.name, user.staffCode],
  );

  async function openScanner() {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setMessage('กรุณาอนุญาตใช้กล้องเพื่อสแกนคิวอาร์โค้ด');
        return;
      }
    }
    setScannerLocked(false);
    setScannerOpen(true);
  }

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128'],
    onCodeScanned: (codes) => {
      if (scannerLocked) {
        return;
      }
      const value = codes[0]?.value;
      if (value) {
        setScannerLocked(true);
        setScannerOpen(false);
        setMessage(`สแกนข้อมูลแล้ว: ${String(value).slice(0, 48)}`);
      }
    },
  });

  function openInspectionList(filter: AuditInspectionFilter) {
    setInspectionFilter(filter);
  }

  function closeInspectionList() {
    setInspectionFilter(null);
    setInspectionItems([]);
    setInspectionMessage('');
  }

  function openScannerFromInspectionList() {
    closeInspectionList();
    setTimeout(() => {
      openScanner();
    }, 0);
  }

  return (
    <View style={styles.flex}>
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
          <MetricCard label="งานตรวจทั้งหมด" value={loading ? '...' : formatCount(summary.totalJobs)} icon="clipboard-check-outline" onPress={() => openInspectionList('all')} />
          <MetricCard label="รอตรวจ" value={loading ? '...' : formatCount(summary.pendingJobs)} icon="clock-time-four-outline" onPress={() => openInspectionList('pending')} />
        </View>
        <View style={styles.cardRow}>
          <MetricCard label="ผิดกฎ" value={loading ? '...' : formatCount(summary.violationJobs)} icon="alert-outline" onPress={() => openInspectionList('violation')} />
          <MetricCard label="ค่าปรับรวม" value={loading ? '...' : formatCurrency(summary.totalFineAmount)} icon="cash-multiple" onPress={() => openInspectionList('fine')} />
        </View>
      </ScrollView>

      <Pressable onPress={openScanner} style={styles.scanFab}>
        <MaterialCommunityIcons name="qrcode-scan" size={28} color="#ffffff" />
      </Pressable>

      <ScannerModal
        visible={scannerOpen}
        device={device}
        hasPermission={hasPermission}
        codeScanner={codeScanner}
        onClose={() => {
          setScannerOpen(false);
          setScannerLocked(false);
        }}
      />
      <InspectionListModal
        visible={Boolean(inspectionFilter)}
        filter={inspectionFilter || 'all'}
        bookingDate={selectedDate}
        items={inspectionItems}
        loading={inspectionLoading}
        message={inspectionMessage}
        onClose={closeInspectionList}
        onOpenScanner={openScannerFromInspectionList}
      />
    </View>
  );
}

function MetricCard({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.metricCard, pressed && styles.metricCardPressed]}>
      <View style={styles.metricIconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color="#7bd7c9" />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Pressable>
  );
}

function InspectionListModal({
  visible,
  filter,
  bookingDate,
  items,
  loading,
  message,
  onClose,
  onOpenScanner,
}: {
  visible: boolean;
  filter: AuditInspectionFilter;
  bookingDate: string;
  items: AuditInspectionItem[];
  loading: boolean;
  message: string;
  onClose: () => void;
  onOpenScanner: () => void;
}) {
  const config = INSPECTION_FILTERS[filter];
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.listScreen}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderTextWrap}>
            <Text style={styles.listEyebrow}>รายการตรวจสอบ</Text>
            <Text style={styles.listTitle}>{config.title}</Text>
            <Text style={styles.listSubtitle}>{formatThaiDate(bookingDate)} · {items.length.toLocaleString('th-TH')} รายการ</Text>
          </View>
          <Pressable onPress={onClose} style={styles.listCloseButton}>
            <MaterialCommunityIcons name="close" size={22} color="#d8edf5" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.listState}>
            <ActivityIndicator color="#7bd7c9" />
            <Text style={styles.listStateText}>กำลังโหลดรายการตรวจสอบ...</Text>
          </View>
        ) : message ? (
          <View style={styles.listState}>
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#ff95a7" />
            <Text style={[styles.listStateText, styles.listStateError]}>{message}</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.bookingItemId)}
            contentContainerStyle={items.length ? styles.inspectionList : styles.listState}
            renderItem={({item}) => (
              <InspectionListItem item={item} onOpenScanner={onOpenScanner} />
            )}
            ListEmptyComponent={(
              <>
                <MaterialCommunityIcons name="clipboard-check-outline" size={34} color="#7bd7c9" />
                <Text style={styles.listStateText}>{config.emptyText}</Text>
              </>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function InspectionListItem({
  item,
  onOpenScanner,
}: {
  item: AuditInspectionItem;
  onOpenScanner: () => void;
}) {
  const checkedIn = Boolean(item.checkedInAt);
  return (
    <View style={styles.inspectionItem}>
      <View style={styles.inspectionItemMain}>
        <View style={styles.inspectionItemTopRow}>
          <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
          <View style={[styles.checkinBadge, checkedIn ? styles.checkinBadgeDone : styles.checkinBadgeWaiting]}>
            <Text style={[styles.checkinBadgeText, checkedIn ? styles.checkinBadgeTextDone : styles.checkinBadgeTextWaiting]}>
              {checkedIn ? 'เช็คอินแล้ว' : 'ยังไม่เช็คอิน'}
            </Text>
          </View>
        </View>
        <Text style={styles.inspectionMeta} numberOfLines={1}>{item.boothName || item.boothCode || '-'}</Text>
        <Text style={styles.inspectionDate}>{formatThaiDate(item.bookingDate)} · {formatAuditStatus(item.auditStatus)}</Text>
      </View>
      <Pressable onPress={onOpenScanner} style={styles.itemScanButton}>
        <MaterialCommunityIcons name="qrcode-scan" size={18} color="#ffffff" />
        <Text style={styles.itemScanButtonText}>สแกน QR</Text>
      </Pressable>
    </View>
  );
}

function ScannerModal({
  visible,
  device,
  hasPermission,
  codeScanner,
  onClose,
}: {
  visible: boolean;
  device: ReturnType<typeof useCameraDevice>;
  hasPermission: boolean;
  codeScanner: ReturnType<typeof useCodeScanner>;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.scannerScreen}>
        <Pressable onPress={onClose} style={styles.scannerClose}>
          <MaterialCommunityIcons name="close" size={24} color={colors.white} />
        </Pressable>
        {device && hasPermission ? (
          <Camera style={StyleSheet.absoluteFill} device={device} isActive={visible} codeScanner={codeScanner} />
        ) : (
          <View style={styles.scannerFallback}>
            <MaterialCommunityIcons name="camera-off-outline" size={46} color={colors.white} />
            <Text style={styles.scannerFallbackText}>ยังไม่พร้อมเปิดกล้อง</Text>
          </View>
        )}
        <View style={styles.scanFrame}>
          <View style={styles.scanCorner} />
          <Text style={styles.scannerHint}>วาง QR Code ให้อยู่ในกรอบ</Text>
        </View>
      </View>
    </Modal>
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

function formatAuditStatus(value: AuditInspectionItem['auditStatus']) {
  if (value === 'pass') {
    return 'ผ่านการตรวจ';
  }
  if (value === 'warning') {
    return 'ตักเตือน';
  }
  if (value === 'failed') {
    return 'ผิดกฎ';
  }
  return 'รอตรวจ';
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: 22,
    paddingBottom: 128,
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
  metricCardPressed: {
    opacity: 0.82,
    transform: [{scale: 0.99}],
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
  scanFab: {
    position: 'absolute',
    left: '50%',
    bottom: 34,
    width: 68,
    height: 68,
    marginLeft: -34,
    borderRadius: 34,
    backgroundColor: '#0da591',
    borderWidth: 5,
    borderColor: '#08111a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0da591',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.34,
    shadowRadius: 20,
    elevation: 14,
  },
  scannerScreen: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  scannerClose: {
    position: 'absolute',
    top: 54,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  scannerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scannerFallbackText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  scanFrame: {
    position: 'absolute',
    left: 44,
    right: 44,
    top: '28%',
    height: 260,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#0da591',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 22,
  },
  scanCorner: {
    position: 'absolute',
    width: 96,
    height: 96,
    top: -2,
    left: -2,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderColor: colors.white,
    borderTopLeftRadius: 30,
  },
  scannerHint: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  listScreen: {
    flex: 1,
    backgroundColor: '#08111a',
  },
  listHeader: {
    paddingTop: 56,
    paddingHorizontal: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1d3144',
    backgroundColor: '#0c1622',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  listHeaderTextWrap: {
    flex: 1,
  },
  listEyebrow: {
    color: '#7bd7c9',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  listTitle: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  listSubtitle: {
    marginTop: 6,
    color: '#9cb0c3',
    fontSize: 13,
    fontWeight: '700',
  },
  listCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#142435',
    borderWidth: 1,
    borderColor: '#284057',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectionList: {
    padding: 16,
    paddingBottom: 32,
  },
  listState: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  listStateText: {
    color: '#9cb0c3',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  listStateError: {
    color: '#ff95a7',
  },
  inspectionItem: {
    minHeight: 112,
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#101b27',
    borderWidth: 1,
    borderColor: '#1d3144',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inspectionItemMain: {
    flex: 1,
    minWidth: 0,
  },
  inspectionItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  checkinBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkinBadgeDone: {
    backgroundColor: '#123f36',
  },
  checkinBadgeWaiting: {
    backgroundColor: '#3f2d12',
  },
  checkinBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  checkinBadgeTextDone: {
    color: '#7bd7c9',
  },
  checkinBadgeTextWaiting: {
    color: '#ffc56d',
  },
  inspectionMeta: {
    marginTop: 10,
    color: '#d8edf5',
    fontSize: 14,
    fontWeight: '900',
  },
  inspectionDate: {
    marginTop: 6,
    color: '#8ea4b8',
    fontSize: 12,
    fontWeight: '800',
  },
  itemScanButton: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#0da591',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  itemScanButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
});

export default AuditDashboardScreen;
