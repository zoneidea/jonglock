import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, FlatList, Image, Modal, PermissionsAndroid, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
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

async function ensureQrSavePermission() {
  if (Platform.OS !== 'android') {
    return true;
  }
  const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : Number(Platform.Version);
  if (androidVersion >= 29) {
    return true;
  }
  const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  const current = await PermissionsAndroid.check(permission);
  if (current) {
    return true;
  }
  const result = await PermissionsAndroid.request(permission, {
    title: 'อนุญาตให้บันทึกรูปภาพ',
    message: 'Jonglock ต้องการบันทึก QR Code ลงในคลังรูปภาพของเครื่อง',
    buttonPositive: 'อนุญาต',
    buttonNegative: 'ยกเลิก',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function resolveImageExtension(imageUrl: string) {
  const pathname = imageUrl.split('?')[0] || '';
  const extension = pathname.match(/\\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(extension || '') ? extension : 'jpg';
}

async function saveRemoteQrToGallery(imageUrl: string) {
  const allowed = await ensureQrSavePermission();
  if (!allowed) {
    throw new Error('ไม่สามารถบันทึกได้ เนื่องจากไม่ได้รับสิทธิ์เข้าถึงคลังรูปภาพ');
  }
  const extension = resolveImageExtension(imageUrl);
  const localPath = `${RNFS.CachesDirectoryPath}/jonglock-payment-qr-${Date.now()}.${extension}`;
  await RNFS.downloadFile({fromUrl: imageUrl, toFile: localPath}).promise;
  try {
    await CameraRoll.save(`file://${localPath}`, {type: 'photo'});
  } finally {
    RNFS.unlink(localPath).catch(() => {});
  }
}

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
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [paymentBookings, setPaymentBookings] = useState<CartBooking[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<BookingPaymentInfo | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [proofImage, setProofImage] = useState<{uri: string; name?: string; type?: string} | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [savingQrCode, setSavingQrCode] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
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
      const loadedAtMs = Date.now();
      const nextBookings = (await getCartBookings({email: user.email, name: user.name})).filter(
        (booking) => !isBookingExpired(booking, loadedAtMs),
      );
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

  useEffect(() => {
    if (!user?.email || !bookings.length || paymentBookings.length > 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [bookings.length, paymentBookings.length, user?.email]);

  useEffect(() => {
    if (!bookings.length || paymentBookings.length > 0) {
      return;
    }

    const expiredBookingIds = bookings
      .filter((booking) => isBookingExpired(booking, nowMs))
      .map((booking) => booking.bookingId);

    if (!expiredBookingIds.length) {
      return;
    }

    setBookings((current) => current.filter((booking) => !expiredBookingIds.includes(booking.bookingId)));
    setSelectedBookingIds((current) => current.filter((bookingId) => !expiredBookingIds.includes(bookingId)));
    setMessage('มีรายการหมดเวลาถูกนำออกจากตะกร้าแล้ว');
  }, [bookings, nowMs, paymentBookings.length]);

  useEffect(() => {
    onCountChange?.(bookings.length);
  }, [bookings.length, onCountChange]);

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
  const selectedBookings = useMemo(
    () => bookings.filter((booking) => selectedBookingIds.includes(booking.bookingId)),
    [bookings, selectedBookingIds],
  );
  const selectedBookingSet = useMemo(() => new Set(selectedBookingIds), [selectedBookingIds]);
  const selectedTotal = useMemo(
    () => selectedBookings.reduce((total, booking) => total + Number(booking.totalAmount || 0), 0),
    [selectedBookings],
  );

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

  const proceedToCheckout = useCallback(() => {
    if (!selectedBookings.length) {
      setMessage('กรุณาเลือกรายการที่ต้องการชำระเงิน');
      return;
    }
    const organizationId = selectedBookings[0]?.organizationId;
    const hasMixedOrganization = selectedBookings.some((booking) => booking.organizationId !== organizationId);
    if (hasMixedOrganization) {
      setMessage('กรุณาเลือกรายการจากองค์กรเดียวกันเท่านั้น เพื่อให้ใช้บัญชีรับเงินเดียวกัน');
      return;
    }
    setMessage('');
    setCheckoutMode(true);
  }, [selectedBookings]);

  const openPayment = useCallback(async (targetBookings: CartBooking[]) => {
    if (!user?.email) {
      return;
    }
    const firstBooking = targetBookings[0];
    if (!firstBooking) {
      setMessage('กรุณาเลือกรายการที่ต้องการชำระเงิน');
      return;
    }
    const organizationId = firstBooking.organizationId;
    if (targetBookings.some((booking) => booking.organizationId !== organizationId)) {
      setMessage('กรุณาเลือกรายการจากองค์กรเดียวกันเท่านั้น เพื่อให้ใช้บัญชีรับเงินเดียวกัน');
      return;
    }
    setPaymentBookings(targetBookings);
    setPaymentInfo(null);
    setProofImage(null);
    setPaymentLoading(true);
    setMessage('');
    try {
      const paymentInfos = await Promise.all(
        targetBookings.map((booking) => getBookingPaymentInfo(booking.bookingId, {email: user.email, name: user.name})),
      );
      const info = paymentInfos[0] || null;
      setPaymentInfo(info);
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถโหลดข้อมูลชำระเงินได้');
      setPaymentBookings([]);
    } finally {
      setPaymentLoading(false);
    }
  }, [user]);

  const closePayment = useCallback(() => {
    if (uploadingProof) {
      return;
    }
    setPaymentBookings([]);
    setPaymentInfo(null);
    setProofImage(null);
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
    if (!paymentBookings.length || !user?.email) {
      return;
    }
    if (!proofImage) {
      setMessage('กรุณาเลือกรูปสลิปก่อนอัปโหลด');
      return;
    }
    setUploadingProof(true);
    setMessage('');
    try {
      for (const booking of paymentBookings) {
        await uploadBookingPaymentProof(
          booking.bookingId,
          {email: user.email, name: user.name},
          proofImage,
        );
      }
      closePayment();
      setCheckoutMode(false);
      setSelectedBookingIds([]);
      setMessage('ส่งหลักฐานการชำระเงินแล้ว กรุณารอการตรวจสอบ');
      await loadCart();
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถอัปโหลดหลักฐานได้');
    } finally {
      setUploadingProof(false);
    }
  }, [closePayment, loadCart, paymentBookings, proofImage, user]);

  const savePaymentQrCode = useCallback(async () => {
    const qrCodeImageUrl = paymentInfo?.paymentMethod?.qrCodeImageUrl;
    if (!qrCodeImageUrl || savingQrCode) {
      return;
    }
    setSavingQrCode(true);
    try {
      await saveRemoteQrToGallery(qrCodeImageUrl);
      Alert.alert('บันทึก QR Code แล้ว', 'บันทึกรูป QR Code ลงในคลังรูปภาพเรียบร้อย');
    } catch (error) {
      Alert.alert('บันทึก QR Code ไม่สำเร็จ', (error as Error).message || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSavingQrCode(false);
    }
  }, [paymentInfo?.paymentMethod?.qrCodeImageUrl, savingQrCode]);

  const renderCartBooking = useCallback(({item}: {item: CartBooking}) => (
    <CartBookingCard
      booking={item}
      selected={selectedBookingSet.has(item.bookingId)}
      onToggleSelect={() => toggleBookingSelection(item.bookingId)}
      onCancel={() => setCancelTarget(item)}
      cancelling={cancellingBookingId === item.bookingId}
      nowMs={nowMs}
    />
  ), [cancellingBookingId, nowMs, selectedBookingSet, toggleBookingSelection]);

  const renderCartHeader = useCallback(() => (
    <>
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

      {!loading && selectedCount > 0 ? (
        <Pressable onPress={proceedToCheckout} style={styles.checkoutButton}>
          <View>
            <Text style={styles.checkoutButtonText}>ดำเนินการชำระเงิน</Text>
            <Text style={styles.checkoutButtonSubtext}>{`${selectedCount} รายการ • ${formatMoney(selectedTotal)} บาท`}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.white} />
        </Pressable>
      ) : null}

      {message ? <Text style={[styles.messageText, {color: palette.danger}]}>{message}</Text> : null}
    </>
  ), [
    allSelected,
    bookings.length,
    handleRefresh,
    loading,
    message,
    palette,
    proceedToCheckout,
    selectedCount,
    selectedTotal,
    toggleSelectAll,
  ]);

  const renderCartEmpty = useCallback(() => (
    loading ? (
      <ApiLoadingState label="กำลังโหลดตะกร้า" />
    ) : (
      <View style={[styles.emptyCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
        <MaterialCommunityIcons name="cart-outline" size={34} color={palette.accentDark} />
        <Text style={[styles.emptyTitle, {color: palette.text}]}>ยังไม่มีรายการรอชำระเงิน</Text>
        <Text style={[styles.emptyText, {color: palette.muted}]}>รายการที่จองแล้วแต่ยังไม่ชำระเงินจะแสดงที่นี่</Text>
      </View>
    )
  ), [loading, palette]);

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

  if (checkoutMode) {
    return (
      <ScrollView
        contentContainerStyle={[styles.screenScroll, {backgroundColor: palette.background}]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.accent} />}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, {color: palette.text}]}>สรุปชำระเงิน</Text>
            <Text style={[styles.subtitle, {color: palette.muted}]}>ตรวจสอบรายการก่อนยืนยันการชำระเงิน</Text>
          </View>
          <Pressable onPress={() => setCheckoutMode(false)} style={[styles.refreshButton, {backgroundColor: palette.surface, borderColor: palette.border}]}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={palette.accentDark} />
          </Pressable>
        </View>

        {message ? <Text style={[styles.messageText, {color: palette.danger}]}>{message}</Text> : null}
        <CheckoutSummary
          bookings={selectedBookings}
          totalAmount={selectedTotal}
          nowMs={nowMs}
          onBack={() => setCheckoutMode(false)}
          onConfirm={() => openPayment(selectedBookings)}
        />
        <PaymentProofModal
          visible={paymentBookings.length > 0}
          bookings={paymentBookings}
          paymentInfo={paymentInfo}
          totalAmount={selectedTotal}
          loading={paymentLoading}
          proofImage={proofImage}
          uploading={uploadingProof}
          savingQrCode={savingQrCode}
          onClose={closePayment}
          onChooseImage={chooseProofImage}
          onSaveQrCode={savePaymentQrCode}
          onSubmit={submitProof}
        />
      </ScrollView>
    );
  }

  return (
    <View style={[styles.flex, {backgroundColor: palette.background}]}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.bookingId)}
        renderItem={renderCartBooking}
        contentContainerStyle={styles.screenScroll}
        ItemSeparatorComponent={CartListSeparator}
        ListHeaderComponent={renderCartHeader}
        ListEmptyComponent={renderCartEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.accent} />}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
      />

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
    </View>
  );
}

function CartListSeparator() {
  return <View style={styles.cartListSeparator} />;
}

const CartBookingCard = React.memo(function CartBookingCard({
  booking,
  selected,
  onToggleSelect,
  onCancel,
  cancelling,
  nowMs,
}: {
  booking: CartBooking;
  selected: boolean;
  onToggleSelect: () => void;
  onCancel: () => void;
  cancelling: boolean;
  nowMs: number;
}) {
  const isProcessing = booking.status === 'payment_processing';
  const countdownText = formatBookingCountdown(booking, nowMs);
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
          <Text style={[styles.expiresText, countdownText.isUrgent && styles.expiresTextUrgent]}>
            {countdownText.text}
          </Text>
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
    </Pressable>
  );
}, (prev, next) => (
  prev.booking === next.booking
  && prev.selected === next.selected
  && prev.cancelling === next.cancelling
  && prev.nowMs === next.nowMs
));

function CheckoutSummary({
  bookings,
  totalAmount,
  nowMs,
  onBack,
  onConfirm,
}: {
  bookings: CartBooking[];
  totalAmount: number;
  nowMs: number;
  onBack: () => void;
  onConfirm: () => void;
}) {
  if (!bookings.length) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>ยังไม่ได้เลือกรายการ</Text>
        <Text style={styles.emptyText}>กลับไปเลือกไอเท็มในตะกร้าก่อนดำเนินการชำระเงิน</Text>
        <Pressable onPress={onBack} style={styles.summaryBackButton}>
          <Text style={styles.summaryBackButtonText}>กลับไปตะกร้า</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.summaryWrap}>
      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>รายการที่ต้องการชำระเงิน</Text>
        <View style={styles.summaryList}>
          {bookings.map((booking) => (
            <View key={booking.bookingId} style={styles.summaryItem}>
              <View style={styles.summaryItemMain}>
                <Text style={styles.summaryMarketName}>{booking.marketName}</Text>
                <Text style={styles.summaryBookingCode}>{booking.publicId}</Text>
                <Text style={styles.summaryItemMeta}>{`${booking.items.length} วัน/รายการ • ${formatBookingCountdown(booking, nowMs).text}`}</Text>
              </View>
              <Text style={styles.summaryItemAmount}>{formatMoney(booking.totalAmount)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryTotalRow}>
          <Text style={styles.summaryTotalLabel}>ยอดเงินรวม</Text>
          <Text style={styles.summaryTotalValue}>{formatMoney(totalAmount)} บาท</Text>
        </View>
      </View>
      <Pressable onPress={onConfirm} style={styles.confirmPaymentButton}>
        <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.white} />
        <Text style={styles.confirmPaymentText}>ยืนยันชำระเงิน</Text>
      </Pressable>
    </View>
  );
}

function PaymentProofModal({
  visible,
  bookings,
  paymentInfo,
  totalAmount,
  loading,
  proofImage,
  uploading,
  savingQrCode,
  onClose,
  onChooseImage,
  onSaveQrCode,
  onSubmit,
}: {
  visible: boolean;
  bookings: CartBooking[];
  paymentInfo: BookingPaymentInfo | null;
  totalAmount: number;
  loading: boolean;
  proofImage: {uri: string; name?: string; type?: string} | null;
  uploading: boolean;
  savingQrCode: boolean;
  onClose: () => void;
  onChooseImage: () => void;
  onSaveQrCode: () => void;
  onSubmit: () => void;
}) {
  const method = paymentInfo?.paymentMethod;
  const hasPaymentMethod = Boolean(method?.qrCodeImageUrl || method?.promptpayId || method?.bankAccountNo);
  const firstBooking = bookings[0] || null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.paymentModal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>ชำระเงิน</Text>
              <Text style={styles.modalSubtitle}>
                {bookings.length > 1 ? `${bookings.length} รายการ` : firstBooking?.publicId || paymentInfo?.publicId || '-'}
              </Text>
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
                <Text style={styles.amountValue}>{formatMoney(totalAmount || paymentInfo?.amount || firstBooking?.totalAmount || 0)} บาท</Text>
                <Text style={styles.amountHint}>{`หมดเวลา ${formatShortDateTime(paymentInfo?.expiresAt || firstBooking?.expiresAt)}`}</Text>
              </View>

              <View style={styles.methodBox}>
                <Text style={styles.sectionTitle}>บัญชีรับเงิน</Text>
                {hasPaymentMethod ? (
                  <>
                    {method?.qrCodeImageUrl ? (
                      <View style={styles.qrCodeBox}>
                        <Image source={{uri: method.qrCodeImageUrl}} style={styles.qrCodeImage} resizeMode="contain" />
                        <Text style={styles.qrCodeCaption}>สแกน QR Code เพื่อชำระเงิน</Text>
                        <Pressable
                          onPress={onSaveQrCode}
                          disabled={savingQrCode}
                          style={[styles.qrSaveButton, savingQrCode && styles.qrSaveButtonDisabled]}>
                          <MaterialCommunityIcons name="content-save-outline" size={16} color={colors.white} />
                          <Text style={styles.qrSaveButtonText}>{savingQrCode ? 'กำลังบันทึก...' : 'บันทึก QR Code'}</Text>
                        </Pressable>
                      </View>
                    ) : null}
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

function getBookingExpiryMs(booking: CartBooking) {
  if (booking.status === 'payment_processing' || !booking.expiresAt) {
    return null;
  }
  const expiresAtMs = new Date(booking.expiresAt).getTime();
  return Number.isNaN(expiresAtMs) ? null : expiresAtMs;
}

function isBookingExpired(booking: CartBooking, nowMs: number) {
  const expiresAtMs = getBookingExpiryMs(booking);
  return expiresAtMs !== null && expiresAtMs <= nowMs;
}

function formatBookingCountdown(booking: CartBooking, nowMs: number) {
  const expiresAtMs = getBookingExpiryMs(booking);
  if (expiresAtMs === null) {
    return {
      text: `หมดเวลา ${formatShortDateTime(booking.expiresAt)}`,
      isUrgent: false,
    };
  }

  const remainingMs = Math.max(0, expiresAtMs - nowMs);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const countdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    text: totalSeconds > 0 ? `เหลือเวลา ${countdown}` : 'หมดเวลาแล้ว',
    isUrgent: totalSeconds <= 60,
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  checkoutButton: {
    minHeight: 58,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: colors.teal,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...shadow,
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  checkoutButtonSubtext: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '800',
  },
  cartListSeparator: {
    height: 12,
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
  expiresTextUrgent: {
    color: colors.danger,
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
  summaryWrap: {
    gap: 12,
  },
  summaryCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadow,
  },
  summaryList: {
    gap: 10,
  },
  summaryItem: {
    minHeight: 66,
    borderRadius: 18,
    backgroundColor: colors.soft,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryItemMain: {
    flex: 1,
  },
  summaryMarketName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  summaryBookingCode: {
    marginTop: 2,
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
  },
  summaryItemMeta: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  summaryItemAmount: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#edf3f7',
    marginVertical: 14,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryTotalLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryTotalValue: {
    color: colors.tealDark,
    fontSize: 24,
    fontWeight: '900',
  },
  confirmPaymentButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  confirmPaymentText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryBackButton: {
    marginTop: 16,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  summaryBackButtonText: {
    color: colors.white,
    fontSize: 13,
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
  qrCodeBox: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d7efe9',
    backgroundColor: '#f6fffc',
    marginBottom: 12,
    padding: 12,
  },
  qrCodeImage: {
    width: 190,
    height: 190,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  qrCodeCaption: {
    marginTop: 8,
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
  },
  qrSaveButton: {
    marginTop: 12,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
  },
  qrSaveButtonDisabled: {
    opacity: 0.65,
  },
  qrSaveButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  noMethodText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '800',
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
