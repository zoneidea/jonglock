import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ApiLoadingState from '../../components/ApiLoadingState';
import {getMarketFloorPlans, type FloorPlan, type Market} from '../../services/markets';
import {colors, shadow} from '../../theme/colors';
import BookingSelectionModal, {marketToSelectionItem} from './BookingSelectionModal';

function FloorPlanSelectionStep({
  market,
  markets,
  onBack,
  onSelectMarket,
  onSelectFloorPlan,
}: {
  market: Market;
  markets: Market[];
  onBack: () => void;
  onSelectMarket: (market: Market) => void;
  onSelectFloorPlan: (floorPlan: FloorPlan) => void;
}) {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [marketModalOpen, setMarketModalOpen] = useState(false);
  const marketItems = useMemo(() => markets.map(marketToSelectionItem), [markets]);

  const loadFloorPlans = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setFloorPlans(await getMarketFloorPlans(market.id));
    } catch {
      setMessage('ยังไม่สามารถโหลดแผนผังหรือโซนได้');
    } finally {
      setLoading(false);
    }
  }, [market.id]);

  useEffect(() => {
    loadFloorPlans();
  }, [loadFloorPlans]);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <View style={styles.detailHeaderRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.ink} />
            <Text style={styles.backText}>กลับ</Text>
          </Pressable>
        </View>

        <View style={styles.planIntroCard}>
          <View style={styles.planIntroIcon}>
            <MaterialCommunityIcons name="map-outline" size={22} color={colors.tealDark} />
          </View>
          <View style={styles.planIntroCopy}>
            <Text style={styles.planEyebrow}>{market.code}</Text>
            <Text style={styles.planTitle}>เลือกแผนผัง/โซน</Text>
            <Text style={styles.planSubtitle}>{market.name}</Text>
          </View>
        </View>

        <View style={styles.shortcutRow}>
          <ShortcutButton icon="store-search-outline" label="เปลี่ยนตลาด" onPress={() => setMarketModalOpen(true)} />
        </View>

        <Text style={styles.planHelpText}>เลือกโซนที่ต้องการ ก่อนเข้าสู่ขั้นตอนการเลือกบูธ</Text>

        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.planList}>
          {loading && floorPlans.length === 0 ? (
            <>
              <ApiLoadingState label="กำลังโหลดแผนผัง/โซน" />
              <ApiLoadingState label="กำลังโหลดแผนผัง/โซน" />
            </>
          ) : null}
          {floorPlans.map((floorPlan) => (
            <FloorPlanCard
              key={floorPlan.id}
              floorPlan={floorPlan}
              onPress={() => onSelectFloorPlan(floorPlan)}
            />
          ))}
          {!loading && floorPlans.length === 0 ? (
            <EmptyCard text="ยังไม่มีแผนผังหรือโซนที่เปิดใช้งาน" />
          ) : null}
        </View>
      </ScrollView>
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
          onSelectMarket(nextMarket);
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

function FloorPlanCard({
  floorPlan,
  onPress,
}: {
  floorPlan: FloorPlan;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.planCard}>
      <View style={styles.planImageWrap}>
        {floorPlan.planImageUrl ? (
          <Image source={{uri: floorPlan.planImageUrl}} style={styles.planImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#e8fbf7', '#ffffff']} style={styles.planFallback}>
            <MaterialCommunityIcons name="map-marker-path" size={32} color={colors.tealDark} />
          </LinearGradient>
        )}
      </View>
      <View style={styles.planCardBody}>
        <View style={styles.planCardHeader}>
          <View style={styles.planCardCopy}>
            <Text style={styles.planName}>{floorPlan.name}</Text>
            <Text style={styles.planDate}>{formatPlanDateRange(floorPlan.startDate, floorPlan.endDate)}</Text>
          </View>
          <View style={styles.planStatusBadge}>
            <Text style={styles.planStatusText}>เปิดจอง</Text>
          </View>
        </View>
        <View style={styles.planStatsRow}>
          <View style={styles.planStatPill}>
            <MaterialCommunityIcons name="storefront-outline" size={16} color={colors.tealDark} />
            <Text style={styles.planStatText}>{`${floorPlan.boothCount} บูธ`}</Text>
          </View>
          <Pressable onPress={onPress} style={styles.planSelectButton}>
            <Text style={styles.planSelectButtonText}>เลือกผังนี้</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function formatPlanDateRange(startDate?: string | null, endDate?: string | null) {
  const start = formatShortDate(startDate);
  const end = formatShortDate(endDate);

  if (start && end) {
    return `${start} - ${end}`;
  }
  if (start) {
    return `เริ่ม ${start}`;
  }
  if (end) {
    return `ถึง ${end}`;
  }
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
  messageText: {
    marginTop: 12,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  planIntroCard: {
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
  planHelpText: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '800',
  },
  planList: {
    marginTop: 14,
    gap: 14,
  },
  planCard: {
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  planImageWrap: {
    height: 78,
    backgroundColor: colors.soft,
  },
  planImage: {
    width: '100%',
    height: '100%',
  },
  planFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardBody: {
    padding: 12,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  planCardCopy: {
    flex: 1,
  },
  planName: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  planDate: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  planStatusBadge: {
    borderRadius: 999,
    backgroundColor: '#e6fbf6',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  planStatusText: {
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: '900',
  },
  planStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  planStatPill: {
    minHeight: 38,
    borderRadius: 15,
    backgroundColor: colors.soft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  planStatText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  planSelectButton: {
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingLeft: 14,
    paddingRight: 10,
  },
  planSelectButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
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

export default React.memo(FloorPlanSelectionStep);
