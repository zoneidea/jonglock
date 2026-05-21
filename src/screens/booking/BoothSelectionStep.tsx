import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ApiLoadingState from '../../components/ApiLoadingState';
import {
  getFloorPlanBoothAvailability,
  type Booth,
  type BoothAvailabilityStatus,
  type FloorPlan,
  type Market,
} from '../../services/markets';
import {
  acquireBoothTempLocks,
  availabilityStatusWithTempLock,
  BOOTH_TEMP_LOCK_TTL_SECONDS,
  releaseBoothTempLocks,
  subscribeFloorPlanTempLocks,
  tempLockKey,
  type BoothTempLockMap,
} from '../../services/boothTempLocks';
import {colors, shadow} from '../../theme/colors';
import type {MobileUser} from '../../types/user';
import BookingSelectionModal, {floorPlanToSelectionItem, marketToSelectionItem} from './BookingSelectionModal';

function BoothSelectionStep({
  market,
  markets,
  floorPlans,
  floorPlan,
  selectedDates,
  user,
  onBack,
  onSelectMarket,
  onSelectFloorPlan,
  onChangeDates,
}: {
  market: Market;
  markets: Market[];
  floorPlans: FloorPlan[];
  floorPlan: FloorPlan;
  selectedDates: string[];
  user: MobileUser | null;
  onBack: () => void;
  onSelectMarket: (market: Market) => void;
  onSelectFloorPlan: (floorPlan: FloorPlan) => void;
  onChangeDates: () => void;
}) {
  const {width} = useWindowDimensions();
  const columns = 6;
  const tileSize = useMemo(() => getBoothTileSize(width, columns), [columns, width]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [tempLocks, setTempLocks] = useState<BoothTempLockMap>(new Map());
  const [activeLockDocIds, setActiveLockDocIds] = useState<string[]>([]);
  const [marketModalOpen, setMarketModalOpen] = useState(false);
  const [floorPlanModalOpen, setFloorPlanModalOpen] = useState(false);
  const ownerId = user?.email || user?.name || 'anonymous-mobile-user';
  const ownerLabel = user?.email || user?.name || 'mobile-user';
  const marketItems = useMemo(() => markets.map(marketToSelectionItem), [markets]);
  const floorPlanItems = useMemo(() => floorPlans.map(floorPlanToSelectionItem), [floorPlans]);

  const loadBooths = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setBooths(await getFloorPlanBoothAvailability(floorPlan.id, selectedDates));
    } catch {
      setMessage('ยังไม่สามารถโหลดสถานะบูธได้');
    } finally {
      setLoading(false);
    }
  }, [floorPlan.id, selectedDates]);

  useEffect(() => {
    loadBooths();
  }, [loadBooths]);

  useEffect(() => {
    return subscribeFloorPlanTempLocks({
      organizationId: floorPlan.organizationId,
      marketId: floorPlan.marketId,
      floorPlanId: floorPlan.id,
      dates: selectedDates,
      onChange: setTempLocks,
    });
  }, [floorPlan.id, floorPlan.marketId, floorPlan.organizationId, selectedDates]);

  useEffect(() => {
    return () => {
      releaseBoothTempLocks(activeLockDocIds).catch(() => undefined);
    };
  }, [activeLockDocIds]);

  const effectiveBooths = useMemo(
    () => booths.map((booth) => applyTempLocksToBooth(booth, selectedDates, tempLocks, ownerId)),
    [booths, ownerId, selectedDates, tempLocks],
  );

  const closeSelectedBooth = useCallback(() => {
    const docIds = activeLockDocIds;
    setActiveLockDocIds([]);
    setSelectedBooth(null);
    releaseBoothTempLocks(docIds).catch(() => undefined);
  }, [activeLockDocIds]);

  const handleBoothPress = useCallback(async (booth: Booth) => {
    setMessage('');
    if (booth.availabilityStatus !== 'available') {
      setSelectedBooth(booth);
      return;
    }

    try {
      if (activeLockDocIds.length) {
        await releaseBoothTempLocks(activeLockDocIds);
        setActiveLockDocIds([]);
      }
      const lockResult = await acquireBoothTempLocks({
        organizationId: floorPlan.organizationId,
        marketId: floorPlan.marketId,
        floorPlanId: floorPlan.id,
        boothId: booth.id,
        dates: selectedDates,
        ownerId,
        ownerLabel,
      });
      setActiveLockDocIds(lockResult.map((lock) => lock.docId));
      setSelectedBooth(booth);
    } catch (error) {
      if ((error as Error).message === 'TEMP_LOCK_CONFLICT') {
        setMessage('บูธนี้มีผู้ใช้งานกำลังเลือกอยู่ กรุณาเลือกบูธอื่นหรือรอสักครู่');
        loadBooths();
        return;
      }
      setMessage('ยังไม่สามารถล็อกบูธแบบเรียลไทม์ได้ ระบบจะตรวจสอบซ้ำตอนยืนยันจอง');
      setSelectedBooth(booth);
    }
  }, [
    activeLockDocIds,
    floorPlan.id,
    floorPlan.marketId,
    floorPlan.organizationId,
    loadBooths,
    ownerId,
    ownerLabel,
    selectedDates,
  ]);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <View style={styles.detailHeaderRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.ink} />
            <Text style={styles.backText}>กลับ</Text>
          </Pressable>
        </View>

        <View style={styles.boothHeaderCard}>
          <View style={styles.planIntroIcon}>
            <MaterialCommunityIcons name="view-grid-outline" size={22} color={colors.tealDark} />
          </View>
          <View style={styles.planIntroCopy}>
            <Text style={styles.planEyebrow}>{market.name}</Text>
            <Text style={styles.planTitle}>เลือกบูธ</Text>
            <Text style={styles.planSubtitle}>
              {`${floorPlan.name} • ${formatSelectedDateSummary(selectedDates)}`}
            </Text>
          </View>
        </View>

        <View style={styles.shortcutRow}>
          <ShortcutButton icon="store-search-outline" label="เปลี่ยนตลาด" onPress={() => setMarketModalOpen(true)} />
          <ShortcutButton icon="map-marker-path" label="เปลี่ยนโซน" onPress={() => setFloorPlanModalOpen(true)} />
          <ShortcutButton icon="calendar-edit" label="เปลี่ยนวันที่" onPress={onChangeDates} />
        </View>

        <View style={styles.boothLegendRow}>
          <LegendDot color="#14b879" label="ว่างทุกวัน" />
          <LegendDot color="#f5b93f" label="ว่างบางวัน" />
          <LegendDot color="#ef4444" label="ไม่ว่างเลย" />
        </View>

        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.boothGrid}>
          {loading && booths.length === 0 ? (
            <>
              <ApiLoadingState label="กำลังโหลดบูธ" style={styles.boothLoadingCard} />
              <ApiLoadingState label="กำลังโหลดบูธ" style={styles.boothLoadingCard} />
            </>
          ) : null}
          {effectiveBooths.map((booth) => (
            <BoothTile
              key={booth.id}
              booth={booth}
              size={tileSize}
              onPress={() => handleBoothPress(booth)}
            />
          ))}
          {!loading && booths.length === 0 ? <EmptyCard text="ยังไม่มีบูธในแผนผังนี้" /> : null}
        </View>
      </ScrollView>

      <BoothDetailSheet
        booth={selectedBooth}
        selectedDates={selectedDates}
        onClose={closeSelectedBooth}
      />
      <BookingSelectionModal
        open={marketModalOpen}
        title="เลือกตลาด"
        searchPlaceholder="ค้นหาชื่อตลาดหรือรหัสตลาด"
        emptyText="ไม่พบตลาด"
        items={marketItems}
        selectedId={market.id}
        onClose={() => setMarketModalOpen(false)}
        onSelect={(marketId) => {
          const nextMarket = markets.find((item) => item.id === marketId);
          if (!nextMarket) {return;}
          setMarketModalOpen(false);
          closeSelectedBooth();
          onSelectMarket(nextMarket);
        }}
      />
      <BookingSelectionModal
        open={floorPlanModalOpen}
        title="เลือกโซน"
        searchPlaceholder="ค้นหาชื่อโซนหรือแผนผัง"
        emptyText="ไม่พบโซน"
        items={floorPlanItems}
        selectedId={floorPlan.id}
        onClose={() => setFloorPlanModalOpen(false)}
        onSelect={(floorPlanId) => {
          const nextFloorPlan = floorPlans.find((item) => item.id === floorPlanId);
          if (!nextFloorPlan) {return;}
          setFloorPlanModalOpen(false);
          closeSelectedBooth();
          onSelectFloorPlan(nextFloorPlan);
        }}
      />
    </View>
  );
}

function ShortcutButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.shortcutButton}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.tealDark} />
      <Text style={styles.shortcutText}>{label}</Text>
    </Pressable>
  );
}

function BoothTile({
  booth,
  size,
  onPress,
}: {
  booth: Booth;
  size: number;
  onPress: () => void;
}) {
  const disabled = booth.availabilityStatus === 'unavailable' || booth.availabilityStatus === 'booked';
  const statusStyle = boothStatusStyles[booth.availabilityStatus];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.boothTile,
        {
          width: size,
          height: size,
          backgroundColor: statusStyle.background,
          borderColor: statusStyle.border,
        },
        disabled && styles.boothTileDisabled,
      ]}>
      <Text style={[styles.boothTileText, {color: statusStyle.text}]} numberOfLines={1} adjustsFontSizeToFit>
        {boothDisplayName(booth)}
      </Text>
      <Text style={[styles.boothPriceText, {color: statusStyle.text}]} numberOfLines={1}>
        {formatMoney(booth.grossPrice)}
      </Text>
    </Pressable>
  );
}

function LegendDot({color, label}: {color: string; label: string}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, {backgroundColor: color}]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function BoothDetailSheet({
  booth,
  selectedDates,
  onClose,
}: {
  booth: Booth | null;
  selectedDates: string[];
  onClose: () => void;
}) {
  if (!booth) {
    return null;
  }

  const availabilityDates = normalizeBoothDates(booth, selectedDates);
  const availableDates = availabilityDates.filter((item) => item.status === 'available');
  const unavailableDates = availabilityDates.filter((item) => item.status !== 'available');
  const statusText = booth.availabilityStatus === 'available'
    ? 'ว่างทุกวันที่เลือก'
    : booth.availabilityStatus === 'processing'
      ? 'ว่างบางวันที่เลือก'
      : 'ไม่ว่างในช่วงวันที่เลือก';

  return (
    <Modal visible transparent animationType="fade" hardwareAccelerated onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.detailSheetCard} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View style={styles.planIntroCopy}>
              <Text style={styles.sheetTitle}>{boothDisplayName(booth)}</Text>
              <Text style={styles.sheetMarketName}>
                {`${statusText} • ค่าเช่า ${formatMoney(booth.grossPrice)} บาท/วัน`}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetCloseButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.sheetSummaryRow}>
            <SummaryPill color="#14b879" label={`ว่าง ${availableDates.length} วัน`} />
            <SummaryPill color="#ef4444" label={`ไม่ว่าง ${unavailableDates.length} วัน`} />
            {booth.availabilityStatus === 'available' ? (
              <SummaryPill color="#f5b93f" label={`ล็อกชั่วคราว ${BOOTH_TEMP_LOCK_TTL_SECONDS / 60} นาที`} />
            ) : null}
          </View>

          <ScrollView style={styles.dateList} contentContainerStyle={styles.dateListContent}>
            {availabilityDates.map((item) => {
              const available = item.status === 'available';
              return (
                <View key={item.date} style={styles.dateRow}>
                  <View style={[styles.dateStatusDot, available ? styles.availableDot : styles.unavailableDot]} />
                  <Text style={styles.dateRowText}>{formatShortDate(item.date)}</Text>
                  <Text style={[styles.dateRowStatus, available ? styles.availableStatusText : styles.unavailableStatusText]}>
                    {available ? 'ว่าง' : item.status === 'processing' ? 'กำลังดำเนินการ' : 'ไม่ว่าง'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SummaryPill({color, label}: {color: string; label: string}) {
  return (
    <View style={styles.summaryPill}>
      <View style={[styles.legendDot, {backgroundColor: color}]} />
      <Text style={styles.summaryText}>{label}</Text>
    </View>
  );
}

const boothStatusStyles: Record<BoothAvailabilityStatus, {
  background: string;
  border: string;
  text: string;
}> = {
  available: {
    background: '#14b879',
    border: '#0f9f68',
    text: colors.white,
  },
  booked: {
    background: '#ef4444',
    border: '#dc2626',
    text: colors.white,
  },
  processing: {
    background: '#f5b93f',
    border: '#df9a13',
    text: '#5c3b00',
  },
  unavailable: {
    background: '#b9c2cc',
    border: '#9aa6b2',
    text: colors.white,
  },
};

function getBoothTileSize(width: number, columns: number) {
  const horizontalPadding = 44;
  const gapTotal = 8 * (columns - 1);
  const rawSize = (width - horizontalPadding - gapTotal) / columns;
  if (width >= 760) {
    return Math.min(88, Math.max(64, rawSize));
  }
  return Math.min(58, Math.max(46, rawSize));
}

function boothDisplayName(booth: Booth) {
  const label = booth.name || booth.code;
  return label.replace(/\bbooth\b/gi, '').replace(/\s{2,}/g, ' ').trim() || booth.code;
}

function normalizeBoothDates(booth: Booth, selectedDates: string[]) {
  const availabilityByDate = new Map((booth.availabilityDates || []).map((item) => [item.date, item.status]));
  return selectedDates.map((date) => ({
    date,
    status: availabilityByDate.get(date) || 'available',
  }));
}

function applyTempLocksToBooth(
  booth: Booth,
  selectedDates: string[],
  tempLocks: BoothTempLockMap,
  ownerId: string,
): Booth {
  const currentDates = normalizeBoothDates(booth, selectedDates).map((item) => {
    const lock = tempLocks.get(tempLockKey(booth.id, item.date));
    const status = lock
      ? availabilityStatusWithTempLock(item.status, [lock], ownerId)
      : item.status;
    return {...item, status};
  });
  const availableCount = currentDates.filter((item) => item.status === 'available').length;
  let availabilityStatus: BoothAvailabilityStatus = 'processing';
  if (booth.status !== 'active') {
    availabilityStatus = 'unavailable';
  } else if (availableCount === selectedDates.length) {
    availabilityStatus = 'available';
  } else if (availableCount === 0) {
    availabilityStatus = 'booked';
  }

  return {
    ...booth,
    availabilityStatus,
    availabilityDates: currentDates,
    availableDateCount: availableCount,
    unavailableDateCount: selectedDates.length - availableCount,
    selectedDateCount: selectedDates.length,
  };
}

function formatSelectedDateSummary(dates: string[]) {
  if (dates.length === 0) {
    return '';
  }
  if (dates.length === 1) {
    return formatShortDate(dates[0]);
  }
  return `${formatShortDate(dates[0])} - ${formatShortDate(dates[dates.length - 1])}`;
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function EmptyCard({text}: {text: string}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screenScroll: {
    padding: 22,
    paddingBottom: 122,
  },
  messageText: {
    marginTop: 12,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  detailHeaderRow: {
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
  planIntroIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIntroCopy: {
    flex: 1,
  },
  planEyebrow: {
    color: colors.tealDark,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '900',
  },
  planTitle: {
    marginTop: 2,
    color: colors.ink,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  planSubtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  shortcutRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  shortcutButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: '#effbf8',
    borderWidth: 1,
    borderColor: '#c8eee7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  shortcutText: {
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: '900',
  },
  boothHeaderCard: {
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
  boothLegendRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  legendItem: {
    minHeight: 30,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  boothGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
  },
  boothTile: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    overflow: 'hidden',
    ...shadow,
  },
  boothTileDisabled: {
    opacity: 0.74,
  },
  boothTileText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  boothPriceText: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    opacity: 0.88,
  },
  boothLoadingCard: {
    width: '100%',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 17, 31, 0.34)',
    justifyContent: 'flex-end',
  },
  detailSheetCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 26,
    maxHeight: '82%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 18,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  sheetMarketName: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  sheetCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSummaryRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryPill: {
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  summaryText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  dateList: {
    marginTop: 14,
    maxHeight: 300,
  },
  dateListContent: {
    gap: 8,
  },
  dateRow: {
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  dateStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  availableDot: {
    backgroundColor: '#14b879',
  },
  unavailableDot: {
    backgroundColor: '#ef4444',
  },
  dateRowText: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  dateRowStatus: {
    fontSize: 12,
    fontWeight: '900',
  },
  availableStatusText: {
    color: '#0f9f68',
  },
  unavailableStatusText: {
    color: '#dc2626',
  },
  emptyCard: {
    minHeight: 90,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default React.memo(BoothSelectionStep);
