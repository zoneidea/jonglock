import React, {useCallback, useEffect, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ApiLoadingState from '../components/ApiLoadingState';
import PlaceholderPanel from '../components/PlaceholderPanel';
import {getCartBookings, type CartBooking} from '../services/markets';
import {colors, shadow} from '../theme/colors';
import type {MobileUser} from '../types/user';

function CartScreen({user}: {user: MobileUser | null}) {
  const [bookings, setBookings] = useState<CartBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadCart = useCallback(async () => {
    if (!user?.email) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      setBookings(await getCartBookings({email: user.email, name: user.name}));
    } catch (error) {
      setMessage((error as Error).message || 'ยังไม่สามารถโหลดตระกร้าได้');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <PlaceholderPanel
          title="ตระกร้า"
          text="กรุณาเข้าสู่ระบบด้วย Gmail เพื่อดูรายการจองที่รอชำระเงิน"
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>ตระกร้า</Text>
          <Text style={styles.subtitle}>รายการจองที่รอชำระเงิน</Text>
        </View>
        <Pressable onPress={loadCart} style={styles.refreshButton}>
          <MaterialCommunityIcons name="refresh" size={20} color={colors.tealDark} />
        </Pressable>
      </View>

      {message ? <Text style={styles.messageText}>{message}</Text> : null}

      {loading ? (
        <>
          <ApiLoadingState label="กำลังโหลดตระกร้า" />
          <ApiLoadingState label="กำลังโหลดตระกร้า" />
        </>
      ) : null}

      {!loading && bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="cart-outline" size={34} color={colors.tealDark} />
          <Text style={styles.emptyTitle}>ยังไม่มีรายการรอชำระเงิน</Text>
          <Text style={styles.emptyText}>รายการที่จองแล้วแต่ยังไม่ชำระเงินจะแสดงที่นี่</Text>
        </View>
      ) : null}

      <View style={styles.bookingList}>
        {bookings.map((booking) => (
          <CartBookingCard key={booking.bookingId} booking={booking} />
        ))}
      </View>
    </ScrollView>
  );
}

function CartBookingCard({booking}: {booking: CartBooking}) {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.cardTopRow}>
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
          <Text style={styles.expiresText}>{`หมดเวลา ${formatShortDateTime(booking.expiresAt)}`}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>รอชำระ</Text>
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

function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

const styles = StyleSheet.create({
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
  bookingList: {
    gap: 12,
  },
  bookingCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadow,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  statusPill: {
    borderRadius: 999,
    backgroundColor: '#fff4db',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: '#9a6500',
    fontSize: 11,
    fontWeight: '900',
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
