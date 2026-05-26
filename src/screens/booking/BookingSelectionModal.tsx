import React, {useCallback, useMemo, useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {type FloorPlan, type Market} from '../../services/markets';
import {colors, shadow} from '../../theme/colors';

type SelectionItem = {
  id: number;
  title: string;
  subtitle: string;
  badge?: string;
};

function BookingSelectionModal({
  open,
  title,
  searchPlaceholder,
  emptyText,
  items,
  selectedId,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  items: SelectionItem[];
  selectedId?: number | null;
  onClose: () => void;
  onSelect: (id: number) => void;
}) {
  const [query, setQuery] = useState('');
  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return items;
    }
    return items.filter((item) =>
      [item.title, item.subtitle, item.badge]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [items, query]);

  const renderItem = useCallback(({item}: {item: SelectionItem}) => {
    const selected = item.id === selectedId;
    return (
      <Pressable
        onPress={() => onSelect(item.id)}
        style={[styles.optionCard, selected && styles.optionCardSelected]}>
        <View style={styles.optionIcon}>
          <MaterialCommunityIcons
            name={selected ? 'check-circle' : 'storefront-outline'}
            size={20}
            color={selected ? colors.tealDark : colors.muted}
          />
        </View>
        <View style={styles.optionCopy}>
          <Text style={styles.optionTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.optionSubtitle} numberOfLines={2}>{item.subtitle || '-'}</Text>
        </View>
        {item.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }, [onSelect, selectedId]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{emptyText}</Text>
    </View>
  ), [emptyText]);

  return (
    <Modal visible={open} transparent animationType="fade" hardwareAccelerated onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={21} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor="#8fa2b2"
              style={styles.searchInput}
              autoCapitalize="none"
              selectionColor={colors.teal}
            />
          </View>

          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={filteredItems}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </View>
      </View>
    </Modal>
  );
}

export function marketToSelectionItem(market: Market): SelectionItem {
  return {
    id: market.id,
    title: market.name,
    subtitle: [market.code, market.address].filter(Boolean).join(' • '),
    badge: market.code,
  };
}

export function floorPlanToSelectionItem(floorPlan: FloorPlan): SelectionItem {
  return {
    id: floorPlan.id,
    title: floorPlan.name,
    subtitle: formatPlanDateRange(floorPlan.startDate, floorPlan.endDate),
    badge: `${floorPlan.boothCount || 0} บูธ`,
  };
}

function formatPlanDateRange(startDate?: string | null, endDate?: string | null) {
  const start = formatShortDate(startDate);
  const end = formatShortDate(endDate);
  if (start && end) {return `${start} - ${end}`;}
  if (start) {return `เริ่ม ${start}`;}
  if (end) {return `ถึง ${end}`;}
  return 'เปิดตามช่วงเวลาของตลาด';
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 17, 31, 0.36)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 26,
    ...shadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    marginTop: 14,
    height: 46,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    padding: 0,
  },
  list: {
    marginTop: 12,
  },
  listContent: {
    gap: 10,
    paddingBottom: 8,
  },
  optionCard: {
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  optionCardSelected: {
    backgroundColor: '#effbf8',
    borderColor: '#b8e9df',
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  optionSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  badge: {
    borderRadius: 999,
    backgroundColor: colors.white,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  badgeText: {
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: '900',
  },
  emptyCard: {
    minHeight: 86,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default React.memo(BookingSelectionModal);
