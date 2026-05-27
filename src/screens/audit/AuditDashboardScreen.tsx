import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Camera, useCameraDevice, useCameraPermission, useCodeScanner} from 'react-native-vision-camera';

import {
  fetchAuditInspections,
  fetchAuditInspectionForm,
  fetchAuditSummary,
  saveAuditInspectionCheck,
  type AuditCheckPayload,
  type AuditInspectionForm,
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
  const [selectedInspection, setSelectedInspection] = useState<AuditInspectionItem | null>(null);
  const [inspectionForm, setInspectionForm] = useState<AuditInspectionForm | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState(() => toIsoDate(new Date()));
  const [historyItems, setHistoryItems] = useState<AuditInspectionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState('');
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

  useEffect(() => {
    if (!historyOpen || !user.token) {
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryMessage('');
    fetchAuditInspections({token: user.token, date: historyDate, filter: 'all'})
      .then((result) => {
        if (cancelled) {
          return;
        }
        setHistoryItems(result.items.filter((item) => item.latestCheckedAt || item.auditStatus !== 'pending'));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setHistoryItems([]);
        setHistoryMessage((error as Error).message || 'ยังไม่สามารถโหลดประวัติการตรวจสอบได้');
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [historyDate, historyOpen, user.token]);

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
        openInspectionFormFromScan(String(value));
      }
    },
  });

  function openInspectionFormFromScan(value: string) {
    const bookingItemId = extractBookingItemIdFromScan(value);
    if (!bookingItemId) {
      setMessage('QR Code ไม่ถูกต้อง หรือไม่พบรหัสรายการจอง');
      return;
    }
    if (!user.token) {
      setMessage('ไม่พบ session สำหรับโหลดข้อมูลตรวจสอบ');
      return;
    }

    setMessage('');
    setSelectedInspection(null);
    setInspectionForm(null);
    setFormMessage('');
    setFormLoading(true);
    fetchAuditInspectionForm({token: user.token, bookingItemId})
      .then((form) => {
        setSelectedInspection(form.item);
        setInspectionForm(form);
      })
      .catch((error) => setMessage((error as Error).message || 'ยังไม่สามารถโหลดข้อมูลตรวจสอบจาก QR Code ได้'))
      .finally(() => setFormLoading(false));
  }

  function openInspectionList(filter: AuditInspectionFilter) {
    setInspectionFilter(filter);
  }

  function openHistory() {
    setHistoryDate(selectedDate);
    setHistoryOpen(true);
  }

  function closeInspectionList() {
    setInspectionFilter(null);
    setInspectionItems([]);
    setInspectionMessage('');
  }

  function openInspectionForm(item: AuditInspectionItem) {
    setSelectedInspection(item);
    setInspectionForm(null);
    setFormMessage('');
    if (!user.token) {
      setFormMessage('ไม่พบ session สำหรับโหลดข้อมูลตรวจสอบ');
      return;
    }
    setFormLoading(true);
    fetchAuditInspectionForm({token: user.token, bookingItemId: item.bookingItemId})
      .then(setInspectionForm)
      .catch((error) => setFormMessage((error as Error).message || 'ยังไม่สามารถโหลดข้อมูลตรวจสอบได้'))
      .finally(() => setFormLoading(false));
  }

  function closeInspectionForm() {
    setSelectedInspection(null);
    setInspectionForm(null);
    setFormMessage('');
    setFormSaving(false);
  }

  async function saveInspectionForm(payload: AuditCheckPayload) {
    if (!user.token || !selectedInspection) {
      return;
    }
    setFormSaving(true);
    setFormMessage('');
    try {
      await saveAuditInspectionCheck({
        token: user.token,
        bookingItemId: selectedInspection.bookingItemId,
        payload,
      });
      setFormMessage(payload.fineAmount || payload.accessories.some((item) => item.quantity > 0)
        ? 'บันทึกแล้ว และส่งรายการไปยังตะกร้าลูกค้าแล้ว'
        : 'บันทึกผลการตรวจแล้ว');
      const nextSummary = await fetchAuditSummary({token: user.token, date: selectedDate});
      setSummary({
        totalJobs: nextSummary.totalJobs,
        pendingJobs: nextSummary.pendingJobs,
        violationJobs: nextSummary.violationJobs,
        totalFineAmount: nextSummary.totalFineAmount,
      });
      if (inspectionFilter) {
        const nextList = await fetchAuditInspections({token: user.token, date: selectedDate, filter: inspectionFilter});
        setInspectionItems(nextList.items);
      }
    } catch (error) {
      setFormMessage((error as Error).message || 'ยังไม่สามารถบันทึกผลตรวจได้');
    } finally {
      setFormSaving(false);
    }
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
        <Pressable onPress={openHistory} style={styles.historyButton}>
          <MaterialCommunityIcons name="history" size={20} color="#7bd7c9" />
          <Text style={styles.historyButtonText}>ประวัติการตรวจสอบ</Text>
        </Pressable>
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
        onSelectItem={openInspectionForm}
      />
      <InspectionFormModal
        visible={Boolean(selectedInspection)}
        item={selectedInspection}
        form={inspectionForm}
        loading={formLoading}
        saving={formSaving}
        message={formMessage}
        onClose={closeInspectionForm}
        onSave={saveInspectionForm}
      />
      <InspectionHistoryModal
        visible={historyOpen}
        bookingDate={historyDate}
        items={historyItems}
        loading={historyLoading}
        message={historyMessage}
        onClose={() => setHistoryOpen(false)}
        onChangeDate={setHistoryDate}
        onSelectItem={openInspectionForm}
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
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{value}</Text>
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
  onSelectItem,
}: {
  visible: boolean;
  filter: AuditInspectionFilter;
  bookingDate: string;
  items: AuditInspectionItem[];
  loading: boolean;
  message: string;
  onClose: () => void;
  onSelectItem: (item: AuditInspectionItem) => void;
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
              <InspectionListItem item={item} onPress={() => onSelectItem(item)} />
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
  onPress,
}: {
  item: AuditInspectionItem;
  onPress: () => void;
}) {
  const checkedIn = Boolean(item.checkedInAt);
  const hasViolation = item.auditStatus === 'failed' || item.latestAuditResult === 'failed';
  const reasonText = item.latestAuditNote?.trim();
  const fineAmount = Number(item.latestFineAmount || 0);
  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.inspectionItem, pressed && styles.metricCardPressed]}>
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
        <View style={styles.inspectionDetailRow}>
          <Text style={[styles.inspectionStatusPill, hasViolation ? styles.inspectionStatusDanger : styles.inspectionStatusNormal]}>
            {hasViolation ? 'ทำผิดกฎ' : formatAuditResult(item.latestAuditResult || item.auditStatus)}
          </Text>
          {fineAmount > 0 ? <Text style={styles.inspectionFineText}>{formatCurrency(fineAmount)}</Text> : null}
        </View>
        {reasonText ? <Text style={styles.inspectionReasonText} numberOfLines={2}>เหตุผล: {reasonText}</Text> : null}
      </View>
    </Pressable>
  );
}

function InspectionHistoryModal({
  visible,
  bookingDate,
  items,
  loading,
  message,
  onClose,
  onChangeDate,
  onSelectItem,
}: {
  visible: boolean;
  bookingDate: string;
  items: AuditInspectionItem[];
  loading: boolean;
  message: string;
  onClose: () => void;
  onChangeDate: (date: string) => void;
  onSelectItem: (item: AuditInspectionItem) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.listScreen}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderTextWrap}>
            <Text style={styles.listEyebrow}>ประวัติการตรวจสอบ</Text>
            <Text style={styles.listTitle}>รายการที่ตรวจแล้ว</Text>
            <Text style={styles.listSubtitle}>{formatThaiDate(bookingDate)} · {items.length.toLocaleString('th-TH')} รายการ</Text>
          </View>
          <Pressable onPress={onClose} style={styles.listCloseButton}>
            <MaterialCommunityIcons name="close" size={22} color="#d8edf5" />
          </Pressable>
        </View>

        <View style={styles.historyDatePicker}>
          <Pressable onPress={() => onChangeDate(shiftIsoDate(bookingDate, -1))} style={styles.dateNavButton}>
            <MaterialCommunityIcons name="chevron-left" size={20} color="#d8edf5" />
          </Pressable>
          <View style={styles.historyDateValue}>
            <Text style={styles.historyDateLabel}>วันที่ต้องการดูประวัติ</Text>
            <Text style={styles.historyDateText}>{formatThaiDate(bookingDate)}</Text>
          </View>
          <Pressable onPress={() => onChangeDate(shiftIsoDate(bookingDate, 1))} style={styles.dateNavButton}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#d8edf5" />
          </Pressable>
        </View>
        <Pressable onPress={() => onChangeDate(toIsoDate(new Date()))} style={styles.historyTodayButton}>
          <Text style={styles.historyTodayButtonText}>วันนี้</Text>
        </Pressable>

        {loading ? (
          <View style={styles.listState}>
            <ActivityIndicator color="#7bd7c9" />
            <Text style={styles.listStateText}>กำลังโหลดประวัติการตรวจสอบ...</Text>
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
              <InspectionHistoryItem item={item} onPress={() => onSelectItem(item)} />
            )}
            ListEmptyComponent={(
              <>
                <MaterialCommunityIcons name="history" size={34} color="#7bd7c9" />
                <Text style={styles.listStateText}>ไม่พบประวัติการตรวจสอบในวันที่เลือก</Text>
              </>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function InspectionHistoryItem({item, onPress}: {item: AuditInspectionItem; onPress: () => void}) {
  const hasViolation = item.auditStatus === 'failed' || item.latestAuditResult === 'failed';
  const fineAmount = Number(item.latestFineAmount || 0);
  const reasonText = item.latestAuditNote?.trim() || '-';
  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.historyItem, pressed && styles.metricCardPressed]}>
      <View style={styles.historyItemHeader}>
        <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
        <Text style={[styles.inspectionStatusPill, hasViolation ? styles.inspectionStatusDanger : styles.inspectionStatusNormal]}>
          {hasViolation ? 'ทำผิดกฎ' : formatAuditResult(item.latestAuditResult || item.auditStatus)}
        </Text>
      </View>
      <Text style={styles.inspectionMeta} numberOfLines={1}>{item.boothName || item.boothCode || '-'}</Text>
      <Text style={styles.inspectionReasonText} numberOfLines={2}>เหตุผล: {reasonText}</Text>
      {fineAmount > 0 ? <Text style={styles.historyFineText}>ค่าปรับ {formatCurrency(fineAmount)}</Text> : null}
    </Pressable>
  );
}

function InspectionFormModal({
  visible,
  item,
  form,
  loading,
  saving,
  message,
  onClose,
  onSave,
}: {
  visible: boolean;
  item: AuditInspectionItem | null;
  form: AuditInspectionForm | null;
  loading: boolean;
  saving: boolean;
  message: string;
  onClose: () => void;
  onSave: (payload: AuditCheckPayload) => void;
}) {
  const [result, setResult] = useState<AuditCheckPayload['result']>('pass');
  const [note, setNote] = useState('');
  const [fineAmount, setFineAmount] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!visible || !form) {
      return;
    }
    setResult(form.latestCheck?.result || 'pass');
    setNote(form.latestCheck?.note || '');
    setFineAmount(form.latestCheck?.fineAmount ? String(form.latestCheck.fineAmount) : '');
    setQuantities({});
  }, [form, visible]);

  const accessorySubtotal = useMemo(() => (
    (form?.availableAccessories || []).reduce((sum, accessory) => {
      const quantity = quantities[accessory.id] || 0;
      return sum + (Number(accessory.price || 0) * quantity);
    }, 0)
  ), [form?.availableAccessories, quantities]);
  const fineValue = result === 'failed' ? Number(fineAmount || 0) || 0 : 0;
  const vatAmount = form?.vat.enabled ? roundMoney(((accessorySubtotal + fineValue) * Number(form.vat.rate || 0)) / 100) : 0;
  const totalAmount = roundMoney(accessorySubtotal + fineValue + vatAmount);

  function changeQuantity(accessoryId: number, amount: number) {
    setQuantities((current) => ({
      ...current,
      [accessoryId]: Math.max(0, Math.min(99, (current[accessoryId] || 0) + amount)),
    }));
  }

  function submit() {
    onSave({
      result,
      note,
      fineAmount: fineValue,
      accessories: Object.entries(quantities).map(([accessoryId, quantity]) => ({
        accessoryId: Number(accessoryId),
        quantity,
      })),
    });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.formScreen}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderTextWrap}>
            <Text style={styles.listEyebrow}>บันทึกการตรวจสอบ</Text>
            <Text style={styles.listTitle}>{item?.customerName || 'รายการตรวจสอบ'}</Text>
            <Text style={styles.listSubtitle}>{`${item?.boothName || item?.boothCode || '-'} · ${item?.bookingDate ? formatThaiDate(item.bookingDate) : '-'}`}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.listCloseButton}>
            <MaterialCommunityIcons name="close" size={22} color="#d8edf5" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.listState}>
            <ActivityIndicator color="#7bd7c9" />
            <Text style={styles.listStateText}>กำลังโหลดข้อมูล...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.formContent}>
            {form?.usedAccessories.length ? (
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>บริการเสริมที่ใช้อยู่</Text>
                {form.usedAccessories.map((accessory) => (
                  <View key={accessory.id} style={styles.totalLine}>
                    <Text style={styles.totalLineLabel}>{`${accessory.name} x${accessory.quantity}`}</Text>
                    <Text style={styles.totalLineValue}>{formatCurrency(accessory.lineTotal)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>เพิ่มบริการเสริม</Text>
              {form?.availableAccessories.length ? form.availableAccessories.map((accessory) => (
                <View key={accessory.id} style={styles.accessoryPickRow}>
                  <View style={styles.inspectionItemMain}>
                    <Text style={styles.customerName}>{accessory.name}</Text>
                    <Text style={styles.inspectionDate}>{`${formatCurrency(accessory.price)} / หน่วย`}</Text>
                  </View>
                  <View style={styles.quantityControl}>
                    <Pressable onPress={() => changeQuantity(accessory.id, -1)} style={styles.quantityButton}>
                      <Text style={styles.quantityButtonText}>-</Text>
                    </Pressable>
                    <Text style={styles.quantityValue}>{quantities[accessory.id] || 0}</Text>
                    <Pressable onPress={() => changeQuantity(accessory.id, 1)} style={styles.quantityButton}>
                      <Text style={styles.quantityButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              )) : <Text style={styles.listStateText}>ไม่มีบริการเสริมให้เลือก</Text>}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>ผลการตรวจ</Text>
              <View style={styles.resultRow}>
                {[
                  {key: 'pass', label: 'ไม่ผิดกฎ'},
                  {key: 'warning', label: 'ตักเตือน'},
                  {key: 'failed', label: 'ผิดกฎ'},
                ].map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => setResult(option.key as AuditCheckPayload['result'])}
                    style={[styles.resultChip, result === option.key && styles.resultChipActive]}>
                    <Text style={[styles.resultChipText, result === option.key && styles.resultChipTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="เหตุผล / หมายเหตุ"
                placeholderTextColor="#6d8194"
                multiline
                style={[styles.formInput, styles.noteInput]}
              />
              {result === 'failed' ? (
                <TextInput
                  value={fineAmount}
                  onChangeText={setFineAmount}
                  placeholder="ค่าปรับ"
                  placeholderTextColor="#6d8194"
                  keyboardType="decimal-pad"
                  style={styles.formInput}
                />
              ) : null}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>สรุปยอด</Text>
              <View style={styles.totalLine}><Text style={styles.totalLineLabel}>บริการเสริม</Text><Text style={styles.totalLineValue}>{formatCurrency(accessorySubtotal)}</Text></View>
              <View style={styles.totalLine}><Text style={styles.totalLineLabel}>ค่าปรับ</Text><Text style={styles.totalLineValue}>{formatCurrency(fineValue)}</Text></View>
              {form?.vat.enabled ? <View style={styles.totalLine}><Text style={styles.totalLineLabel}>{`VAT ${form.vat.rate}%`}</Text><Text style={styles.totalLineValue}>{formatCurrency(vatAmount)}</Text></View> : null}
              <View style={[styles.totalLine, styles.grandTotalLine]}><Text style={styles.grandTotalLabel}>ยอดรวม</Text><Text style={styles.grandTotalValue}>{formatCurrency(totalAmount)}</Text></View>
            </View>

            {message ? <Text style={message.includes('ไม่ได้') || message.includes('ไม่สามารถ') ? styles.formErrorText : styles.formSuccessText}>{message}</Text> : null}

            <Pressable onPress={submit} disabled={saving} style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
              <Text style={styles.saveButtonText}>{saving ? 'กำลังบันทึก...' : 'บันทึกการตรวจสอบ'}</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
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

function extractBookingItemIdFromScan(value: string) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return null;
  }

  const pipeParts = rawValue.split('|');
  if (pipeParts[0] === 'JLCHK' && pipeParts[2]) {
    const id = Number(pipeParts[2]);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  try {
    const parsedUrl = new URL(rawValue);
    const id = Number(
      parsedUrl.searchParams.get('bookingItemId')
      || parsedUrl.searchParams.get('booking_item_id')
      || parsedUrl.searchParams.get('itemId'),
    );
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    // Not a URL payload.
  }

  try {
    const parsedJson = JSON.parse(rawValue);
    const id = Number(parsedJson.bookingItemId || parsedJson.booking_item_id || parsedJson.itemId);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    // Not a JSON payload.
  }

  const numericId = Number(rawValue);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
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

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
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

function formatAuditResult(value: AuditInspectionItem['latestAuditResult'] | AuditInspectionItem['auditStatus']) {
  if (value === 'pass') {
    return 'ผ่านการตรวจ';
  }
  if (value === 'warning') {
    return 'ตักเตือน';
  }
  if (value === 'failed') {
    return 'ทำผิดกฎ';
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
  historyButton: {
    minHeight: 52,
    borderRadius: 18,
    marginTop: 4,
    marginBottom: 96,
    backgroundColor: '#0f2a36',
    borderWidth: 1,
    borderColor: '#1d5f61',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  historyButtonText: {
    color: '#d8fff8',
    fontSize: 14,
    fontWeight: '900',
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
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 31,
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
  formScreen: {
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
  inspectionDetailRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  inspectionStatusPill: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '900',
  },
  inspectionStatusNormal: {
    color: '#bff8ea',
    backgroundColor: '#113b38',
  },
  inspectionStatusDanger: {
    color: '#ffe1e6',
    backgroundColor: '#5b1d2b',
  },
  inspectionFineText: {
    color: '#ffd384',
    fontSize: 12,
    fontWeight: '900',
  },
  inspectionReasonText: {
    marginTop: 8,
    color: '#c1d1df',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  historyDatePicker: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyDateValue: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: '#0c1622',
    borderWidth: 1,
    borderColor: '#24384c',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  historyDateLabel: {
    color: '#7f94a8',
    fontSize: 11,
    fontWeight: '800',
  },
  historyDateText: {
    marginTop: 4,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  historyTodayButton: {
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#142435',
    borderWidth: 1,
    borderColor: '#284057',
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  historyTodayButtonText: {
    color: '#d8edf5',
    fontSize: 12,
    fontWeight: '900',
  },
  historyItem: {
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
    backgroundColor: '#101b27',
    borderWidth: 1,
    borderColor: '#1d3144',
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  historyFineText: {
    marginTop: 10,
    color: '#ffd384',
    fontSize: 13,
    fontWeight: '900',
  },
  formContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },
  formSection: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#101b27',
    borderWidth: 1,
    borderColor: '#1d3144',
  },
  formSectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  accessoryPickRow: {
    minHeight: 66,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#0c1622',
    borderWidth: 1,
    borderColor: '#20364a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#18354a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: '#d8edf5',
    fontSize: 18,
    fontWeight: '900',
  },
  quantityValue: {
    minWidth: 24,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  resultChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c1622',
    borderWidth: 1,
    borderColor: '#20364a',
  },
  resultChipActive: {
    backgroundColor: '#0da591',
    borderColor: '#7bd7c9',
  },
  resultChipText: {
    color: '#9cb0c3',
    fontSize: 12,
    fontWeight: '900',
  },
  resultChipTextActive: {
    color: '#ffffff',
  },
  formInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#20364a',
    backgroundColor: '#0c1622',
    color: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '800',
  },
  noteInput: {
    minHeight: 92,
    paddingTop: 12,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  totalLine: {
    minHeight: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  totalLineLabel: {
    flex: 1,
    color: '#9cb0c3',
    fontSize: 13,
    fontWeight: '800',
  },
  totalLineValue: {
    color: '#d8edf5',
    fontSize: 13,
    fontWeight: '900',
  },
  grandTotalLine: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#20364a',
  },
  grandTotalLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  grandTotalValue: {
    color: '#7bd7c9',
    fontSize: 20,
    fontWeight: '900',
  },
  formErrorText: {
    color: '#ff95a7',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  formSuccessText: {
    color: '#7bd7c9',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#0da591',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.58,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
});

export default AuditDashboardScreen;
