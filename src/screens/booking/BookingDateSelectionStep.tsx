import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {type FloorPlan, type Market} from '../../services/markets';
import {colors, shadow} from '../../theme/colors';

function BookingDateSelectionStep({
  market,
  floorPlan,
  onBack,
  onConfirm,
}: {
  market: Market;
  floorPlan: FloorPlan;
  onBack: () => void;
  onConfirm: (dates: string[]) => void;
}) {
  const {width} = useWindowDimensions();
  const today = useMemo(() => toIsoDate(new Date()), []);
  const minDate = useMemo(() => normalizeDateString(floorPlan.startDate), [floorPlan.startDate]);
  const maxDate = useMemo(() => normalizeDateString(floorPlan.endDate), [floorPlan.endDate]);
  const minSelectableDate = useMemo(() => laterIsoDate(today, minDate), [minDate, today]);
  const [displayedMonth, setDisplayedMonth] = useState(() => startOfMonth(minSelectableDate || new Date()));
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const calendarWidth = useMemo(() => Math.min(width - 44, 400), [width]);
  const calendarGap = 6;
  const daySize = useMemo(
    () => Math.floor((calendarWidth - (calendarGap * 6)) / 7),
    [calendarWidth],
  );
  const calendarCells = useMemo(() => getMonthCalendarCells(displayedMonth), [displayedMonth]);
  const selectedDates = useMemo(() => getSelectedDates(rangeStart, rangeEnd), [rangeEnd, rangeStart]);
  const previousMonthDisabled = useMemo(
    () => isMonthBefore(addMonths(displayedMonth, -1), startOfMonth(minSelectableDate || today)),
    [displayedMonth, minSelectableDate, today],
  );
  const nextMonthDisabled = useMemo(
    () => Boolean(maxDate && isMonthAfter(addMonths(displayedMonth, 1), startOfMonth(maxDate))),
    [displayedMonth, maxDate],
  );

  const handleDatePress = useCallback((date: string) => {
    if (!rangeStart || rangeEnd || date < rangeStart) {
      setRangeStart(date);
      setRangeEnd('');
      return;
    }

    if (date === rangeStart) {
      setRangeEnd('');
      return;
    }

    setRangeEnd(date);
  }, [rangeEnd, rangeStart]);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.ink} />
            <Text style={styles.backText}>กลับ</Text>
          </Pressable>
        </View>

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <MaterialCommunityIcons name="calendar-month-outline" size={28} color={colors.tealDark} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.eyebrow}>{market.name}</Text>
            <Text style={styles.title}>เลือกวันที่ขาย</Text>
            <Text style={styles.subtitle}>{floorPlan.name}</Text>
          </View>
        </View>

        <View style={styles.calendarCard}>
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
                onPress={() => handleDatePress(cell.date)}
              />
            ))}
          </View>
        </View>

        <Text style={styles.selectionText}>
          {selectedDates.length > 0
            ? rangeEnd
              ? `เลือก ${selectedDates.length} วัน: ${formatShortDate(rangeStart)} - ${formatShortDate(rangeEnd)}`
              : `เลือก 1 วัน: ${formatShortDate(rangeStart)}`
            : 'เลือกได้ทั้งวันเดียวหรือช่วงวันที่'}
        </Text>
        {(minDate || maxDate) ? (
          <Text style={styles.activeDateText}>{formatActiveDateRange(minDate, maxDate)}</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footerBar}>
        <Pressable
          disabled={selectedDates.length === 0}
          style={[styles.confirmButton, selectedDates.length === 0 && styles.confirmButtonDisabled]}
          onPress={() => onConfirm(selectedDates)}>
          <Text style={styles.confirmButtonText}>ดูบูธว่าง</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

function CalendarDayButton({
  date,
  currentMonth,
  disabled,
  size,
  rangeStart,
  rangeEnd,
  onPress,
}: {
  date: string;
  currentMonth: boolean;
  disabled: boolean;
  size: number;
  rangeStart: string;
  rangeEnd: string;
  onPress: () => void;
}) {
  const selectable = currentMonth && !disabled;
  const inRange = selectable && Boolean(rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd);
  const isEdge = selectable && (date === rangeStart || date === rangeEnd || (!rangeEnd && date === rangeStart));
  const dateNumber = Number(date.slice(-2));

  return (
    <Pressable
      disabled={!selectable}
      onPress={onPress}
      style={[
        styles.calendarDay,
        {width: size, height: size},
        !selectable && styles.calendarDayMuted,
        inRange && styles.calendarDayInRange,
        isEdge && styles.calendarDayEdge,
      ]}>
      <Text style={[
        styles.calendarDayText,
        !selectable && styles.calendarDayTextMuted,
        (inRange || isEdge) && styles.calendarDayTextActive,
      ]}>
        {dateNumber}
      </Text>
    </Pressable>
  );
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

function getSelectedDates(startDate: string, endDate: string) {
  if (!startDate) {
    return [];
  }
  if (!endDate) {
    return [startDate];
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

function formatMonthTitle(monthStart: Date) {
  return new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(monthStart);
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

function formatActiveDateRange(minDate: string, maxDate: string) {
  if (minDate && maxDate) {
    return `โซนนี้เปิดใช้งาน ${formatShortDate(minDate)} - ${formatShortDate(maxDate)}`;
  }
  if (minDate) {
    return `โซนนี้เปิดใช้งานตั้งแต่ ${formatShortDate(minDate)}`;
  }
  return `โซนนี้เปิดใช้งานถึง ${formatShortDate(maxDate)}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screenScroll: {
    padding: 22,
    paddingBottom: 112,
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
  introCard: {
    minHeight: 118,
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
  introIcon: {
    width: 58,
    height: 58,
    borderRadius: 21,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.tealDark,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '900',
  },
  title: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  calendarCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 12,
    ...shadow,
  },
  monthHeader: {
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
  selectionText: {
    marginTop: 16,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
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
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    backgroundColor: 'rgba(247,251,251,0.94)',
  },
  confirmButton: {
    height: 56,
    borderRadius: 22,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  confirmButtonDisabled: {
    backgroundColor: '#a9b8c3',
    shadowOpacity: 0,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
});

export default React.memo(BookingDateSelectionStep);
