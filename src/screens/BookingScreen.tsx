import React, {useCallback, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Camera, useCameraDevice, useCameraPermission, useCodeScanner} from 'react-native-vision-camera';

import type {AppDeepLink} from '../../App';
import AppDialog from '../components/AppDialog';
import ApiLoadingState from '../components/ApiLoadingState';
import {
  getMarket,
  getMarketFloorPlans,
  getMarkets,
  warmMarketFloorPlans,
  type Booth,
  type BoothHoldResult,
  type FloorPlan,
  type Market,
} from '../services/markets';
import {registerPushDeviceToken} from '../services/notifications';
import {colors, shadow} from '../theme/colors';
import type {MobileUser} from '../types/user';
import BookingDateSelectionStep from './booking/BookingDateSelectionStep';
import BookingSummaryStep from './booking/BookingSummaryStep';
import BoothSelectionStep from './booking/BoothSelectionStep';
import FloorPlanSelectionStep from './booking/FloorPlanSelectionStep';

const MARKET_TERMS_DISMISSED_KEY = 'jonglock.marketTerms.dismissed';

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
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

function isDateInFloorPlanRange(date: string, floorPlan: FloorPlan) {
  const startDate = normalizeDateString(floorPlan.startDate);
  const endDate = normalizeDateString(floorPlan.endDate);
  if (startDate && date < startDate) {
    return false;
  }
  if (endDate && date > endDate) {
    return false;
  }
  return true;
}

function floorPlanContainsDates(floorPlan: FloorPlan, dates: string[]) {
  return dates.every((date) => isDateInFloorPlanRange(date, floorPlan));
}

function findFloorPlanForDates(floorPlans: FloorPlan[], dates: string[]) {
  return floorPlans.find((floorPlan) => floorPlanContainsDates(floorPlan, dates)) || null;
}

function parseMarketDeepLinkValue(value: string) {
  try {
    const parsed = new URL(value);
    const customSchemeMarket = parsed.protocol === 'jonglock:' && parsed.hostname === 'market';
    const universalMarket = /^https?:$/i.test(parsed.protocol) && parsed.pathname.replace(/\/+$/, '') === '/market';
    if (!customSchemeMarket && !universalMarket) {
      return null;
    }
    return {
      marketId: parsed.searchParams.get('marketId') || '',
      marketCode: parsed.searchParams.get('marketCode') || '',
    };
  } catch {
    return null;
  }
}

function BookingScreen({
  user,
  onRequireAuth,
  onBottomTabHiddenChange,
  onCartChanged,
  onOpenCart,
  deepLink,
  onDeepLinkConsumed,
}: {
  user: MobileUser | null;
  onRequireAuth: () => void;
  onBottomTabHiddenChange?: (hidden: boolean) => void;
  onCartChanged?: () => void;
  onOpenCart?: () => void;
  deepLink: AppDeepLink | null;
  onDeepLinkConsumed: () => void;
}) {
  const [query, setQuery] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [floorPlanMarket, setFloorPlanMarket] = useState<Market | null>(null);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [selectedBookingDates, setSelectedBookingDates] = useState<string[]>([]);
  const [bookingHold, setBookingHold] = useState<BoothHoldResult | null>(null);
  const [reservedBooth, setReservedBooth] = useState<Booth | null>(null);
  const [marketDetailLoading, setMarketDetailLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  const filteredMarkets = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return markets;
    }
    return markets.filter((market) =>
      [market.name, market.code, market.address]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [markets, query]);

  const loadMarkets = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setMarkets(await getMarkets());
    } catch {
      setMessage('ยังไม่สามารถโหลดรายการตลาดได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  const handleRefreshMarkets = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMarkets();
    } finally {
      setRefreshing(false);
    }
  }, [loadMarkets]);

  const selectMarket = useCallback(async (market: Market) => {
    setSelectedMarket(market);
    setMarketDetailLoading(true);
    try {
      const [latest] = await Promise.all([
        getMarket(market.id),
        warmMarketFloorPlans(market.id),
      ]);
      if (latest) {
        setSelectedMarket(latest);
      }
    } catch {
      // The list already contains enough detail for the MVP view.
    } finally {
      setMarketDetailLoading(false);
    }
  }, []);

  const selectBookingMarket = useCallback(async (market: Market) => {
    setSelectedMarket(null);
    setFloorPlanMarket(market);
    setSelectedFloorPlan(null);
    setSelectedBookingDates([]);
    setBookingHold(null);
    setReservedBooth(null);
    setFloorPlans([]);
    try {
      const [latest, plans] = await Promise.all([
        getMarket(market.id),
        getMarketFloorPlans(market.id),
      ]);
      if (latest) {
        setFloorPlanMarket(latest);
      }
      setFloorPlans(plans);
    } catch {
      setFloorPlans([]);
    }
  }, []);

  const selectBookingFloorPlan = useCallback((floorPlan: FloorPlan) => {
    setSelectedBookingDates([]);
    setBookingHold(null);
    setReservedBooth(null);
    setSelectedFloorPlan(floorPlan);
  }, []);

  const selectBoothMarket = useCallback(async (market: Market) => {
    setSelectedMarket(null);
    setFloorPlanMarket(market);
    setSelectedFloorPlan(null);
    setBookingHold(null);
    setReservedBooth(null);
    setFloorPlans([]);
    try {
      const [latest, plans] = await Promise.all([
        getMarket(market.id),
        getMarketFloorPlans(market.id),
      ]);
      if (latest) {
        setFloorPlanMarket(latest);
      }
      setFloorPlans(plans);
      setSelectedFloorPlan(findFloorPlanForDates(plans, selectedBookingDates));
    } catch {
      setFloorPlans([]);
      setSelectedFloorPlan(null);
    }
  }, [selectedBookingDates]);

  const selectBoothFloorPlan = useCallback((floorPlan: FloorPlan) => {
    setSelectedFloorPlan(floorPlan);
    setBookingHold(null);
    setReservedBooth(null);
    if (!floorPlanContainsDates(floorPlan, selectedBookingDates)) {
      setSelectedBookingDates([]);
    }
  }, [selectedBookingDates]);

  const openScanner = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setMessage('กรุณาอนุญาตใช้กล้องเพื่อสแกนคิวอาร์โค้ด');
        return;
      }
    }
    setScannerLocked(false);
    setScannerOpen(true);
  }, [hasPermission, requestPermission]);

  const handleScannedValue = useCallback((value: string) => {
    const cleanValue = value.trim();
    if (!cleanValue) {
      return;
    }
    setQuery(cleanValue);
    setScannerOpen(false);
    setScannerLocked(false);

    const deeplink = parseMarketDeepLinkValue(cleanValue);
    const matchedMarket = markets.find((market) =>
      (deeplink?.marketId && String(market.id) === String(deeplink.marketId))
      || (deeplink?.marketCode && market.code.toLowerCase() === deeplink.marketCode.toLowerCase())
      || cleanValue.toLowerCase().includes(market.code.toLowerCase())
      || cleanValue.toLowerCase().includes(String(market.id)),
    );
    if (matchedMarket) {
      selectMarket(matchedMarket);
    }
  }, [markets, selectMarket]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128'],
    onCodeScanned: (codes) => {
      if (scannerLocked) {
        return;
      }
      const value = codes[0]?.value;
      if (value) {
        setScannerLocked(true);
        handleScannedValue(value);
      }
    },
  });

  const renderMarketCard = useCallback(({item}: {item: Market}) => (
    <MarketListCard market={item} onPress={() => selectMarket(item)} />
  ), [selectMarket]);

  useEffect(() => {
    if (!deepLink || deepLink.type !== 'market' || !markets.length) {
      return;
    }
    const matchedMarket = markets.find((market) =>
      (deepLink.marketId && String(market.id) === String(deepLink.marketId))
      || (deepLink.marketCode && String(market.code).toLowerCase() === String(deepLink.marketCode).toLowerCase()),
    );
    if (matchedMarket) {
      selectMarket(matchedMarket);
    }
    onDeepLinkConsumed();
  }, [deepLink, markets, onDeepLinkConsumed, selectMarket]);

  useEffect(() => {
    const organizationId = selectedMarket?.organizationId || floorPlanMarket?.organizationId;
    if (!user?.email || !organizationId) {
      return;
    }
    registerPushDeviceToken({user, organizationId}).catch(() => undefined);
  }, [floorPlanMarket?.organizationId, selectedMarket?.organizationId, user]);

  const renderMarketListHeader = useCallback(() => (
    <>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={22} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ค้นหาชื่อตลาดหรือรหัสตลาด"
            placeholderTextColor="#8fa2b2"
            style={styles.searchInput}
            autoCapitalize="none"
            selectionColor={colors.teal}
          />
        </View>
        <Pressable onPress={openScanner} style={styles.scanButton}>
          <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.white} />
        </Pressable>
      </View>

      {message ? <Text style={styles.messageText}>{message}</Text> : null}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>ตลาดทั้งหมด</Text>
        <Text style={styles.sectionCaption}>{`${filteredMarkets.length} ตลาด`}</Text>
      </View>
    </>
  ), [filteredMarkets.length, message, openScanner, query]);

  const renderMarketEmpty = useCallback(() => (
    loading ? <ApiLoadingState label="กำลังโหลดรายการตลาด" /> : <EmptyCard text="ไม่มีรายการตลาด" />
  ), [loading]);

  const isSummaryStep = Boolean(floorPlanMarket && selectedFloorPlan && bookingHold && reservedBooth);
  useEffect(() => {
    onBottomTabHiddenChange?.(isSummaryStep);
    return () => onBottomTabHiddenChange?.(false);
  }, [isSummaryStep, onBottomTabHiddenChange]);

  if (floorPlanMarket && selectedFloorPlan && bookingHold && reservedBooth) {
    return (
      <BookingSummaryStep
        market={floorPlanMarket}
        floorPlan={selectedFloorPlan}
        booth={reservedBooth}
        hold={bookingHold}
        user={user}
        onBack={() => {
          setSelectedMarket(null);
          setFloorPlanMarket(null);
          setSelectedFloorPlan(null);
          setSelectedBookingDates([]);
          setBookingHold(null);
          setReservedBooth(null);
        }}
        onConfirmed={() => {
          setSelectedMarket(null);
          setFloorPlanMarket(null);
          setSelectedFloorPlan(null);
          setSelectedBookingDates([]);
          setBookingHold(null);
          setReservedBooth(null);
          onCartChanged?.();
          onOpenCart?.();
        }}
      />
    );
  }

  if (floorPlanMarket && selectedFloorPlan && selectedBookingDates.length > 0) {
    return (
      <BoothSelectionStep
        market={floorPlanMarket}
        markets={markets}
        floorPlans={floorPlans}
        floorPlan={selectedFloorPlan}
        selectedDates={selectedBookingDates}
        user={user}
        onBack={() => setSelectedBookingDates([])}
        onSelectMarket={selectBoothMarket}
        onSelectFloorPlan={selectBoothFloorPlan}
        onChangeDates={() => {
          setBookingHold(null);
          setReservedBooth(null);
          setSelectedBookingDates([]);
        }}
        onReserved={(hold, booth) => {
          setBookingHold(hold);
          setReservedBooth(booth);
        }}
      />
    );
  }

  if (floorPlanMarket && selectedFloorPlan) {
    return (
      <BookingDateSelectionStep
        market={floorPlanMarket}
        markets={markets}
        floorPlans={floorPlans}
        floorPlan={selectedFloorPlan}
        onBack={() => setSelectedFloorPlan(null)}
        onSelectMarket={selectBookingMarket}
        onSelectFloorPlan={selectBookingFloorPlan}
        onConfirm={setSelectedBookingDates}
      />
    );
  }

  if (floorPlanMarket) {
    return (
      <FloorPlanSelectionStep
        market={floorPlanMarket}
        markets={markets}
        onBack={() => setFloorPlanMarket(null)}
        onSelectMarket={selectBookingMarket}
        onSelectFloorPlan={selectBookingFloorPlan}
      />
    );
  }

  if (selectedMarket) {
    return (
      <MarketDetailScreen
        market={selectedMarket}
        user={user}
        loading={marketDetailLoading}
        onRefresh={async () => {
          setMarketDetailLoading(true);
          try {
            const latest = await getMarket(selectedMarket.id);
            if (latest) {
              setSelectedMarket(latest);
            }
          } finally {
            setMarketDetailLoading(false);
          }
        }}
        onRequireAuth={onRequireAuth}
        onBack={() => setSelectedMarket(null)}
        onContinue={() => selectBookingMarket(selectedMarket)}
        onPreview={setPreviewImage}
        previewImage={previewImage}
        onClosePreview={() => setPreviewImage('')}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={filteredMarkets}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMarketCard}
        contentContainerStyle={styles.screenScroll}
        ItemSeparatorComponent={MarketListSeparator}
        ListHeaderComponent={renderMarketListHeader}
        ListEmptyComponent={renderMarketEmpty}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefreshMarkets} tintColor={colors.teal} />}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
      />

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
    </View>
  );
}

const MarketListCard = React.memo(function MarketListCard({market, onPress}: {market: Market; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} style={styles.listCard}>
      <MarketImage imageUrl={market.mainImageUrl} style={styles.listImage} />
      <LinearGradient colors={['transparent', 'rgba(7, 17, 31, 0.84)']} style={styles.listOverlay}>
        <Text style={styles.marketCode}>{market.code}</Text>
        <Text style={styles.listTitle}>{market.name}</Text>
        <Text style={styles.listAddress} numberOfLines={1}>
          {market.address || 'แตะเพื่อดูรายละเอียดตลาด'}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}, (prev, next) => prev.market === next.market);

const MarketImage = React.memo(function MarketImage({imageUrl, style}: {imageUrl: string; style: object}) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return (
      <LinearGradient colors={['#dff8f4', '#ffffff']} style={[style, styles.imageFallback]}>
        <MaterialCommunityIcons name="storefront-outline" size={42} color={colors.tealDark} />
      </LinearGradient>
    );
  }
  return <Image source={{uri: imageUrl}} style={style} resizeMode="cover" onError={() => setFailed(true)} />;
});

function MarketListSeparator() {
  return <View style={styles.marketListSeparator} />;
}

function MarketDetailScreen({
  market,
  user,
  onBack,
  onPreview,
  previewImage,
  onClosePreview,
  loading,
  onRefresh,
  onRequireAuth,
  onContinue,
}: {
  market: Market;
  user: MobileUser | null;
  loading?: boolean;
  onRefresh: () => Promise<void>;
  onRequireAuth: () => void;
  onBack: () => void;
  onContinue: () => void;
  onPreview: (imageUrl: string) => void;
  previewImage: string;
  onClosePreview: () => void;
}) {
  const gallery = market.galleryImages.length ? market.galleryImages : market.mainImageUrl ? [market.mainImageUrl] : [];
  const [termsVisible, setTermsVisible] = useState(false);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const [skipTerms, setSkipTerms] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadPreference() {
      try {
        const raw = await AsyncStorage.getItem(MARKET_TERMS_DISMISSED_KEY);
        const marketIds = raw ? (JSON.parse(raw) as number[]) : [];
        if (mounted) {
          setSkipTerms(Array.isArray(marketIds) && marketIds.includes(market.id));
        }
      } catch {
        if (mounted) {
          setSkipTerms(false);
        }
      }
    }

    setDoNotShowAgain(false);
    loadPreference();

    return () => {
      mounted = false;
    };
  }, [market.id]);

  const plainTerms = useMemo(() => htmlToPlainText(market.terms), [market.terms]);

  const handleNextPress = useCallback(() => {
    if (!user) {
      setAuthPromptVisible(true);
      return;
    }

    if (skipTerms) {
      onContinue();
      return;
    }

    setTermsVisible(true);
  }, [onContinue, skipTerms, user]);

  const handleTermsAccept = useCallback(async () => {
    if (doNotShowAgain) {
      try {
        const raw = await AsyncStorage.getItem(MARKET_TERMS_DISMISSED_KEY);
        const marketIds = raw ? (JSON.parse(raw) as number[]) : [];
        const nextIds = Array.isArray(marketIds)
          ? Array.from(new Set([...marketIds, market.id]))
          : [market.id];
        await AsyncStorage.setItem(MARKET_TERMS_DISMISSED_KEY, JSON.stringify(nextIds));
        setSkipTerms(true);
      } catch {
        // Ignore local preference persistence failures for now.
      }
    }

    setTermsVisible(false);
    setDoNotShowAgain(false);
    onContinue();
  }, [doNotShowAgain, market.id, onContinue]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.screenScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.teal} />}>
        <View style={styles.detailHeaderRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.ink} />
            <Text style={styles.backText}>กลับ</Text>
          </Pressable>
          <Pressable onPress={handleNextPress} style={styles.topNextButton}>
            <Text style={styles.topNextButtonText}>ถัดไป</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.detailHero}>
          <MarketImage imageUrl={market.mainImageUrl} style={styles.detailHeroImage} />
          <LinearGradient colors={['transparent', 'rgba(7, 17, 31, 0.86)']} style={styles.detailHeroOverlay}>
            <Text style={styles.marketCode}>{market.code}</Text>
            <Text style={styles.detailTitle}>{market.name}</Text>
          </LinearGradient>
        </View>

        <Text style={styles.detailSectionTitle}>แกลอรี่ตลาด</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryTrack}>
          {gallery.map((imageUrl) => (
            <Pressable key={imageUrl} onPress={() => onPreview(imageUrl)} style={styles.galleryItem}>
              <MarketImage imageUrl={imageUrl} style={styles.galleryImage} />
            </Pressable>
          ))}
          {gallery.length === 0 ? <EmptyCard text="ยังไม่มีรูปภาพตลาด" /> : null}
        </ScrollView>

        <Text style={styles.detailDescription}>
          {market.description || 'รายละเอียดตลาดและข้อมูลพื้นที่ขายจะถูกแสดงในส่วนนี้'}
        </Text>

        <View style={styles.infoList}>
          <InfoRow icon="map-marker-outline" label="ที่อยู่" value={market.address || '-'} />
          <InfoRow icon="clock-outline" label="วันเวลาเปิด - ปิด" value={market.openingHours || 'ดูตามวันที่ตลาดเปิดจอง'} />
          <InfoRow icon="phone-outline" label="เบอร์โทร" value={market.phone || '-'} />
          <InfoRow icon="email-outline" label="อีเมล" value={market.email || '-'} />
          <InfoRow icon="chat-outline" label="LINE ID" value={market.lineId || '-'} />
        </View>

        <Pressable onPress={handleNextPress} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>ถัดไป</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.white} />
        </Pressable>
      </ScrollView>

      {loading ? (
        <View pointerEvents="none" style={styles.detailLoadingOverlay}>
          <ApiLoadingState label="กำลังโหลดรายละเอียดตลาด" style={styles.detailLoadingCard} />
        </View>
      ) : null}

      <Modal visible={Boolean(previewImage)} transparent animationType="fade" onRequestClose={onClosePreview}>
        <View style={styles.previewBackdrop}>
          <Pressable onPress={onClosePreview} style={styles.previewClose}>
            <MaterialCommunityIcons name="close" size={24} color={colors.white} />
          </Pressable>
          <Image source={{uri: previewImage}} style={styles.previewImage} resizeMode="contain" />
        </View>
      </Modal>

      <Modal visible={termsVisible} transparent animationType="slide" onRequestClose={() => setTermsVisible(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setTermsVisible(false)}>
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>เงื่อนไขการจอง</Text>
            <Text style={styles.sheetMarketName}>{market.name}</Text>
            <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent}>
              <Text style={styles.sheetTermsText}>
                {plainTerms || 'ยังไม่มีการกำหนดเงื่อนไขการจองสำหรับตลาดนี้'}
              </Text>
            </ScrollView>
            <View style={styles.sheetOptionRow}>
              <Switch
                value={doNotShowAgain}
                onValueChange={setDoNotShowAgain}
                trackColor={{false: '#d7e4ec', true: '#8be0d6'}}
                thumbColor={doNotShowAgain ? colors.teal : colors.white}
              />
              <Text style={styles.sheetOptionText}>ไม่ต้องแสดงอีก</Text>
            </View>
            <Pressable style={styles.sheetActionButton} onPress={handleTermsAccept}>
              <Text style={styles.sheetActionButtonText}>ตกลง</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <AppDialog
        visible={authPromptVisible}
        icon="account-lock-outline"
        title="กรุณาเข้าสู่ระบบก่อน"
        message="คุณต้องล็อกอินหรือสมัครใช้งานก่อน จึงจะดำเนินการจองตลาดต่อได้"
        cancelLabel="ยกเลิก"
        confirmLabel="ไปหน้าเข้าสู่ระบบ"
        onCancel={() => setAuthPromptVisible(false)}
        onConfirm={() => {
          setAuthPromptVisible(false);
          onRequireAuth();
        }}
      />
    </View>
  );
}

function htmlToPlainText(value: string) {
  if (!value) {
    return '';
  }

  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function InfoRow({icon, label, value}: {icon: string; label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons name={icon} size={21} color={colors.tealDark} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
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

function EmptyCard({text, large}: {text: string; large?: boolean}) {
  return (
    <View style={[styles.emptyCard, large && styles.emptyCardLarge]}>
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
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    ...shadow,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 10,
  },
  scanButton: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  messageText: {
    marginTop: 12,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    marginTop: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  sectionCaption: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  marketCode: {
    color: '#dff8f4',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '900',
  },
  marketListSeparator: {
    height: 14,
  },
  listCard: {
    height: 148,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...shadow,
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  listTitle: {
    marginTop: 3,
    color: colors.white,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
  },
  listAddress: {
    marginTop: 4,
    color: '#dce7ee',
    fontSize: 12,
    fontWeight: '700',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
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
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  topNextButton: {
    height: 42,
    // width: 82,
    // paddingHorizontal: 8,
    paddingLeft: 14,
    borderRadius: 16,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...shadow,
  },
  topNextButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  detailHero: {
    height: 250,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...shadow,
  },
  detailHeroImage: {
    width: '100%',
    height: '100%',
  },
  detailHeroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    minHeight: 110,
    justifyContent: 'flex-end',
  },
  detailTitle: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 5,
  },
  detailDescription: {
    marginTop: 18,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
  infoList: {
    marginTop: 18,
    gap: 10,
  },
  detailSectionTitle: {
    marginTop: 18,
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  infoValue: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  galleryTrack: {
    marginTop: 12,
    gap: 12,
    paddingRight: 22,
  },
  galleryItem: {
    width: 58,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  nextButton: {
    marginTop: 24,
    height: 56,
    borderRadius: 22,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  detailLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,251,251,0.72)',
    paddingHorizontal: 22,
  },
  detailLoadingCard: {
    width: '100%',
    maxWidth: 280,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 17, 31, 0.34)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 26,
    minHeight: 380,
    maxHeight: '78%',
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
  sheetBody: {
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 260,
  },
  sheetBodyContent: {
    padding: 16,
  },
  sheetTermsText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
  sheetOptionRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetOptionText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  sheetActionButton: {
    marginTop: 18,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  sheetActionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 10, 18, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewClose: {
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
  previewImage: {
    width: '92%',
    height: '78%',
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
    borderColor: colors.teal,
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
  emptyCardLarge: {
    width: 320,
    height: 220,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default React.memo(BookingScreen);
