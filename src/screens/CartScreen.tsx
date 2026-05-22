import React, {useCallback, useEffect, useState} from 'react';
import {Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppDialog from '../components/AppDialog';
import ApiLoadingState from '../components/ApiLoadingState';
import PlaceholderPanel from '../components/PlaceholderPanel';
import {
  cancelCartBooking,
  getBookingPaymentInfo,
  getCartBookings,
  type BookingPaymentInfo,
  type CartBooking,
  uploadBookingPaymentProof,
} from '../services/markets';
import {colors, shadow} from '../theme/colors';
import {useTheme} from '../theme/theme';
import type {MobileUser} from '../types/user';

function CartScreen({
  user,
  onCountChange,
}: {
  user: MobileUser | null;
  onCountChange?: (count: number) => void;
}) {
  const {palette} = useTheme();
  const [bookings, setBookings] = useState<CartBooking[]>([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CartBooking | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<number | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<CartBooking | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<BookingPaymentInfo | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [proofImage, setProofImage] = useState<{uri: string; name?: string; type?: string} | null>(null);
  const [providerReference, setProviderReference] = useState('');
  const [payerNote, setPayerNote] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [message, setMessage] = useState('');

  const loadCart = useCallback(async () => {
    if (!user?.email) {
      setBookings([]);
      onCountChange?.(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const nextBookings = await getCartBookings({email: user.email, name: user.name});
      setBookings(nextBookings);
      setSelectedBookingIds((current) =>
        current.filter((bookingId) => nextBookings.some((booking) => booking.bookingId === bookingId)),
      );
      onCountChange?.(nextBookings.length);
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถโหลดตะกร้าได้');
    } finally {
      setLoading(false);
    }
  }, [onCountChange, user]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCart();
    } finally {
      setRefreshing(false);
    }
  }, [loadCart]);

  const toggleBookingSelection = useCallback((bookingId: number) => {
    setSelectedBookingIds((current) =>
      current.includes(bookingId)
        ? current.filter((item) => item !== bookingId)
        : [...current, bookingId],
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedBookingIds((current) =>
      current.length === bookings.length ? [] : bookings.map((booking) => booking.bookingId),
    );
  }, [bookings]);

  const selectedCount = selectedBookingIds.length;
  const allSelected = bookings.length > 0 && selectedCount === bookings.length;

  const handleCancelBooking = useCallback(async () => {
    if (!cancelTarget || !user?.email) {
      return;
    }
    setCancellingBookingId(cancelTarget.bookingId);
    setMessage('');
    try {
      await cancelCartBooking(cancelTarget.bookingId, {email: user.email, name: user.name});
      setCancelTarget(null);
      setMessage('ยกเลิกรายการนี้แล้ว');
      await loadCart();
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถยกเลิกรายการได้');
    } finally {
      setCancellingBookingId(null);
    }
  }, [cancelTarget, loadCart, user?.email, user?.name]);

  const openPayment = useCallback(async (booking: CartBooking) => {
    if (!user?.email) {
      return;
    }
    setPaymentTarget(booking);
    setPaymentInfo(null);
    setProofImage(null);
    setProviderReference('');
    setPayerNote('');
    setPaymentLoading(true);
    setMessage('');
    try {
      const info = await getBookingPaymentInfo(booking.bookingId, {email: user.email, name: user.name});
      setPaymentInfo(info);
      setProviderReference(info.payment?.providerReference || '');
      setPayerNote(info.payment?.payerNote || '');
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถโหลดข้อมูลชำระเงินได้');
      setPaymentTarget(null);
    } finally {
      setPaymentLoading(false);
    }
  }, [user]);

  const closePayment = useCallback(() => {
    if (uploadingProof) {
      return;
    }
    setPaymentTarget(null);
    setPaymentInfo(null);
    setProofImage(null);
    setProviderReference('');
    setPayerNote('');
  }, [uploadingProof]);

  const chooseProofImage = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.9,
    });
    if (result.didCancel) {
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setMessage('ไม่พบไฟล์รูปภาพที่เลือก');
      return;
    }
    setProofImage({
      uri: asset.uri,
      name: asset.fileName || 'payment-proof.jpg',
      type: asset.type || 'image/jpeg',
    });
  }, []);

  const submitProof = useCallback(async () => {
    if (!paymentTarget || !user?.email) {
      return;
    }
    if (!proofImage) {
      setMessage('กรุณาเลือกรูปสลิปก่อนอัปโหลด');
      return;
    }
    setUploadingProof(true);
    setMessage('');
    try {
      await uploadBookingPaymentProof(
        paymentTarget.bookingId,
        {email: user.email, name: user.name},
        proofImage,
        {providerReference, payerNote},
      );
      closePayment();
      setMessage('ส่งหลักฐานการชำระเงินแล้ว กรุณารอการตรวจสอบ');
      await loadCart();
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถอัปโหลดหลักฐานได้');
    } finally {
      setUploadingProof(false);
    }
  }, [closePayment, loadCart, payerNote, paymentTarget, proofImage, providerReference, user]);

  if (!user) {
    return (
      <ScrollView
        contentContainerStyle={[styles.screenScroll, {backgroundColor: palette.background}]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.accent} />}>
        <PlaceholderPanel
          title="ตะกร้า"
          text="กรุณาเข้าสู่ระบบด้วย Gmail เพื่อดูรายการจองที่รอชำระเงิน"
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screenScroll, {backgroundColor: palette.background}]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.accent} />}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, {color: palette.text}]}>ตะกร้า</Text>
          <Text style={[styles.subtitle, {color: palette.muted}]}>รายการจองที่รอชำระเงิน</Text>
        </View>
        <Pressable onPress={handleRefresh} style={[styles.refreshButton, {backgroundColor: palette.surface, borderColor: palette.border}]}>
          <MaterialCommunityIcons name="refresh" size={20} color={palette.accentDark} />
        </Pressable>
      </View>

      {!loading && bookings.length > 0 ? (
        <View style={styles.selectionBar}>
          <Pressable onPress={toggleSelectAll} style={styles.selectAllButton}>
            <View style={[styles.checkbox, {borderColor: palette.border, backgroundColor: palette.surface}, allSelected && [styles.checkboxActive, {backgroundColor: palette.accent, borderColor: palette.accent}]]}>
              {allSelected ? (
                <MaterialCommunityIcons name="check" size={14} color={palette.inverseText} />
              ) : null}
            </View>
            <Text style={[styles.selectAllText, {color: palette.text}]}>{allSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}</Text>
          </Pressable>
          <Text style={[styles.selectionCountText, {color: palette.muted}]}>{`เลือกแล้ว ${selectedCount} รายการ`}</Text>
        </View>
      ) : null}

      {message ? <Text style={[styles.messageText, {color: palette.danger}]}>{message}</Text> : null}

      {loading ? (
        <ApiLoadingState label="กำลังโหลดตะกร้า" />
      ) : null}

      {!loading && bookings.length === 0 ? (
        <View style={[styles.emptyCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
          <MaterialCommunityIcons name="cart-outline" size={34} color={palette.accentDark} />
          <Text style={[styles.emptyTitle, {color: palette.text}]}>ยังไม่มีรายการรอชำระเงิน</Text>
          <Text style={[styles.emptyText, {color: palette.muted}]}>รายการที่จองแล้วแต่ยังไม่ชำระเงินจะแสดงที่นี่</Text>
        </View>
      ) : null}

      <View style={styles.bookingList}>
        {bookings.map((booking) => (
          <CartBookingCard
            key={booking.bookingId}
            booking={booking}
            selected={selectedBookingIds.includes(booking.bookingId)}
            onToggleSelect={() => toggleBookingSelection(booking.bookingId)}
            onCancel={() => setCancelTarget(booking)}
            onPay={() => openPayment(booking)}
            cancelling={cancellingBookingId === booking.bookingId}
          />
        ))}
      </View>

      <AppDialog
        visible={Boolean(cancelTarget)}
        icon="trash-can-outline"
        title="ยกเลิกรายการในตะกร้า"
        message={cancelTarget ? `ต้องการยกเลิก ${cancelTarget.publicId} ใช่หรือไม่ รายการนี้จะถูกบันทึกเป็นสถานะยกเลิกของลูกค้า` : ''}
        cancelLabel="ไม่ยกเลิก"
        confirmLabel={cancellingBookingId ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
        onCancel={() => {
          if (!cancellingBookingId) {
            setCancelTarget(null);
          }
        }}
        onConfirm={handleCancelBooking}
      />

      <PaymentProofModal
        visible={Boolean(paymentTarget)}
        booking={paymentTarget}
        paymentInfo={paymentInfo}
        loading={paymentLoading}
        proofImage={proofImage}
        providerReference={providerReference}
        payerNote={payerNote}
        uploading={uploadingProof}
        onClose={closePayment}
        onChooseImage={chooseProofImage}
        onChangeProviderReference={setProviderReference}
        onChangePayerNote={setPayerNote}
        onSubmit={submitProof}
      />
    </ScrollView>
  );
}

function CartBookingCard({
  booking,
  selected,
  onToggleSelect,
  onCancel,
  onPay,
  cancelling,
}: {
  booking: CartBooking;
  selected: boolean;
  onToggleSelect: () => void;
  onCancel: () => void;
  onPay: () => void;
  cancelling: boolean;
}) {
  const isProcessing = booking.status === 'payment_processing';
  return (
    <Pressable onPress={onToggleSelect} style={[styles.bookingCard, selected && styles.bookingCardSelected]}>
      <View style={styles.cardTopRow}>
        <Pressable onPress={onToggleSelect} style={styles.checkboxWrap}>
          <View style={[styles.checkbox, selected && styles.checkboxActive]}>
            {selected ? (
              <MaterialCommunityIcons name="check" size={14} color={colors.white} />
            ) : null}
          </View>
        </Pressable>
        {booking.marketImageUrl ? (
          <Image source={{uri: booking.marketImageUrl}} style={styles.marketImage} />
        ) : (
          <View style={[styles.marketImage, styles.marketImageFallback]}>
            <MaterialCommunityIcons name="storefront-outline" size={24} color={colors.tealDark} />
          </View>
        )}
        <View style={styles.cardTitleWrap}>
          <Text style={styles.marketName} numberOfLines={1}>{booking.marketName}</Text>
          <Text style={styles.bookingCode}>{booking.publicId}</Text>
          <Text style={styles.expiresText}>{`หมดเวลา ${formatShortDateTime(booking.expiresAt)}`}</Text>
        </View>
        <View style={styles.cardActions}>
          <View style={[styles.statusPill, isProcessing && styles.statusPillProcessing]}>
            <Text style={[styles.statusText, isProcessing && styles.statusTextProcessing]}>
              {isProcessing ? 'รอตรวจสลิป' : 'รอชำระ'}
            </Text>
          </View>
          <Pressable onPress={onCancel} disabled={cancelling} style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}>
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <View style={styles.itemList}>
        {booking.items.slice(0, 3).map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemText}>{`${formatShortDate(item.bookingDate)} • ${item.boothName || item.boothCode}`}</Text>
            <Text style={styles.itemPrice}>{formatMoney(item.unitPrice)}</Text>
          </View>
        ))}
        {booking.items.length > 3 ? (
          <Text style={styles.moreText}>{`และอีก ${booking.items.length - 3} รายการ`}</Text>
        ) : null}
      </View>

      {booking.accessories.length ? (
        <Text style={styles.accessoryText}>
          {`บริการเสริม: ${booking.accessories.map((item) => `${item.name} x${item.quantity || 0}`).join(', ')}`}
        </Text>
      ) : null}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>ยอดชำระ</Text>
        <Text style={styles.totalValue}>{formatMoney(booking.totalAmount)} บาท</Text>
      </View>
      <Pressable onPress={onPay} style={styles.payButton}>
        <MaterialCommunityIcons name={isProcessing ? 'cloud-upload-outline' : 'qrcode-scan'} size={18} color={colors.white} />
        <Text style={styles.payButtonText}>{isProcessing ? 'อัปโหลดสลิปอีกครั้ง' : 'ชำระเงิน / อัปโหลดสลิป'}</Text>
      </Pressable>
    </Pressable>
  );
}

function PaymentProofModal({
  visible,
  booking,
  paymentInfo,
  loading,
  proofImage,
  providerReference,
  payerNote,
  uploading,
  onClose,
  onChooseImage,
  onChangeProviderReference,
  onChangePayerNote,
  onSubmit,
}: {
  visible: boolean;
  booking: CartBooking | null;
  paymentInfo: BookingPaymentInfo | null;
  loading: boolean;
  proofImage: {uri: string; name?: string; type?: string} | null;
  providerReference: string;
  payerNote: string;
  uploading: boolean;
  onClose: () => void;
  onChooseImage: () => void;
  onChangeProviderReference: (value: string) => void;
  onChangePayerNote: (value: string) => void;
  onSubmit: () => void;
}) {
  const method = paymentInfo?.paymentMethod;
  const hasPaymentMethod = Boolean(method?.promptpayId || method?.bankAccountNo);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.paymentModal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>ชำระเงิน</Text>
              <Text style={styles.modalSubtitle}>{booking?.publicId || paymentInfo?.publicId || '-'}</Text>
            </View>
            <Pressable onPress={onClose} disabled={uploading} style={styles.modalCloseButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          {loading ? (
            <ApiLoadingState label="กำลังโหลดข้อมูลชำระเงิน" />
          ) : (
            <ScrollView style={styles.paymentScroll} contentContainerStyle={styles.paymentScrollContent}>
              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>ยอดที่ต้องชำระ</Text>
                <Text style={styles.amountValue}>{formatMoney(paymentInfo?.amount || booking?.totalAmount || 0)} บาท</Text>
                <Text style={styles.amountHint}>{`หมดเวลา ${formatShortDateTime(paymentInfo?.expiresAt || booking?.expiresAt)}`}</Text>
              </View>

              <View style={styles.methodBox}>
                <Text style={styles.sectionTitle}>บัญชีรับเงิน</Text>
                {hasPaymentMethod ? (
                  <>
                    {method?.promptpayId ? <InfoRow label="PromptPay" value={method.promptpayId} /> : null}
                    {method?.bankName ? <InfoRow label="ธนาคาร" value={method.bankName} /> : null}
                    {method?.bankAccountName ? <InfoRow label="ชื่อบัญชี" value={method.bankAccountName} /> : null}
                    {method?.bankAccountNo ? <InfoRow label="เลขบัญชี" value={method.bankAccountNo} /> : null}
                    {method?.instructions ? <Text style={styles.instructionText}>{method.instructions}</Text> : null}
                  </>
                ) : (
                  <Text style={styles.noMethodText}>ตลาดยังไม่ได้ตั้งค่าบัญชีรับเงิน กรุณาติดต่อเจ้าหน้าที่ตลาด</Text>
                )}
              </View>

              <TextInput
                value={providerReference}
                onChangeText={onChangeProviderReference}
                placeholder="เลขอ้างอิง / เลขรายการโอน (ถ้ามี)"
                placeholderTextColor={colors.muted}
                style={styles.paymentInput}
              />
              <TextInput
                value={payerNote}
                onChangeText={onChangePayerNote}
                placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.paymentInput, styles.paymentTextarea]}
              />

              <Pressable onPress={onChooseImage} style={styles.proofPicker}>
                {proofImage ? (
                  <Image source={{uri: proofImage.uri}} style={styles.proofPreview} />
                ) : (
                  <View style={styles.proofPlaceholder}>
                    <MaterialCommunityIcons name="image-plus" size={28} color={colors.tealDark} />
                    <Text style={styles.proofPlaceholderText}>เลือกรูปสลิป</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={onSubmit}
                disabled={uploading || !proofImage || !hasPaymentMethod}
                style={[styles.submitProofButton, (uploading || !proofImage || !hasPaymentMethod) && styles.submitProofButtonDisabled]}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={19} color={colors.white} />
                <Text style={styles.submitProofText}>{uploading ? 'กำลังอัปโหลด...' : 'ส่งหลักฐานการชำระเงิน'}</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
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

function formatShortDate(value?: string | null) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return new Intl.DateTimeFormat('th-TH', {day: 'numeric', month: 'short', year: 'numeric'}).format(date);
}

function formatShortDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

const styles = StyleSheet.create({
  screenScroll: {
    padding: 22,
    paddingBottom: 124,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  messageText: {
    marginBottom: 12,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  selectionBar: {
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...shadow,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectAllText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  selectionCountText: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
  },
  bookingList: {
    gap: 12,
  },
  bookingCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadow,
  },
  bookingCardSelected: {
    borderColor: colors.teal,
    backgroundColor: '#f2fcfa',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxWrap: {
    alignSelf: 'flex-start',
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#bdd0dd',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: colors.teal,
    backgroundColor: colors.teal,
  },
  marketImage: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.soft,
  },
  marketImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: {
    flex: 1,
  },
  marketName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  bookingCode: {
    marginTop: 3,
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
  },
  expiresText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: '#fff4db',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillProcessing: {
    backgroundColor: '#e7f4ff',
  },
  cardActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusText: {
    color: '#9a6500',
    fontSize: 11,
    fontWeight: '900',
  },
  statusTextProcessing: {
    color: '#136aa8',
  },
  cancelButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3b9c6',
    backgroundColor: '#fff5f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  itemList: {
    marginTop: 14,
    gap: 8,
  },
  itemRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemText: {
    flex: 1,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  itemPrice: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  moreText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  accessoryText: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  totalRow: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#edf3f7',
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  totalValue: {
    color: colors.tealDark,
    fontSize: 20,
    fontWeight: '900',
  },
  payButton: {
    marginTop: 12,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 20, 31, 0.45)',
    justifyContent: 'flex-end',
  },
  paymentModal: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  modalSubtitle: {
    marginTop: 2,
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentScroll: {
    maxHeight: '100%',
  },
  paymentScrollContent: {
    paddingBottom: 8,
    gap: 12,
  },
  amountBox: {
    borderRadius: 20,
    backgroundColor: '#ecfbf8',
    borderWidth: 1,
    borderColor: '#c7eee7',
    padding: 16,
  },
  amountLabel: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
  },
  amountValue: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 28,
    fontWeight: '900',
  },
  amountHint: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  methodBox: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  infoRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  infoValue: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  instructionText: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  noMethodText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '800',
  },
  paymentInput: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  paymentTextarea: {
    minHeight: 82,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  proofPicker: {
    minHeight: 150,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.soft,
  },
  proofPreview: {
    width: '100%',
    height: 190,
    resizeMode: 'cover',
  },
  proofPlaceholder: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proofPlaceholderText: {
    color: colors.tealDark,
    fontSize: 13,
    fontWeight: '900',
  },
  submitProofButton: {
    height: 50,
    borderRadius: 17,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitProofButtonDisabled: {
    opacity: 0.45,
  },
  submitProofText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyCard: {
    minHeight: 170,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    ...shadow,
  },
  emptyTitle: {
    marginTop: 12,
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default React.memo(CartScreen);
