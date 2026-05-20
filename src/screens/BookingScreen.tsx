import React, {useCallback, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Camera, useCameraDevice, useCameraPermission, useCodeScanner} from 'react-native-vision-camera';

import AppDialog from '../components/AppDialog';
import ApiLoadingState from '../components/ApiLoadingState';
import {
  checkBoothAvailability,
  getFloorPlanBooths,
  getMarket,
  getMarketFloorPlans,
  getMarkets,
  type Booth,
  type BoothAvailabilityStatus,
  type BoothDateAvailability,
  type FloorPlan,
  type Market,
} from '../services/markets';
import {colors, shadow} from '../theme/colors';
import type {MobileUser} from '../types/user';

const MARKET_TERMS_DISMISSED_KEY = 'jonglock.marketTerms.dismissed';
const FAVORITE_BOOTHS_KEY = 'jonglock.favoriteBooths';

function BookingScreen({
  user,
  onRequireAuth,
}: {
  user: MobileUser | null;
  onRequireAuth: () => void;
}) {
  const [query, setQuery] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [floorPlanMarket, setFloorPlanMarket] = useState<Market | null>(null);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [marketDetailLoading, setMarketDetailLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const selectMarket = useCallback(async (market: Market) => {
    setSelectedMarket(market);
    setMarketDetailLoading(true);
    try {
      const latest = await getMarket(market.id);
      if (latest) {
        setSelectedMarket(latest);
      }
    } catch {
      // The list already contains enough detail for the MVP view.
    } finally {
      setMarketDetailLoading(false);
    }
  }, []);

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

    const matchedMarket = markets.find((market) =>
      cleanValue.toLowerCase().includes(market.code.toLowerCase())
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

  if (floorPlanMarket && selectedFloorPlan) {
    return (
      <BoothSelectionScreen
        market={floorPlanMarket}
        floorPlan={selectedFloorPlan}
        onBack={() => setSelectedFloorPlan(null)}
      />
    );
  }

  if (floorPlanMarket) {
    return (
      <FloorPlanSelectionScreen
        market={floorPlanMarket}
        onBack={() => setFloorPlanMarket(null)}
        onSelectFloorPlan={setSelectedFloorPlan}
      />
    );
  }

  if (selectedMarket) {
    return (
      <MarketDetailScreen
        market={selectedMarket}
        user={user}
        loading={marketDetailLoading}
        onRequireAuth={onRequireAuth}
        onBack={() => setSelectedMarket(null)}
        onContinue={() => setFloorPlanMarket(selectedMarket)}
        onPreview={setPreviewImage}
        previewImage={previewImage}
        onClosePreview={() => setPreviewImage('')}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.screenScroll} keyboardShouldPersistTaps="handled">
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
        <View style={styles.marketList}>
          {loading && filteredMarkets.length === 0 ? (
            <>
              <ApiLoadingState label="กำลังโหลดรายการตลาด" />
              <ApiLoadingState label="กำลังโหลดรายการตลาด" />
            </>
          ) : null}
          {filteredMarkets.map((market) => (
            <MarketListCard key={market.id} market={market} onPress={() => selectMarket(market)} />
          ))}
          {!loading && filteredMarkets.length === 0 ? <EmptyCard text="ไม่มีรายการตลาด" /> : null}
        </View>
      </ScrollView>

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

function MarketListCard({market, onPress}: {market: Market; onPress: () => void}) {
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
}

function MarketImage({imageUrl, style}: {imageUrl: string; style: object}) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return (
      <LinearGradient colors={['#dff8f4', '#ffffff']} style={[style, styles.imageFallback]}>
        <MaterialCommunityIcons name="storefront-outline" size={42} color={colors.tealDark} />
      </LinearGradient>
    );
  }
  return <Image source={{uri: imageUrl}} style={style} resizeMode="cover" onError={() => setFailed(true)} />;
}

function MarketDetailScreen({
  market,
  user,
  onBack,
  onPreview,
  previewImage,
  onClosePreview,
  loading,
  onRequireAuth,
  onContinue,
}: {
  market: Market;
  user: MobileUser | null;
  loading?: boolean;
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

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.screenScroll}>
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

function FloorPlanSelectionScreen({
  market,
  onBack,
  onSelectFloorPlan,
}: {
  market: Market;
  onBack: () => void;
  onSelectFloorPlan: (floorPlan: FloorPlan) => void;
}) {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

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
            <MaterialCommunityIcons name="map-outline" size={28} color={colors.tealDark} />
          </View>
          <View style={styles.planIntroCopy}>
            <Text style={styles.planEyebrow}>{market.code}</Text>
            <Text style={styles.planTitle}>เลือกแผนผัง/โซน</Text>
            <Text style={styles.planSubtitle}>{market.name}</Text>
          </View>
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

    </View>
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

function BoothSelectionScreen({
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

  const loadBooths = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setBooths(await getFloorPlanBooths(floorPlan.id, toIsoDate(new Date())));
    } catch {
      setMessage('ยังไม่สามารถโหลดข้อมูลบูธได้');
    } finally {
      setLoading(false);
    }
  }, [floorPlan.id]);

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
  return (
    <Modal visible={Boolean(booth)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.compactSheetCard} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>บูธกำลังดำเนินการ</Text>
          <Text style={styles.sheetMarketName}>
            {booth ? `${boothLabel(booth)} • ค่าเช่า ${formatMoney(booth.grossPrice)} บาท` : ''}
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
  const calendarDays = useMemo(() => getCalendarDays(42), []);
  const availabilityByDate = useMemo(
    () => new Map(dateAvailability.map((item) => [item.date, item.status])),
    [dateAvailability],
  );

  return (
    <Modal visible={Boolean(booth)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.dateSheetCard} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.dateSheetHeader}>
            <View style={styles.planIntroCopy}>
              <Text style={styles.sheetTitle}>เลือกวันที่จอง</Text>
              <Text style={styles.sheetMarketName}>
                {booth ? `${boothLabel(booth)} • ค่าเช่า ${formatMoney(booth.grossPrice)} บาท/วัน` : ''}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetCloseButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
              <Text key={day} style={styles.weekHeaderText}>{day}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((date) => (
              <CalendarDayButton
                key={date}
                date={date}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                status={availabilityByDate.get(date)}
                onPress={() => onDatePress(date)}
              />
            ))}
          </View>

          <Text style={styles.dateRangeText}>
            {rangeStart && rangeEnd
              ? `ช่วงวันที่ ${formatShortDate(rangeStart)} - ${formatShortDate(rangeEnd)}`
              : 'แตะวันที่เริ่มต้นและวันที่สิ้นสุดเพื่อเลือกช่วงวันที่'}
          </Text>
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
  rangeStart,
  rangeEnd,
  status,
  onPress,
}: {
  date: string;
  rangeStart: string;
  rangeEnd: string;
  status?: BoothAvailabilityStatus;
  onPress: () => void;
}) {
  const inRange = Boolean(rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd);
  const isEdge = date === rangeStart || date === rangeEnd;
  const dateNumber = Number(date.slice(-2));
  const statusStyle = status ? boothStatusStyles[status] : null;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.calendarDay,
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

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getCalendarDays(length: number) {
  const today = new Date();
  const start = addDays(today, -today.getDay());
  return Array.from({length}, (_, index) => toIsoDate(addDays(start, index)));
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

function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
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
  marketList: {
    gap: 14,
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
  planIntroCard: {
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
  compactSheetCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 26,
  },
  favoriteSheetCopy: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '800',
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
    marginTop: 18,
    flexDirection: 'row',
  },
  weekHeaderText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarDay: {
    width: '13.1%',
    aspectRatio: 1,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
