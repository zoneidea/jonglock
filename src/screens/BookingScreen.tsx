import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Camera, useCameraDevice, useCameraPermission, useCodeScanner} from 'react-native-vision-camera';

import {getMarket, getMarkets, type Market} from '../services/markets';
import {colors, shadow} from '../theme/colors';

function BookingScreen() {
  const [query, setQuery] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
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

  const featuredMarkets = useMemo(() => {
    const seenOrganizations = new Set<number>();

    return filteredMarkets.filter((market) => {
      if (seenOrganizations.has(market.organizationId)) {
        return false;
      }

      seenOrganizations.add(market.organizationId);
      return true;
    });
  }, [filteredMarkets]);

  const marketListItems = useMemo(() => {
    const featuredIds = new Set(featuredMarkets.map((market) => market.id));
    return filteredMarkets.filter((market) => !featuredIds.has(market.id));
  }, [featuredMarkets, filteredMarkets]);

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
    try {
      const latest = await getMarket(market.id);
      if (latest) {
        setSelectedMarket(latest);
      }
    } catch {
      // The list already contains enough detail for the MVP view.
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

  if (selectedMarket) {
    return (
      <MarketDetailScreen
        market={selectedMarket}
        onBack={() => setSelectedMarket(null)}
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

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselTrack}>
          {featuredMarkets.map((market) => (
            <MarketHeroCard key={market.id} market={market} onPress={() => selectMarket(market)} />
          ))}
          {!loading && featuredMarkets.length === 0 ? (
            <EmptyCard text="ไม่พบตลาดตามคำค้นหา" large />
          ) : null}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ตลาดทั้งหมด</Text>
          <Text style={styles.sectionCaption}>{loading ? 'กำลังโหลดข้อมูล...' : `${marketListItems.length} ตลาด`}</Text>
        </View>
        <View style={styles.marketList}>
          {marketListItems.map((market) => (
            <MarketListCard key={market.id} market={market} onPress={() => selectMarket(market)} />
          ))}
          {!loading && marketListItems.length === 0 ? <EmptyCard text="ไม่มีรายการตลาด" /> : null}
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

function MarketHeroCard({market, onPress}: {market: Market; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} style={styles.heroCard}>
      <MarketImage imageUrl={market.mainImageUrl} style={styles.heroImage} />
      <LinearGradient colors={['transparent', 'rgba(7, 17, 31, 0.82)']} style={styles.heroOverlay}>
        <Text style={styles.marketCode}>{market.code}</Text>
        <Text style={styles.heroTitle}>{market.name}</Text>
      </LinearGradient>
    </Pressable>
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
  onBack,
  onPreview,
  previewImage,
  onClosePreview,
}: {
  market: Market;
  onBack: () => void;
  onPreview: (imageUrl: string) => void;
  previewImage: string;
  onClosePreview: () => void;
}) {
  const gallery = market.galleryImages.length ? market.galleryImages : market.mainImageUrl ? [market.mainImageUrl] : [];
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={colors.ink} />
          <Text style={styles.backText}>กลับ</Text>
        </Pressable>

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

        <Pressable style={styles.nextButton}>
          <Text style={styles.nextButtonText}>ถัดไป</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.white} />
        </Pressable>
      </ScrollView>

      <Modal visible={Boolean(previewImage)} transparent animationType="fade" onRequestClose={onClosePreview}>
        <View style={styles.previewBackdrop}>
          <Pressable onPress={onClosePreview} style={styles.previewClose}>
            <MaterialCommunityIcons name="close" size={24} color={colors.white} />
          </Pressable>
          <Image source={{uri: previewImage}} style={styles.previewImage} resizeMode="contain" />
        </View>
      </Modal>
    </View>
  );
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
    marginBottom: 18,
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
  sectionTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  sectionCaption: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  carouselTrack: {
    gap: 14,
    paddingRight: 22,
  },
  heroCard: {
    width: 320,
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...shadow,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    minHeight: 92,
    justifyContent: 'flex-end',
  },
  marketCode: {
    color: '#dff8f4',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '900',
  },
  heroTitle: {
    marginTop: 4,
    color: colors.white,
    fontSize: 24,
    lineHeight: 30,
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
    marginBottom: 14,
  },
  backText: {
    color: colors.ink,
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
    width: 116,
    height: 116,
    borderRadius: 22,
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
