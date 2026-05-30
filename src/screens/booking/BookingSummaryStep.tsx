import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppDialog from '../../components/AppDialog';
import ApiLoadingState from '../../components/ApiLoadingState';
import {
  confirmBooking,
  clearBoothAvailabilityCache,
  getMarketAccessories,
  updateBookingSummary,
  type BookingSummary,
  type Booth,
  type BoothHoldResult,
  type FloorPlan,
  type Market,
  type MarketAccessory,
} from '../../services/markets';
import {saveBoothTempLocks} from '../../services/boothTempLocks';
import {registerPushDeviceToken} from '../../services/notifications';
import {colors, shadow} from '../../theme/colors';
import type {MobileUser} from '../../types/user';

function BookingSummaryStep({
  market,
  floorPlan,
  booth,
  hold,
  user,
  onBack,
  onConfirmed,
}: {
  market: Market;
  floorPlan: FloorPlan;
  booth: Booth;
  hold: BoothHoldResult;
  user: MobileUser | null;
  onBack: () => void;
  onConfirmed?: () => void;
}) {
  const [accessories, setAccessories] = useState<MarketAccessory[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);

  const actionDisabled = !summary || calculating || confirming;

  const selectedAccessories = useMemo(
    () => Object.entries(quantities)
      .map(([accessoryId, quantity]) => ({accessoryId: Number(accessoryId), quantity}))
      .filter((item) => item.quantity > 0),
    [quantities],
  );

  const refreshSummary = useCallback(async (couponCode = appliedCouponCode) => {
    if (!user?.email) {
      setMessage('กรุณาเข้าสู่ระบบก่อนสรุปรายการจอง');
      return;
    }

    setCalculating(true);
    setMessage('');
    try {
      const nextSummary = await updateBookingSummary(
        hold.bookingId,
        {email: user.email, name: user.name},
        selectedAccessories,
        couponCode,
      );
      setSummary(nextSummary);
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถคำนวณยอดรวมได้');
      if (couponCode) {
        setAppliedCouponCode('');
      }
    } finally {
      setCalculating(false);
    }
  }, [appliedCouponCode, hold.bookingId, selectedAccessories, user]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getMarketAccessories(market.id).catch((error) => {
        if (active) {
          setMessage((error as Error).message || 'ยังไม่สามารถโหลดบริการเสริมได้');
        }
        return [];
      }),
      user?.email
        ? updateBookingSummary(hold.bookingId, {email: user.email, name: user.name}, [], '')
        : Promise.resolve(null),
    ])
      .then(([nextAccessories, nextSummary]) => {
        if (!active) {
          return;
        }
        setAccessories(nextAccessories);
        if (nextSummary) {
          setSummary(nextSummary);
        }
      })
      .catch((error) => {
        if (active) {
          setMessage((error as Error).message || 'ยังไม่สามารถโหลดสรุปรายการได้');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [hold.bookingId, market.id, user]);

  useEffect(() => {
    if (loading) {
      return;
    }
    const timer = setTimeout(() => {
      refreshSummary();
    }, 280);
    return () => clearTimeout(timer);
  }, [loading, refreshSummary]);

  const updateQuantity = useCallback((accessoryId: number, nextQuantity: number) => {
    setQuantities((current) => ({
      ...current,
      [accessoryId]: Math.max(0, Math.min(99, nextQuantity)),
    }));
  }, []);

  const applyCoupon = useCallback(() => {
    const code = couponInput.trim().toUpperCase();
    setAppliedCouponCode(code);
    refreshSummary(code);
  }, [couponInput, refreshSummary]);

  const confirmReservation = useCallback(async () => {
    if (!user?.email) {
      setMessage('กรุณาเข้าสู่ระบบก่อนยืนยันการจอง');
      return;
    }
    if (!summary) {
      return;
    }
    setConfirming(true);
    setMessage('');
    try {
      const confirmed = await confirmBooking(hold.bookingId, {email: user.email, name: user.name});
      registerPushDeviceToken({user, organizationId: market.organizationId}).catch(() => undefined);
      const expiresAtMs = getLockExpiryMs(confirmed.expiresAt || hold.expiresAt);
      try {
        await saveBoothTempLocks({
          organizationId: floorPlan.organizationId,
          marketId: floorPlan.marketId,
          floorPlanId: floorPlan.id,
          boothId: booth.id,
          dates: hold.lockedDates,
          ownerId: user.email || user.name || 'mobile-user',
          ownerLabel: user.email || user.name || 'mobile-user',
          expiresAtMs,
        });
      } catch {
        // MySQL is the source of truth; realtime locks can be recreated by API refresh/cron.
      }
      clearBoothAvailabilityCache();
      setDialogVisible(true);
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถยืนยันการจองได้');
    } finally {
      setConfirming(false);
    }
  }, [booth.id, floorPlan.id, floorPlan.marketId, floorPlan.organizationId, hold.bookingId, hold.expiresAt, hold.lockedDates, market.organizationId, summary, user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshSummary(appliedCouponCode);
    } finally {
      setRefreshing(false);
    }
  }, [appliedCouponCode, refreshSummary]);

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.screenScroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.teal} />}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.ink} />
            <Text style={styles.backText}>กลับ</Text>
          </Pressable>
        </View>

        <View style={styles.summaryHeaderCard}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={24} color={colors.tealDark} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{market.name}</Text>
            <Text style={styles.title}>สรุปรายการจอง</Text>
            <Text style={styles.subtitle}>
              {`${floorPlan.name} • ${boothDisplayName(booth)} • ${hold.publicId}`}
            </Text>
          </View>
        </View>

        {hold.unavailableDates.length ? (
          <View style={styles.noticeCard}>
            <MaterialCommunityIcons name="calendar-alert" size={19} color={colors.tealDark} />
            <Text style={styles.noticeText}>
              ระบบตัดวันที่ไม่ว่างออก {hold.unavailableDates.length} วัน และจองเฉพาะวันที่ยังว่างให้แล้ว
            </Text>
          </View>
        ) : null}

        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        {loading ? (
          <ApiLoadingState label="กำลังโหลดสรุปรายการ" />
        ) : (
          <>
            <SectionTitle title="วันที่จอง" caption={`${summary?.items.length || hold.lockedDates.length} วัน`} />
            <View style={styles.card}>
              {(summary?.items || []).map((item) => (
                <View key={item.id} style={styles.bookingItemRow}>
                  <View>
                    <Text style={styles.bookingItemTitle}>{formatShortDate(item.bookingDate)}</Text>
                    <Text style={styles.bookingItemCaption}>{`${item.boothName || item.boothCode} • ${market.name}`}</Text>
                  </View>
                  <Text style={styles.bookingItemPrice}>{formatMoney(item.unitPrice)} บาท</Text>
                </View>
              ))}
            </View>

            <SectionTitle title="บริการเสริม" caption={accessories.length ? 'เลือกตามต้องการ' : 'ไม่มีบริการเสริม'} />
            <View style={styles.accessoryList}>
              {accessories.map((accessory) => (
                <AccessoryCard
                  key={accessory.id}
                  accessory={accessory}
                  quantity={quantities[accessory.id] || 0}
                  onDecrease={() => updateQuantity(accessory.id, (quantities[accessory.id] || 0) - 1)}
                  onIncrease={() => updateQuantity(accessory.id, (quantities[accessory.id] || 0) + 1)}
                />
              ))}
              {!accessories.length ? <EmptyCard text="ตลาดนี้ยังไม่มีบริการเสริม" /> : null}
            </View>

            <SectionTitle title="โค้ดส่วนลด" caption={summary?.coupon ? summary.coupon.code : 'ไม่บังคับ'} />
            <View style={styles.couponRow}>
              <TextInput
                value={couponInput}
                onChangeText={setCouponInput}
                placeholder="กรอกโค้ดส่วนลด"
                placeholderTextColor="#8fa2b2"
                style={styles.couponInput}
                autoCapitalize="characters"
                selectionColor={colors.teal}
              />
              <Pressable onPress={applyCoupon} style={styles.couponButton}>
                <Text style={styles.couponButtonText}>ใช้โค้ด</Text>
              </Pressable>
            </View>

            <SectionTitle title="ยอดชำระ" caption={calculating ? 'กำลังคำนวณ' : 'คำนวณล่าสุด'} />
            <View style={styles.totalCard}>
              <TotalRow label="ค่าบูธ" value={summary?.boothSubtotal || 0} />
              <TotalRow label="บริการเสริม" value={summary?.accessorySubtotal || 0} />
              <TotalRow label="ส่วนลด" value={-(summary?.discountAmount || 0)} muted />
              {summary?.vatEnabled ? <TotalRow label={`VAT ${summary.vatRate}%`} value={summary.vatAmount} /> : null}
              <View style={styles.totalDivider} />
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>รวมทั้งสิ้น</Text>
                <Text style={styles.grandTotalValue}>{formatMoney(summary?.totalAmount || hold.totalAmount)} บาท</Text>
              </View>
            </View>

            <Pressable
              disabled={actionDisabled}
              onPress={confirmReservation}
              style={[styles.payButton, actionDisabled && styles.payButtonDisabled]}>
              <Text style={styles.payButtonText}>{confirming ? 'กำลังยืนยัน...' : 'ยืนยันการจอง'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.white} />
            </Pressable>
          </>
        )}
      </ScrollView>

      <AppDialog
        visible={dialogVisible}
        icon="cart-check"
        title="ยืนยันการจองสำเร็จ"
        message="ระบบเพิ่มรายการนี้ไปที่ตะกร้าแล้ว กรุณาชำระเงินภายในเวลาที่กำหนด"
        cancelLabel="อยู่หน้านี้"
        confirmLabel="ไปตะกร้า"
        onCancel={() => setDialogVisible(false)}
        onConfirm={() => {
          setDialogVisible(false);
          onConfirmed?.();
        }}
      />
    </View>
  );
}

function SectionTitle({title, caption}: {title: string; caption: string}) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCaption}>{caption}</Text>
    </View>
  );
}

function AccessoryCard({
  accessory,
  quantity,
  onDecrease,
  onIncrease,
}: {
  accessory: MarketAccessory;
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.accessoryCard}>
      {accessory.imageUrl ? (
        <Image source={{uri: accessory.imageUrl}} style={styles.accessoryImage} />
      ) : (
        <View style={[styles.accessoryImage, styles.accessoryImageFallback]}>
          <MaterialCommunityIcons name="package-variant" size={22} color={colors.tealDark} />
        </View>
      )}
      <View style={styles.accessoryCopy}>
        <Text style={styles.accessoryName}>{accessory.name}</Text>
        <Text style={styles.accessoryPrice}>{`${formatMoney(accessory.price)} บาท/วัน`}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable onPress={onDecrease} style={[styles.stepperButton, quantity === 0 && styles.stepperButtonDisabled]}>
          <MaterialCommunityIcons name="minus" size={16} color={quantity === 0 ? '#9fafbf' : colors.ink} />
        </Pressable>
        <Text style={styles.stepperValue}>{quantity}</Text>
        <Pressable onPress={onIncrease} style={styles.stepperButton}>
          <MaterialCommunityIcons name="plus" size={16} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function TotalRow({label, value, muted = false}: {label: string; value: number; muted?: boolean}) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, muted && styles.totalMuted]}>{label}</Text>
      <Text style={[styles.totalValue, muted && styles.totalMuted]}>{formatMoney(value)} บาท</Text>
    </View>
  );
}

function EmptyCard({text}: {text: string}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function boothDisplayName(booth: Booth) {
  const label = booth.name || booth.code;
  return label.replace(/\bbooth\b/gi, '').replace(/\s{2,}/g, ' ').trim() || booth.code;
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getLockExpiryMs(expiresAt?: string | null) {
  const parsed = expiresAt ? new Date(expiresAt).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now() + 10 * 60 * 1000;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screenScroll: {
    padding: 22,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 42,
    paddingRight: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  summaryHeaderCard: {
    minHeight: 82,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    ...shadow,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.tealDark,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '900',
  },
  title: {
    marginTop: 2,
    color: colors.ink,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  noticeCard: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: '#effbf8',
    borderWidth: 1,
    borderColor: '#c8eee7',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    color: colors.tealDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  messageText: {
    marginTop: 12,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  sectionTitleRow: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  sectionCaption: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  bookingItemRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf3f7',
  },
  bookingItemTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  bookingItemCaption: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  bookingItemPrice: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  accessoryList: {
    gap: 10,
  },
  accessoryCard: {
    minHeight: 78,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    ...shadow,
  },
  accessoryImage: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.soft,
  },
  accessoryImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessoryCopy: {
    flex: 1,
  },
  accessoryName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  accessoryPrice: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  stepper: {
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.45,
  },
  stepperValue: {
    minWidth: 18,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  couponInput: {
    flex: 1,
    height: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  couponButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  couponButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  totalCard: {
    borderRadius: 24,
    backgroundColor: colors.navy,
    padding: 16,
    ...shadow,
  },
  totalRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    color: '#d7e1ea',
    fontSize: 13,
    fontWeight: '800',
  },
  totalValue: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  totalMuted: {
    color: '#91a3b6',
  },
  totalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginVertical: 12,
  },
  grandTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  grandTotalLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  grandTotalValue: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '900',
  },
  emptyCard: {
    minHeight: 74,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  payButton: {
    marginTop: 18,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadow,
  },
  payButtonDisabled: {
    opacity: 0.55,
  },
  payButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
});

export default BookingSummaryStep;
