import React, {useCallback, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

import AppDialog from '../../components/AppDialog';
import ApiLoadingState from '../../components/ApiLoadingState';
import {
  checkBoothAvailability,
  getFloorPlanBooths,
  type Booth,
  type BoothAvailabilityStatus,
  type BoothDateAvailability,
  type FloorPlan,
  type Market,
} from '../../services/markets';
import {colors, shadow} from '../../theme/colors';

const FAVORITE_BOOTHS_KEY = 'jonglock.favoriteBooths';

function BoothSelectionStep({
  market,
  floorPlan,
  onBack,
}: {
  market: Market;
  floorPlan: FloorPlan;
  onBack: () => void;
}) {
  const {width} = useWindowDimensions();
  const columns = useMemo(() => getBoothGridColumns(width), [width]);
  const tileSize = useMemo(() => getBoothTileSize(width, columns), [columns, width]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [favoriteBoothIds, setFavoriteBoothIds] = useState<number[]>([]);
  const [favoriteBooth, setFavoriteBooth] = useState<Booth | null>(null);
  const [bookingBooth, setBookingBooth] = useState<Booth | null>(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [dateAvailability, setDateAvailability] = useState<BoothDateAvailability[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectionDialog, setSelectionDialog] = useState('');
  const currentDate = useMemo(() => toIsoDate(new Date()), []);
  const planStartDate = useMemo(() => normalizeDateString(floorPlan.startDate), [floorPlan.startDate]);
  const planEndDate = useMemo(() => normalizeDateString(floorPlan.endDate), [floorPlan.endDate]);

  const loadBooths = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setBooths(await getFloorPlanBooths(floorPlan.id, currentDate));
    } catch {
      setMessage('ยังไม่สามารถโหลดข้อมูลบูธได้');
    } finally {
      setLoading(false);
    }
  }, [currentDate, floorPlan.id]);

  useEffect(() => {
    loadBooths();
  }, [loadBooths]);

  useEffect(() => {
    let mounted = true;

    async function loadFavorites() {
      try {
        const raw = await AsyncStorage.getItem(FAVORITE_BOOTHS_KEY);
        const ids = raw ? (JSON.parse(raw) as number[]) : [];
        if (mounted) {
          setFavoriteBoothIds(Array.isArray(ids) ? ids : []);
        }
      } catch {
        if (mounted) {
          setFavoriteBoothIds([]);
        }
      }
    }

    loadFavorites();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const selectedDates = getDateRange(rangeStart, rangeEnd);

    if (!bookingBooth || selectedDates.length === 0) {
      setDateAvailability([]);
      setCheckingAvailability(false);
      return () => {
        mounted = false;
      };
    }

    const boothId = bookingBooth.id;
    async function verifyDates() {
      setCheckingAvailability(true);
      try {
        const result = await checkBoothAvailability(boothId, selectedDates);
        if (mounted) {
          setDateAvailability(result?.dates || []);
        }
      } catch {
        if (mounted) {
          setDateAvailability(selectedDates.map((date) => ({date, status: 'unavailable'})));
        }
      } finally {
        if (mounted) {
          setCheckingAvailability(false);
        }
      }
    }

    verifyDates();

    return () => {
      mounted = false;
    };
  }, [bookingBooth, rangeEnd, rangeStart]);

  const openBooth = useCallback((booth: Booth) => {
    if (booth.availabilityStatus === 'available') {
      setBookingBooth(booth);
      setRangeStart('');
      setRangeEnd('');
      setDateAvailability([]);
      return;
    }
    if (booth.availabilityStatus === 'processing') {
      setFavoriteBooth(booth);
    }
  }, []);

  const toggleFavorite = useCallback(async (boothId: number) => {
    const nextIds = favoriteBoothIds.includes(boothId)
      ? favoriteBoothIds.filter((id) => id !== boothId)
      : [...favoriteBoothIds, boothId];
    setFavoriteBoothIds(nextIds);
    await AsyncStorage.setItem(FAVORITE_BOOTHS_KEY, JSON.stringify(nextIds));
  }, [favoriteBoothIds]);

  const handleDatePress = useCallback((date: string) => {
    if (!rangeStart || (rangeStart && rangeEnd) || date < rangeStart) {
      setRangeStart(date);
      setRangeEnd('');
      setDateAvailability([]);
      return;
    }

    setRangeEnd(date);
  }, [rangeEnd, rangeStart]);

  const confirmDateRange = useCallback(() => {
    if (!bookingBooth) {
      return;
    }
    const selectedDates = getDateRange(rangeStart, rangeEnd);
    const availabilityByDate = new Map(dateAvailability.map((item) => [item.date, item.status]));
    const availableDates = selectedDates.filter((date) => availabilityByDate.get(date) === 'available');
    const removedCount = selectedDates.length - availableDates.length;
    setBookingBooth(null);
    setRangeStart('');
    setRangeEnd('');
    setDateAvailability([]);
    setSelectionDialog(
      removedCount > 0
        ? `เลือกบูธ ${boothLabel(bookingBooth)} จำนวน ${availableDates.length} วัน ระบบตัดวันที่ไม่ว่างออก ${removedCount} วันแล้ว`
        : `เลือกบูธ ${boothLabel(bookingBooth)} จำนวน ${availableDates.length} วัน`,
    );
  }, [bookingBooth, dateAvailability, rangeEnd, rangeStart]);

  const selectedRangeDates = useMemo(() => getDateRange(rangeStart, rangeEnd), [rangeEnd, rangeStart]);
  const unavailableSelectedCount = useMemo(
    () => dateAvailability.filter((item) => item.status !== 'available').length,
    [dateAvailability],
  );
  const canConfirmDates = Boolean(
    bookingBooth
      && rangeStart
      && rangeEnd
      && selectedRangeDates.length > 0
      && dateAvailability.length === selectedRangeDates.length
      && !checkingAvailability,
  );

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
            <MaterialCommunityIcons name="view-grid-outline" size={28} color={colors.tealDark} />
          </View>
          <View style={styles.planIntroCopy}>
            <Text style={styles.planEyebrow}>{market.name}</Text>
            <Text style={styles.planTitle}>เลือกบูธ</Text>
            <Text style={styles.planSubtitle}>{floorPlan.name}</Text>
          </View>
        </View>

        <View style={styles.boothLegendRow}>
          <LegendDot color="#14b879" label="ว่าง" />
          <LegendDot color="#ef4444" label="จองแล้ว" />
          <LegendDot color="#f5b93f" label="กำลังดำเนินการ" />
          <LegendDot color="#b9c2cc" label="ไม่พร้อมใช้" />
        </View>

        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.boothGrid}>
          {loading && booths.length === 0 ? (
            <>
              <ApiLoadingState label="กำลังโหลดบูธ" style={styles.boothLoadingCard} />
              <ApiLoadingState label="กำลังโหลดบูธ" style={styles.boothLoadingCard} />
            </>
          ) : null}
          {booths.map((booth) => (
            <BoothTile
              key={booth.id}
              booth={booth}
              size={tileSize}
              favorite={favoriteBoothIds.includes(booth.id)}
              onPress={() => openBooth(booth)}
            />
          ))}
          {!loading && booths.length === 0 ? <EmptyCard text="ยังไม่มีบูธในแผนผังนี้" /> : null}
        </View>
      </ScrollView>

      <FavoriteBoothSheet
        booth={favoriteBooth}
        favorite={favoriteBooth ? favoriteBoothIds.includes(favoriteBooth.id) : false}
        onClose={() => setFavoriteBooth(null)}
        onToggleFavorite={async () => {
          if (favoriteBooth) {
            await toggleFavorite(favoriteBooth.id);
          }
        }}
      />

      <BookingDateSheet
        booth={bookingBooth}
        minDate={planStartDate}
        maxDate={planEndDate}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        dateAvailability={dateAvailability}
        checking={checkingAvailability}
        unavailableCount={unavailableSelectedCount}
        canConfirm={canConfirmDates}
        onClose={() => setBookingBooth(null)}
        onDatePress={handleDatePress}
        onConfirm={confirmDateRange}
      />

      <AppDialog
        visible={Boolean(selectionDialog)}
        icon="calendar-check-outline"
        title="เลือกวันที่จองแล้ว"
        message={selectionDialog}
        confirmLabel="ตกลง"
        onCancel={() => setSelectionDialog('')}
        onConfirm={() => setSelectionDialog('')}
      />
    </View>
  );
}

function BoothTile({
  booth,
  size,
  favorite,
  onPress,
}: {
  booth: Booth;
  size: number;
  favorite: boolean;
  onPress: () => void;
}) {
  const disabled = booth.availabilityStatus === 'booked' || booth.availabilityStatus === 'unavailable';
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
      {favorite ? (
        <MaterialCommunityIcons name="heart" size={13} color={colors.white} style={styles.boothFavoriteIcon} />
      ) : null}
      <Text style={[styles.boothTileText, {color: statusStyle.text}]} numberOfLines={1} adjustsFontSizeToFit>
        {boothLabel(booth)}
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

function FavoriteBoothSheet({
  booth,
  favorite,
  onClose,
  onToggleFavorite,
}: {
  booth: Booth | null;
  favorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => Promise<void>;
}) {
  if (!booth) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" hardwareAccelerated onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.compactSheetCard} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>บูธกำลังดำเนินการ</Text>
          <Text style={styles.sheetMarketName}>
            {`${boothLabel(booth)} • ค่าเช่า ${formatMoney(booth.grossPrice)} บาท`}
          </Text>
          <Text style={styles.favoriteSheetCopy}>
            บูธนี้มีผู้เลือกแล้วและอยู่ระหว่างดำเนินการ สามารถบันทึกเป็น Favorite ไว้ติดตามได้
          </Text>
          <Pressable style={styles.sheetActionButton} onPress={onToggleFavorite}>
            <MaterialCommunityIcons name={favorite ? 'heart' : 'heart-outline'} size={20} color={colors.white} />
            <Text style={styles.sheetActionButtonText}>
              {favorite ? 'บันทึก Favorite แล้ว' : 'บันทึก Favorite'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BookingDateSheet({
  booth,
  minDate,
  maxDate,
  rangeStart,
  rangeEnd,
  dateAvailability,
  checking,
  unavailableCount,
  canConfirm,
  onClose,
  onDatePress,
  onConfirm,
}: {
  booth: Booth | null;
  minDate: string;
  maxDate: string;
  rangeStart: string;
  rangeEnd: string;
  dateAvailability: BoothDateAvailability[];
  checking: boolean;
  unavailableCount: number;
  canConfirm: boolean;
  onClose: () => void;
  onDatePress: (date: string) => void;
  onConfirm: () => void;
}) {
  const {width} = useWindowDimensions();
  const today = useMemo(() => toIsoDate(new Date()), []);
  const minSelectableDate = useMemo(() => laterIsoDate(today, minDate), [minDate, today]);
  const [displayedMonth, setDisplayedMonth] = useState(() => (
    startOfMonth(rangeStart || minSelectableDate || new Date())
  ));
  const calendarWidth = useMemo(() => Math.min(width - 36, 392), [width]);
  const calendarGap = 6;
  const daySize = useMemo(
    () => Math.floor((calendarWidth - (calendarGap * 6)) / 7),
    [calendarWidth],
  );
  const calendarCells = useMemo(() => getMonthCalendarCells(displayedMonth), [displayedMonth]);
  const availabilityByDate = useMemo(
    () => new Map(dateAvailability.map((item) => [item.date, item.status])),
    [dateAvailability],
  );
  const previousMonthDisabled = useMemo(
    () => isMonthBefore(addMonths(displayedMonth, -1), startOfMonth(minSelectableDate || today)),
    [displayedMonth, minSelectableDate, today],
  );
  const nextMonthDisabled = useMemo(
    () => Boolean(maxDate && isMonthAfter(addMonths(displayedMonth, 1), startOfMonth(maxDate))),
    [displayedMonth, maxDate],
  );

  if (!booth) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" hardwareAccelerated onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.dateSheetCard} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.dateSheetHeader}>
            <View style={styles.planIntroCopy}>
              <Text style={styles.sheetTitle}>เลือกวันที่จอง</Text>
              <Text style={styles.sheetMarketName}>
                {`${boothLabel(booth)} • ค่าเช่า ${formatMoney(booth.grossPrice)} บาท/วัน`}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetCloseButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <View style={[styles.monthHeader, {width: calendarWidth}]}>
            <Pressable
              disabled={previousMonthDisabled}
              onPress={() => setDisplayedMonth((currentMonth) => addMonths(currentMonth, -1))}
              style={[styles.monthNavButton, previousMonthDisabled && styles.monthNavButtonDisabled]}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color={previousMonthDisabled ? '#aebbc7' : colors.ink}
              />
            </Pressable>
            <Text style={styles.monthTitle}>{formatMonthTitle(displayedMonth)}</Text>
            <Pressable
              disabled={nextMonthDisabled}
              onPress={() => setDisplayedMonth((currentMonth) => addMonths(currentMonth, 1))}
              style={[styles.monthNavButton, nextMonthDisabled && styles.monthNavButtonDisabled]}>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={nextMonthDisabled ? '#aebbc7' : colors.ink}
              />
            </Pressable>
          </View>

          <View style={[styles.weekHeader, {width: calendarWidth}]}>
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
              <Text key={day} style={[styles.weekHeaderText, {width: daySize}]}>{day}</Text>
            ))}
          </View>
          <View style={[styles.calendarGrid, {width: calendarWidth, gap: calendarGap}]}>
            {calendarCells.map((cell, index) => (
              <CalendarDayButton
                key={`${cell.date}-${index}`}
                date={cell.date}
                currentMonth={cell.currentMonth}
                disabled={cell.date < today || isDateOutsideRange(cell.date, minDate, maxDate)}
                size={daySize}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                status={cell.currentMonth ? availabilityByDate.get(cell.date) : undefined}
                onPress={() => onDatePress(cell.date)}
              />
            ))}
          </View>

          <Text style={styles.dateRangeText}>
            {rangeStart && rangeEnd
              ? `ช่วงวันที่ ${formatShortDate(rangeStart)} - ${formatShortDate(rangeEnd)}`
              : 'แตะวันที่เริ่มต้นและวันที่สิ้นสุดเพื่อเลือกช่วงวันที่'}
          </Text>
          {(minDate || maxDate) ? (
            <Text style={styles.activeDateText}>{formatActiveDateRange(minDate, maxDate)}</Text>
          ) : null}
          {checking ? <Text style={styles.dateCheckText}>กำลังตรวจสอบวันที่ว่าง...</Text> : null}
          {!checking && unavailableCount > 0 ? (
            <Text style={styles.dateWarningText}>
              พบวันที่ไม่ว่าง {unavailableCount} วัน ระบบจะตัดออกอัตโนมัติเมื่อยืนยัน
            </Text>
          ) : null}

          <Pressable
            disabled={!canConfirm}
            style={[styles.sheetActionButton, !canConfirm && styles.disabledActionButton]}
            onPress={onConfirm}>
            <Text style={styles.sheetActionButtonText}>ยืนยันวันที่ว่าง</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CalendarDayButton({
  date,
  currentMonth,
  disabled,
  size,
  rangeStart,
  rangeEnd,
  status,
  onPress,
}: {
  date: string;
  currentMonth: boolean;
  disabled: boolean;
  size: number;
  rangeStart: string;
  rangeEnd: string;
  status?: BoothAvailabilityStatus;
  onPress: () => void;
}) {
  const selectable = currentMonth && !disabled;
  const inRange = selectable && Boolean(rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd);
  const isEdge = selectable && (date === rangeStart || date === rangeEnd);
  const dateNumber = Number(date.slice(-2));
  const statusStyle = status ? boothStatusStyles[status] : null;

  return (
    <Pressable
      disabled={!selectable}
      onPress={onPress}
      style={[
        styles.calendarDay,
        {
          width: size,
          height: size,
        },
        !selectable && styles.calendarDayMuted,
        inRange && styles.calendarDayInRange,
        isEdge && styles.calendarDayEdge,
        statusStyle && {
          backgroundColor: statusStyle.calendarBackground,
          borderColor: statusStyle.border,
        },
      ]}>
      <Text
        style={[
          styles.calendarDayText,
          !selectable && styles.calendarDayTextMuted,
          (inRange || statusStyle) && styles.calendarDayTextActive,
          statusStyle && {color: statusStyle.text},
        ]}>
        {dateNumber}
      </Text>
    </Pressable>
  );
}

const boothStatusStyles: Record<BoothAvailabilityStatus, {
  background: string;
  calendarBackground: string;
  border: string;
  text: string;
}> = {
  available: {
    background: '#14b879',
    calendarBackground: '#dff8ea',
    border: '#0f9f68',
    text: colors.white,
  },
  booked: {
    background: '#ef4444',
    calendarBackground: '#fee2e2',
    border: '#dc2626',
    text: colors.white,
  },
  processing: {
    background: '#f5b93f',
    calendarBackground: '#fff3cf',
    border: '#df9a13',
    text: '#5c3b00',
  },
  unavailable: {
    background: '#b9c2cc',
    calendarBackground: '#edf1f5',
    border: '#9aa6b2',
    text: colors.white,
  },
};

function getBoothGridColumns(width: number) {
  if (width >= 760) {
    return 6;
  }
  if (width >= 390) {
    return 5;
  }
  return 4;
}

function getBoothTileSize(width: number, columns: number) {
  const horizontalPadding = 44;
  const gapTotal = 8 * (columns - 1);
  const rawSize = (width - horizontalPadding - gapTotal) / columns;
  if (width >= 760) {
    return Math.min(98, Math.max(82, rawSize));
  }
  return Math.min(74, Math.max(62, rawSize));
}

function boothLabel(booth: Booth) {
  return booth.name || booth.code;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateString(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return toIsoDate(date);
}

function laterIsoDate(dateA: string, dateB: string) {
  if (!dateA) {
    return dateB;
  }
  if (!dateB) {
    return dateA;
  }
  return dateA > dateB ? dateA : dateB;
}

function isDateOutsideRange(date: string, minDate: string, maxDate: string) {
  return Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date.getFullYear(), date.getMonth() + months, 1);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function startOfMonth(value: string | Date) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  const monthStart = new Date(date);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
}

function monthKey(date: Date) {
  return (date.getFullYear() * 12) + date.getMonth();
}

function isMonthBefore(date: Date, comparison: Date) {
  return monthKey(date) < monthKey(comparison);
}

function isMonthAfter(date: Date, comparison: Date) {
  return monthKey(date) > monthKey(comparison);
}

function getMonthCalendarCells(monthStart: Date) {
  const firstDay = startOfMonth(monthStart);
  const gridStart = addDays(firstDay, -firstDay.getDay());
  return Array.from({length: 42}, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date: toIsoDate(date),
      currentMonth: date.getMonth() === firstDay.getMonth(),
    };
  });
}

function formatMonthTitle(monthStart: Date) {
  return new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(monthStart);
}

function formatActiveDateRange(minDate: string, maxDate: string) {
  if (minDate && maxDate) {
    return `โซนนี้เปิดใช้งาน ${formatShortDate(minDate)} - ${formatShortDate(maxDate)}`;
  }
  if (minDate) {
    return `โซนนี้เปิดใช้งานตั้งแต่ ${formatShortDate(minDate)}`;
  }
  return `โซนนี้เปิดใช้งานถึง ${formatShortDate(maxDate)}`;
}

function getDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return [];
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
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
    width: 58,
    height: 58,
    borderRadius: 21,
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
    marginTop: 4,
    color: colors.ink,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  planSubtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  boothHeaderCard: {
    minHeight: 104,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
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
    gap: 8,
  },
  boothTile: {
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    overflow: 'hidden',
    ...shadow,
  },
  boothTileDisabled: {
    opacity: 0.74,
  },
  boothTileText: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  boothFavoriteIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  boothLoadingCard: {
    width: '100%',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 17, 31, 0.34)',
    justifyContent: 'flex-end',
  },
  compactSheetCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 26,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 18,
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
  favoriteSheetCopy: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '800',
  },
  sheetActionButton: {
    marginTop: 18,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  sheetActionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  dateSheetCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  dateSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  monthHeader: {
    marginTop: 18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavButtonDisabled: {
    backgroundColor: '#f2f5f7',
    borderColor: '#edf1f4',
  },
  monthTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
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
  weekHeader: {
    marginTop: 14,
    flexDirection: 'row',
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  weekHeaderText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: {
    marginTop: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  calendarDayMuted: {
    backgroundColor: '#f4f7f9',
    borderColor: '#edf1f4',
  },
  calendarDayInRange: {
    backgroundColor: '#e4fbf8',
    borderColor: '#a9e8df',
  },
  calendarDayEdge: {
    backgroundColor: colors.teal,
    borderColor: colors.tealDark,
  },
  calendarDayText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  calendarDayTextMuted: {
    color: '#c3ced8',
  },
  calendarDayTextActive: {
    color: colors.white,
  },
  dateRangeText: {
    marginTop: 14,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  activeDateText: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  dateCheckText: {
    marginTop: 8,
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  dateWarningText: {
    marginTop: 8,
    color: '#b45309',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  disabledActionButton: {
    backgroundColor: '#a9b8c3',
    shadowOpacity: 0,
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
