import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import qrcode from 'qrcode-generator';

import ApiLoadingState from '../components/ApiLoadingState';
import {
  checkinBookingItem,
  getCheckinBookings,
  type CheckinBookingItem,
} from '../services/markets';
import {colors, shadow} from '../theme/colors';
import {useTheme} from '../theme/theme';
import type {MobileUser} from '../types/user';

function CheckinScreen({
  user,
  onRequireAuth,
}: {
  user: MobileUser | null;
  onRequireAuth: () => void;
}) {
  const {palette} = useTheme();
  const [items, setItems] = useState<CheckinBookingItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CheckinBookingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingInId, setCheckingInId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const userIdentity = useMemo(
    () => (user?.email ? {email: user.email, name: user.name} : null),
    [user?.email, user?.name],
  );

  const loadItems = useCallback(async () => {
    if (!userIdentity) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      setItems(await getCheckinBookings(userIdentity));
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถโหลดรายการ check-in ได้');
    } finally {
      setLoading(false);
    }
  }, [userIdentity]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadItems();
    } finally {
      setRefreshing(false);
    }
  }, [loadItems]);

  const handleCheckin = useCallback(async (item: CheckinBookingItem) => {
    if (!userIdentity || item.checkedInAt) {
      return;
    }
    setCheckingInId(item.bookingItemId);
    setMessage('');
    try {
      const updatedItem = await checkinBookingItem(item.bookingItemId, userIdentity);
      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.bookingItemId === updatedItem.bookingItemId ? updatedItem : currentItem,
        ),
      );
      setSelectedItem((currentItem) =>
        currentItem?.bookingItemId === updatedItem.bookingItemId ? updatedItem : currentItem,
      );
      setMessage('Check-in สำเร็จ');
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถ check-in ได้');
    } finally {
      setCheckingInId(null);
    }
  }, [userIdentity]);

  if (!userIdentity) {
    return (
      <View style={[styles.screen, {backgroundColor: palette.background}]}>
        <View style={[styles.loginCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
          <MaterialCommunityIcons name="qrcode-scan" size={36} color={palette.accent} />
          <Text style={[styles.loginTitle, {color: palette.text}]}>เข้าสู่ระบบเพื่อ Check-in</Text>
          <Text style={[styles.loginText, {color: palette.muted}]}>
            รายการ Check-in จะแสดงเฉพาะการจองที่ชำระเงินสำเร็จแล้วของบัญชีคุณ
          </Text>
          <Pressable onPress={onRequireAuth} style={[styles.primaryButton, {backgroundColor: palette.accent}]}>
            <Text style={[styles.primaryButtonText, {color: palette.inverseText}]}>เข้าสู่ระบบ / สมัครใช้งาน</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (selectedItem) {
    return (
      <CheckinDetail
        item={selectedItem}
        checkingIn={checkingInId === selectedItem.bookingItemId}
        message={message}
        onBack={() => setSelectedItem(null)}
        onCheckin={() => handleCheckin(selectedItem)}
      />
    );
  }

  return (
    <View style={[styles.screen, {backgroundColor: palette.background}]}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.bookingItemId)}
        renderItem={({item}) => (
          <CheckinCard
            item={item}
            checkingIn={checkingInId === item.bookingItemId}
            onOpen={() => setSelectedItem(item)}
            onCheckin={() => handleCheckin(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.teal} />}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Text style={[styles.eyebrow, {color: palette.accent}]}>CHECK-IN</Text>
            <Text style={[styles.title, {color: palette.text}]}>รายการจองที่ชำระเงินแล้ว</Text>
            <Text style={[styles.subtitle, {color: palette.muted}]}>เรียงจากวันที่ขายใกล้ที่สุดไปไกลที่สุด</Text>
            {message ? <Text style={[styles.messageText, {color: message.includes('สำเร็จ') ? palette.accent : palette.danger}]}>{message}</Text> : null}
          </View>
        )}
        ListEmptyComponent={
          loading ? <ApiLoadingState label="กำลังโหลดรายการ Check-in" /> : <EmptyState />
        }
        ItemSeparatorComponent={CheckinListSeparator}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    </View>
  );
}

function CheckinListSeparator() {
  return <View style={styles.separator} />;
}

const CheckinCard = React.memo(function CheckinCard({
  item,
  checkingIn,
  onOpen,
  onCheckin,
}: {
  item: CheckinBookingItem;
  checkingIn: boolean;
  onOpen: () => void;
  onCheckin: () => void;
}) {
  const checkedIn = Boolean(item.checkedInAt);
  return (
    <Pressable onPress={onOpen} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIcon}>
          <MaterialCommunityIcons name={checkedIn ? 'check-circle-outline' : 'store-check-outline'} size={22} color={checkedIn ? colors.tealDark : colors.teal} />
        </View>
        <View style={styles.itemMain}>
          <Text style={styles.itemTitle}>{item.marketName}</Text>
          <Text style={styles.itemMeta}>{`${formatShortDate(item.bookingDate)} • ${item.boothName || item.boothCode}`}</Text>
        </View>
        <Text style={[styles.itemStatus, checkedIn && styles.itemStatusDone]}>{checkedIn ? 'เช็คอินแล้ว' : 'รอเช็คอิน'}</Text>
      </View>
      <View style={styles.itemFooter}>
        <Text style={styles.itemAmount}>{formatMoney(item.unitPrice)}</Text>
        <View style={styles.itemActions}>
          <Pressable onPress={onOpen} style={styles.secondaryButton}>
            <MaterialCommunityIcons name="file-eye-outline" size={16} color={colors.ink} />
          </Pressable>
          <Pressable
            disabled={checkedIn || checkingIn}
            onPress={onCheckin}
            style={[styles.checkinButton, (checkedIn || checkingIn) && styles.checkinButtonDisabled]}>
            <Text style={styles.checkinButtonText}>{checkingIn ? '...' : 'Check-in'}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

function CheckinDetail({
  item,
  checkingIn,
  message,
  onBack,
  onCheckin,
}: {
  item: CheckinBookingItem;
  checkingIn: boolean;
  message: string;
  onBack: () => void;
  onCheckin: () => void;
}) {
  const {palette} = useTheme();
  const checkedIn = Boolean(item.checkedInAt);
  return (
    <View style={[styles.screen, {backgroundColor: palette.background}]}>
      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.detailHeader}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.ink} />
          </Pressable>
          <Text style={[styles.detailTitle, {color: palette.text}]}>รายละเอียดการจอง</Text>
        </View>

        <View style={[styles.detailCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
          <Text style={[styles.detailPublicId, {color: palette.text}]}>{item.publicId}</Text>
          <InfoRow label="ตลาด" value={item.marketName} />
          <InfoRow label="บูธ" value={item.boothName || item.boothCode} />
          <InfoRow label="วันที่ขาย" value={formatShortDate(item.bookingDate)} />
          <InfoRow label="วันที่ชำระเงิน" value={formatDateTime(item.paidAt)} />
          <InfoRow label="วันที่ Check-in" value={item.checkedInAt ? formatDateTime(item.checkedInAt) : '-'} />
          <InfoRow label="ยอดชำระ" value={formatMoney(item.unitPrice)} />
        </View>

        <BookingQrCode item={item} />

        {message ? <Text style={[styles.messageText, {color: message.includes('สำเร็จ') ? palette.accent : palette.danger}]}>{message}</Text> : null}

        <Pressable
          disabled={checkedIn || checkingIn}
          onPress={onCheckin}
          style={[styles.detailCheckinButton, (checkedIn || checkingIn) && styles.checkinButtonDisabled]}>
          <MaterialCommunityIcons name={checkedIn ? 'check-circle-outline' : 'qrcode-scan'} size={20} color={colors.white} />
          <Text style={styles.detailCheckinText}>
            {checkedIn ? 'Check-in แล้ว' : checkingIn ? 'กำลัง Check-in...' : 'Check-in'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function BookingQrCode({item}: {item: CheckinBookingItem}) {
  const qrPayload = useMemo(() => JSON.stringify({
    type: 'jonglock_checkin',
    version: 1,
    bookingItemId: item.bookingItemId,
    bookingId: item.bookingId,
    publicId: item.publicId,
    organizationId: item.organizationId,
    marketId: item.marketId,
    marketCode: item.marketCode,
    bookingDate: item.bookingDate,
  }), [item.bookingDate, item.bookingId, item.bookingItemId, item.marketCode, item.marketId, item.organizationId, item.publicId]);

  const matrix = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(qrPayload);
    qr.make();
    const count = qr.getModuleCount();
    return Array.from({length: count}, (ignoredRowValue, row) =>
      Array.from({length: count}, (ignoredColumnValue, column) => qr.isDark(row, column)),
    );
  }, [qrPayload]);

  return (
    <View style={styles.qrCard}>
      <View style={styles.qrHeader}>
        <View>
          <Text style={styles.qrTitle}>QR สำหรับตรวจสอบ</Text>
          <Text style={styles.qrSubtitle}>ให้เจ้าหน้าที่สแกนเพื่อยืนยันรายการจอง</Text>
        </View>
        <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.tealDark} />
      </View>
      <View style={styles.qrSurface}>
        {matrix.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.qrRow}>
            {row.map((dark, columnIndex) => (
              <View
                key={`cell-${rowIndex}-${columnIndex}`}
                style={[styles.qrCell, dark ? styles.qrCellDark : styles.qrCellLight]}
              />
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.qrReference}>{item.publicId}</Text>
    </View>
  );
}

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyCard}>
      <MaterialCommunityIcons name="calendar-check-outline" size={34} color={colors.tealDark} />
      <Text style={styles.emptyTitle}>ยังไม่มีรายการสำหรับ Check-in</Text>
      <Text style={styles.emptyText}>รายการที่ชำระเงินสำเร็จแล้วจะแสดงที่นี่</Text>
    </View>
  );
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return '-';
  }
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMoney(value: number) {
  return `฿${Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 22,
    paddingBottom: 118,
  },
  header: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  messageText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '800',
  },
  separator: {
    height: 12,
  },
  itemCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMain: {
    flex: 1,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  itemMeta: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  itemStatus: {
    color: '#b36b00',
    fontSize: 11,
    fontWeight: '900',
  },
  itemStatusDone: {
    color: colors.tealDark,
  },
  itemFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemAmount: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinButton: {
    minWidth: 92,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  checkinButtonDisabled: {
    opacity: 0.55,
  },
  checkinButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  loginCard: {
    margin: 22,
    marginTop: 72,
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    ...shadow,
  },
  loginTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  loginText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCard: {
    minHeight: 180,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    marginTop: 14,
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailContent: {
    padding: 22,
    paddingBottom: 118,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
  },
  detailCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    ...shadow,
  },
  detailPublicId: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  infoRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf3f6',
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  infoValue: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '900',
  },
  qrCard: {
    marginTop: 14,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: 'center',
    ...shadow,
  },
  qrHeader: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  qrTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  qrSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  qrSurface: {
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef3f6',
  },
  qrRow: {
    flexDirection: 'row',
  },
  qrCell: {
    width: 5,
    height: 5,
  },
  qrCellDark: {
    backgroundColor: colors.ink,
  },
  qrCellLight: {
    backgroundColor: colors.white,
  },
  qrReference: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  detailCheckinButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailCheckinText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
});

export default CheckinScreen;
