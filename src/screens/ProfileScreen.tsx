import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import auth, {type FirebaseAuthTypes} from '@react-native-firebase/auth';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ApiLoadingState from '../components/ApiLoadingState';
import GoogleIcon from '../components/GoogleIcon';
import LabeledInput from '../components/LabeledInput';
import {getBookingHistory, type BookingHistoryRecord} from '../services/markets';
import {
  changePublicProfilePassword,
  getPublicProfile,
  updatePublicStoreProfile,
  updatePublicProfileAddress,
  uploadPublicProfileAvatar,
  verifyPublicProfilePhone,
  type PublicProfile,
} from '../services/profile';
import {
  getAmphures,
  getProvinces,
  getSubdistricts,
  type Amphure,
  type Province,
  type Subdistrict,
} from '../services/locations';
import {colors, shadow} from '../theme/colors';
import {useTheme} from '../theme/theme';
import type {MobileUser} from '../types/user';

type ProfileTab = 'account' | 'address' | 'history' | 'settings';
type HistoryFilter = 'all' | 'processing' | 'success' | 'cancelled' | 'expired';

const profileTabs: Array<{key: ProfileTab; label: string; icon: string}> = [
  {key: 'account', label: 'Account', icon: 'account-outline'},
  {key: 'address', label: 'ที่อยู่', icon: 'map-marker-outline'},
  {key: 'history', label: 'ประวัติ', icon: 'calendar-check-outline'},
  {key: 'settings', label: 'ตั้งค่า', icon: 'cog-outline'},
];

const passwordPolicy = [
  'ตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว',
  'อักขระพิเศษอย่างน้อย 1 ตัว',
  'ตัวเลขอย่างน้อย 1 ตัว',
  'ความยาวไม่น้อย 10 ตัว',
];

const historyFilterOptions: Array<{key: HistoryFilter; label: string}> = [
  {key: 'all', label: 'ทั้งหมด'},
  {key: 'processing', label: 'รอตรวจสอบ'},
  {key: 'success', label: 'สำเร็จ'},
  {key: 'cancelled', label: 'ยกเลิก'},
  {key: 'expired', label: 'หมดอายุ'},
];

function ProfileScreen({
  user,
  onLogout,
  onAuthenticated,
  onUserChange,
  onOpenAuditPortal,
}: {
  user: MobileUser | null;
  onLogout: () => void;
  onAuthenticated: (user: MobileUser) => void;
  onUserChange: (user: MobileUser) => void;
  onOpenAuditPortal: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('account');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [amphures, setAmphures] = useState<Amphure[]>([]);
  const [subdistricts, setSubdistricts] = useState<Subdistrict[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedAmphure, setSelectedAmphure] = useState<Amphure | null>(null);
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<Subdistrict | null>(null);
  const [openLocationPicker, setOpenLocationPicker] = useState<'province' | 'amphure' | 'subdistrict' | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [pdpaMarketing, setPdpaMarketing] = useState(false);
  const [pdpaTerms, setPdpaTerms] = useState(true);
  const [notification, setNotification] = useState(true);
  const [shopScreenOpen, setShopScreenOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeProductDescription, setStoreProductDescription] = useState('');
  const [storeFacebookUrl, setStoreFacebookUrl] = useState('');
  const [storeLineId, setStoreLineId] = useState('');
  const [storeWebsiteUrl, setStoreWebsiteUrl] = useState('');
  const [storeContactPhone, setStoreContactPhone] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storeGalleryImages, setStoreGalleryImages] = useState<string[]>([]);
  const [pendingStoreLogo, setPendingStoreLogo] = useState<{uri: string; name?: string; type?: string} | null>(null);
  const [pendingStoreGallery, setPendingStoreGallery] = useState<Array<{uri: string; name?: string; type?: string}>>([]);
  const [historyItems, setHistoryItems] = useState<BookingHistoryRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingStore, setSavingStore] = useState(false);
  const [profileLocationIds, setProfileLocationIds] = useState<{
    provinceId: number | null;
    amphureId: number | null;
    subdistrictId: number | null;
  }>({
    provinceId: null,
    amphureId: null,
    subdistrictId: null,
  });
  const [phoneConfirmation, setPhoneConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error');
  const {themeMode, setThemeMode, palette, resolvedTheme} = useTheme();
  const deleteButtonTone = useMemo(
    () => ({
      borderColor: resolvedTheme === 'dark' ? '#6b3040' : '#f3b9c6',
      backgroundColor: resolvedTheme === 'dark' ? '#2f1820' : '#fff5f7',
    }),
    [resolvedTheme],
  );

  const initials = useMemo(() => {
    const source = user?.name || user?.email || 'J';
    return source
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const filteredHistoryItems = useMemo(() => {
    if (historyFilter === 'all') {
      return historyItems;
    }
    if (historyFilter === 'success') {
      return historyItems.filter((item) => resolveBookingHistoryStatus(item.status) === 'paid');
    }
    if (historyFilter === 'processing') {
      return historyItems.filter((item) => resolveBookingHistoryStatus(item.status) === 'payment_processing');
    }
    if (historyFilter === 'cancelled') {
      return historyItems.filter((item) => resolveBookingHistoryStatus(item.status) === 'cancelled');
    }
    return historyItems.filter((item) => resolveBookingHistoryStatus(item.status) === 'expired');
  }, [historyFilter, historyItems]);

  const userIdentity = useMemo(
    () => (user?.email ? {email: user.email, name: user.name} : null),
    [user?.email, user?.name],
  );

  const loadProvinces = useCallback(async () => {
    setLocationLoading(true);
    setLocationMessage('');
    try {
      setProvinces(await getProvinces());
    } catch {
      setLocationMessage('โหลดข้อมูลจังหวัดไม่สำเร็จ');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const loadAmphures = useCallback(async (provinceId: number) => {
    setLocationLoading(true);
    setLocationMessage('');
    try {
      setAmphures(await getAmphures({provinceId}));
    } catch {
      setLocationMessage('โหลดข้อมูลอำเภอไม่สำเร็จ');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const loadSubdistricts = useCallback(async (amphureId: number) => {
    setLocationLoading(true);
    setLocationMessage('');
    try {
      setSubdistricts(await getSubdistricts({amphureId}));
    } catch {
      setLocationMessage('โหลดข้อมูลตำบลไม่สำเร็จ');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'address' && provinces.length === 0) {
      loadProvinces();
    }
  }, [activeTab, loadProvinces, provinces.length]);

  const applyProfile = useCallback((profile: PublicProfile) => {
    setPhone(profile.phone || '');
    setAddress(profile.address || '');
    setPdpaMarketing(profile.pdpaMarketingAccepted);
    setPdpaTerms(profile.pdpaTermsAccepted);
    setNotification(profile.notificationEnabled);
    setStoreName(profile.storeName || '');
    setStoreProductDescription(profile.storeProductDescription || '');
    setStoreFacebookUrl(profile.storeFacebookUrl || '');
    setStoreLineId(profile.storeLineId || '');
    setStoreWebsiteUrl(profile.storeWebsiteUrl || '');
    setStoreContactPhone(profile.storeContactPhone || '');
    setStoreLogoUrl(profile.storeLogoUrl || '');
    setStoreGalleryImages(profile.storeGalleryImages || []);
    setPendingStoreLogo(null);
    setPendingStoreGallery([]);
    setProfileLocationIds({
      provinceId: profile.provinceId ?? null,
      amphureId: profile.amphureId ?? null,
      subdistrictId: profile.subdistrictId ?? null,
    });
    setOpenLocationPicker(null);

    if (!user) {
      return;
    }

    const nextUser: MobileUser = {
      ...user,
      name: profile.name || user.name,
      avatar: profile.avatarUrl || user.avatar,
      phone: profile.phone || '',
      phoneVerifiedAt: profile.phoneVerifiedAt || null,
      address: profile.address || '',
      provinceId: profile.provinceId ?? null,
      amphureId: profile.amphureId ?? null,
      subdistrictId: profile.subdistrictId ?? null,
      pdpaTermsAccepted: profile.pdpaTermsAccepted,
      pdpaMarketingAccepted: profile.pdpaMarketingAccepted,
      notificationEnabled: profile.notificationEnabled,
      firebaseUid: profile.firebaseUid || '',
    };

    if (
      nextUser.name !== user.name
      || nextUser.avatar !== user.avatar
      || nextUser.phone !== user.phone
      || nextUser.phoneVerifiedAt !== user.phoneVerifiedAt
      || nextUser.address !== user.address
      || nextUser.provinceId !== user.provinceId
      || nextUser.amphureId !== user.amphureId
      || nextUser.subdistrictId !== user.subdistrictId
      || nextUser.pdpaTermsAccepted !== user.pdpaTermsAccepted
      || nextUser.pdpaMarketingAccepted !== user.pdpaMarketingAccepted
      || nextUser.notificationEnabled !== user.notificationEnabled
      || nextUser.firebaseUid !== user.firebaseUid
    ) {
      onUserChange(nextUser);
    }
  }, [onUserChange, user]);

  const loadProfile = useCallback(async () => {
    if (!userIdentity) {
      return;
    }
    setProfileLoading(true);
    setMessage('');
    try {
      const profile = await getPublicProfile(userIdentity);
      applyProfile(profile);
    } catch (error) {
      setMessage((error as Error).message || 'โหลดข้อมูลโปรไฟล์ไม่สำเร็จ');
      setMessageTone('error');
    } finally {
      setProfileLoading(false);
    }
  }, [applyProfile, userIdentity]);

  const loadHistory = useCallback(async () => {
    if (!user?.email) {
      setHistoryItems([]);
      return;
    }
    setHistoryLoading(true);
    setHistoryMessage('');
    try {
      setHistoryItems(await getBookingHistory({email: user.email, name: user.name}));
    } catch {
      setHistoryMessage('โหลดประวัติการจองไม่สำเร็จ');
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'history' && historyItems.length === 0) {
      loadHistory();
    }
  }, [activeTab, historyItems.length, loadHistory]);

  useEffect(() => {
    if (userIdentity) {
      loadProfile();
    }
  }, [loadProfile, userIdentity]);

  useEffect(() => {
    if (activeTab !== 'address' || provinces.length === 0 || !profileLocationIds.provinceId) {
      return;
    }
    const province = provinces.find((item) => item.id === profileLocationIds.provinceId) || null;
    setSelectedProvince((current) => (current?.id === province?.id ? current : province));
    if (province && amphures.length === 0) {
      loadAmphures(province.id);
    }
  }, [activeTab, amphures.length, loadAmphures, profileLocationIds.provinceId, provinces]);

  useEffect(() => {
    if (activeTab !== 'address' || amphures.length === 0 || !profileLocationIds.amphureId) {
      return;
    }
    const amphure = amphures.find((item) => item.id === profileLocationIds.amphureId) || null;
    setSelectedAmphure((current) => (current?.id === amphure?.id ? current : amphure));
    if (amphure && subdistricts.length === 0) {
      loadSubdistricts(amphure.id);
    }
  }, [activeTab, amphures, loadSubdistricts, profileLocationIds.amphureId, subdistricts.length]);

  useEffect(() => {
    if (activeTab !== 'address' || subdistricts.length === 0 || !profileLocationIds.subdistrictId) {
      return;
    }
    const subdistrict = subdistricts.find((item) => item.id === profileLocationIds.subdistrictId) || null;
    setSelectedSubdistrict((current) => (current?.id === subdistrict?.id ? current : subdistrict));
  }, [activeTab, profileLocationIds.subdistrictId, subdistricts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfile();
      if (activeTab === 'address') {
        await loadProvinces();
        if (selectedProvince?.id) {
          await loadAmphures(selectedProvince.id);
        }
        if (selectedAmphure?.id) {
          await loadSubdistricts(selectedAmphure.id);
        }
      }
      if (activeTab === 'history') {
        await loadHistory();
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, loadAmphures, loadHistory, loadProfile, loadProvinces, loadSubdistricts, selectedAmphure, selectedProvince]);

  async function changeAvatar() {
    if (!user || !userIdentity) {
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });
    if (result.didCancel) {
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      return;
    }
    setUploadingAvatar(true);
    setMessage('');
    try {
      const profile = await uploadPublicProfileAvatar(userIdentity, {
        uri: asset.uri,
        name: asset.fileName || 'profile.jpg',
        type: asset.type || 'image/jpeg',
      });
      applyProfile(profile);
      setMessage('อัปเดตรูปโปรไฟล์แล้ว');
      setMessageTone('success');
    } catch (error) {
      setMessage((error as Error).message || 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ');
      setMessageTone('error');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function selectStoreLogo() {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });
    if (result.didCancel) {
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      return;
    }
    setPendingStoreLogo({
      uri: asset.uri,
      name: asset.fileName || 'store-logo.jpg',
      type: asset.type || 'image/jpeg',
    });
  }

  async function selectStoreGallery() {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 8,
    });
    if (result.didCancel) {
      return;
    }
    const assets = (result.assets || [])
      .filter((asset) => asset.uri)
      .map((asset, index) => ({
        uri: asset.uri as string,
        name: asset.fileName || `store-gallery-${index + 1}.jpg`,
        type: asset.type || 'image/jpeg',
      }));
    setPendingStoreGallery(assets.slice(0, 8));
  }

  async function continueWithGmail() {
    setMessage('');
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      }
      const result = await GoogleSignin.signIn();
      if (isCancelledResponse(result)) {
        setMessage('ยกเลิกการเข้าสู่ระบบด้วย Gmail');
        setMessageTone('error');
        return;
      }
      if (!isSuccessResponse(result)) {
        setMessage('ยังไม่สามารถเข้าสู่ระบบด้วย Gmail ได้');
        setMessageTone('error');
        return;
      }
      const googleUser = result.data.user;
      if (googleUser?.email) {
        onAuthenticated({
          name: googleUser.name || googleUser.email.split('@')[0],
          email: googleUser.email,
          avatar: googleUser.photo,
          provider: 'gmail',
        });
        return;
      }
      setMessage('ไม่พบข้อมูล Gmail สำหรับเข้าสู่ระบบ');
      setMessageTone('error');
    } catch (error) {
      const code = isErrorWithCode(error) ? String(error.code) : '';
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        setMessage('ยกเลิกการเข้าสู่ระบบด้วย Gmail');
        setMessageTone('error');
      } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setMessage('Google Play Services ยังไม่พร้อมใช้งาน');
        setMessageTone('error');
      } else if (code === '10' || code === 'DEVELOPER_ERROR') {
        setMessage('ตั้งค่า Google Sign-In ยังไม่ครบ กรุณาตรวจสอบ SHA-1/SHA-256 ใน Firebase');
        setMessageTone('error');
      } else {
        setMessage('ยังไม่สามารถเข้าสู่ระบบด้วย Gmail ได้');
        setMessageTone('error');
      }
    }
  }

  const sendOtp = useCallback(async () => {
    if (!phone.trim()) {
      setMessage('กรุณากรอกเบอร์มือถือก่อนส่ง OTP');
      setMessageTone('error');
      return;
    }
    setSendingOtp(true);
    setMessage('');
    try {
      const confirmation = await auth().signInWithPhoneNumber(phone.trim());
      setPhoneConfirmation(confirmation);
      setMessage('ส่ง OTP แล้ว กรุณากรอกรหัสเพื่อยืนยันเบอร์มือถือ');
      setMessageTone('success');
    } catch (error) {
      setMessage((error as Error).message || 'ส่ง OTP ไม่สำเร็จ');
      setMessageTone('error');
    } finally {
      setSendingOtp(false);
    }
  }, [phone]);

  const verifyOtpCode = useCallback(async () => {
    if (!phoneConfirmation) {
      setMessage('กรุณาส่ง OTP ก่อน');
      setMessageTone('error');
      return;
    }
    if (!otp.trim()) {
      setMessage('กรุณากรอกรหัส OTP');
      setMessageTone('error');
      return;
    }
    if (!userIdentity) {
      setMessage('กรุณาเข้าสู่ระบบก่อนยืนยันเบอร์มือถือ');
      setMessageTone('error');
      return;
    }
    setVerifyingOtp(true);
    setMessage('');
    try {
      const credential = await phoneConfirmation.confirm(otp.trim());
      if (!credential?.user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้จาก Firebase หลังยืนยัน OTP');
      }
      const idToken = await credential.user.getIdToken();
      const profile = await verifyPublicProfilePhone(userIdentity, idToken);
      applyProfile(profile);
      setPhone(profile.phone || phone);
      setOtp('');
      setPhoneConfirmation(null);
      setMessage('ยืนยันเบอร์มือถือสำเร็จ');
      setMessageTone('success');
      await auth().signOut().catch(() => undefined);
    } catch (error) {
      setMessage((error as Error).message || 'ยืนยัน OTP ไม่สำเร็จ');
      setMessageTone('error');
    } finally {
      setVerifyingOtp(false);
    }
  }, [applyProfile, otp, phone, phoneConfirmation, userIdentity]);

  const savePassword = useCallback(async () => {
    if (!userIdentity) {
      setMessage('กรุณาเข้าสู่ระบบก่อนเปลี่ยนรหัสผ่าน');
      setMessageTone('error');
      return;
    }
    if (!password || !confirmPassword) {
      setMessage('กรุณากรอกรหัสผ่านใหม่ให้ครบ');
      setMessageTone('error');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('ยืนยันรหัสผ่านไม่ตรงกัน');
      setMessageTone('error');
      return;
    }
    setSavingPassword(true);
    setMessage('');
    try {
      await changePublicProfilePassword(userIdentity, {
        currentPassword,
        newPassword: password,
      });
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setMessage('อัปเดตรหัสผ่านแล้ว');
      setMessageTone('success');
    } catch (error) {
      setMessage((error as Error).message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      setMessageTone('error');
    } finally {
      setSavingPassword(false);
    }
  }, [confirmPassword, currentPassword, password, userIdentity]);

  const saveAddress = useCallback(async () => {
    if (!userIdentity) {
      setMessage('กรุณาเข้าสู่ระบบก่อนบันทึกที่อยู่');
      setMessageTone('error');
      return;
    }
    setSavingAddress(true);
    setMessage('');
    try {
      const profile = await updatePublicProfileAddress(userIdentity, {
        address,
        provinceId: selectedProvince?.id ?? null,
        amphureId: selectedAmphure?.id ?? null,
        subdistrictId: selectedSubdistrict?.id ?? null,
        pdpaTermsAccepted: pdpaTerms,
        pdpaMarketingAccepted: pdpaMarketing,
        notificationEnabled: notification,
      });
      applyProfile(profile);
      setMessage('บันทึกข้อมูลที่อยู่และ PDPA แล้ว');
      setMessageTone('success');
    } catch (error) {
      setMessage((error as Error).message || 'บันทึกข้อมูลที่อยู่ไม่สำเร็จ');
      setMessageTone('error');
    } finally {
      setSavingAddress(false);
    }
  }, [
    address,
    applyProfile,
    notification,
    pdpaMarketing,
    pdpaTerms,
    selectedAmphure?.id,
    selectedProvince?.id,
    selectedSubdistrict?.id,
    userIdentity,
  ]);

  const saveStoreProfile = useCallback(async () => {
    if (!userIdentity) {
      setMessage('กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูลร้านค้า');
      setMessageTone('error');
      return;
    }
    setSavingStore(true);
    setMessage('');
    try {
      const profile = await updatePublicStoreProfile(userIdentity, {
        storeName,
        storeProductDescription,
        storeFacebookUrl,
        storeLineId,
        storeWebsiteUrl,
        storeContactPhone,
        logoFile: pendingStoreLogo,
        galleryFiles: pendingStoreGallery,
      });
      applyProfile(profile);
      setMessage('อัปเดตข้อมูลร้านค้าแล้ว');
      setMessageTone('success');
    } catch (error) {
      setMessage((error as Error).message || 'อัปเดตข้อมูลร้านค้าไม่สำเร็จ');
      setMessageTone('error');
    } finally {
      setSavingStore(false);
    }
  }, [
    applyProfile,
    pendingStoreGallery,
    pendingStoreLogo,
    storeContactPhone,
    storeFacebookUrl,
    storeLineId,
    storeName,
    storeProductDescription,
    storeWebsiteUrl,
    userIdentity,
  ]);

  function renderAvatar(size = 104) {
    return (
      <Pressable onPress={changeAvatar} disabled={!user || uploadingAvatar} style={styles.avatarWrap}>
        {user?.avatar ? (
          <Image
            source={{uri: user.avatar}}
            style={[styles.avatarImage, {width: size, height: size, borderColor: palette.surface}]}
          />
        ) : (
          <LinearGradient
            colors={resolvedTheme === 'dark' ? [palette.surfaceMuted, palette.surface] : ['#dff8f4', '#ffffff']}
            style={[styles.avatarImage, styles.avatarFallback, {width: size, height: size}]}>
            <Text style={[styles.avatarInitial, {color: palette.accentDark}]}>{initials}</Text>
          </LinearGradient>
        )}
        {user ? (
          <View style={[styles.avatarEdit, {backgroundColor: palette.accent, borderColor: palette.surface}]}>
            <MaterialCommunityIcons name={uploadingAvatar ? 'loading' : 'camera-outline'} size={17} color={palette.inverseText} />
          </View>
        ) : null}
      </Pressable>
    );
  }

  function renderGuestLogin() {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.screenScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.guestScreenLayout}>
            <View>
              <LinearGradient
                colors={resolvedTheme === 'dark' ? [palette.surfaceMuted, palette.surface] : ['#e4fbf8', '#ffffff']}
                style={[styles.guestHero, {borderColor: palette.border}]}>
                <View style={[styles.guestLogo, {backgroundColor: palette.surface}]}>
                  <MaterialCommunityIcons name="storefront-outline" size={28} color={palette.accentDark} />
                </View>
                <Text style={[styles.guestTitle, {color: palette.text}]}>เข้าสู่ระบบผู้ค้า</Text>
                <Text style={[styles.guestText, {color: palette.muted}]}>
                  ใช้ Gmail เพื่อดูข้อมูลบัญชี ประวัติการจอง และตั้งค่าการใช้งานส่วนตัว
                </Text>
              </LinearGradient>

              <View style={[styles.guestCard, {backgroundColor: palette.surface, borderColor: palette.border}]}>
                <Pressable onPress={continueWithGmail} style={[styles.gmailButton, {backgroundColor: palette.surface, borderColor: palette.border}]}>
                  <GoogleIcon />
                  <Text style={[styles.gmailButtonText, {color: palette.text}]}>ดำเนินการต่อด้วย Gmail</Text>
                </Pressable>
                {message ? (
                  <Text style={[styles.messageText, {color: messageTone === 'success' ? palette.accentDark : palette.danger}]}>
                    {message}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.guestAuditFooter}>
              <Pressable onPress={onOpenAuditPortal} style={styles.auditPortalButton}>
                <MaterialCommunityIcons name="shield-search" size={18} color="#ffffff" />
                <Text style={styles.auditPortalButtonText}>สำหรับเจ้าหน้าที่ตรวจตลาด</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  function renderAccountTab() {
    return (
      <View style={styles.panel}>
        <Text style={[styles.panelTitle, {color: palette.text}]}>ข้อมูล Account</Text>
        <ReadonlyRow label="Gmail ที่เข้าใช้งาน" value={user?.email || '-'} icon="gmail" />
        <LabeledInput
          label="เบอร์มือถือ"
          value={phone}
          onChangeText={setPhone}
          placeholder="กรอกเบอร์มือถือ"
          keyboardType="phone-pad"
        />
        <View style={styles.inlineRow}>
          <View style={styles.inlineInput}>
            <LabeledInput
              label="OTP"
              value={otp}
              onChangeText={setOtp}
              placeholder="รหัส 6 หลัก"
              keyboardType="number-pad"
            />
          </View>
          <Pressable
            onPress={phoneConfirmation ? verifyOtpCode : sendOtp}
            disabled={sendingOtp || verifyingOtp}
            style={[
              styles.secondaryButton,
              {backgroundColor: palette.text},
              (sendingOtp || verifyingOtp) && styles.secondaryButtonDisabled,
            ]}>
            <Text style={[styles.secondaryButtonText, {color: palette.inverseText}]}>
              {sendingOtp ? 'กำลังส่ง...' : verifyingOtp ? 'กำลังยืนยัน...' : phoneConfirmation ? 'ยืนยัน OTP' : 'ส่ง OTP'}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.helperText, {color: user?.phoneVerifiedAt ? palette.accentDark : palette.muted}]}>
          {user?.phoneVerifiedAt ? `ยืนยันเบอร์แล้ว ${formatShortDate(user.phoneVerifiedAt)}` : 'ยังไม่ได้ยืนยันเบอร์มือถือ'}
        </Text>
        <LabeledInput
          label="รหัสผ่านปัจจุบัน"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="กรอกรหัสผ่านปัจจุบันถ้ามี"
          secureTextEntry
        />
        <LabeledInput
          label="ตั้งรหัสผ่าน"
          value={password}
          onChangeText={setPassword}
          placeholder="อย่างน้อย 10 ตัวอักษร"
          secureTextEntry
        />
        <LabeledInput
          label="ยืนยันรหัสผ่าน"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="กรอกรหัสผ่านอีกครั้ง"
          secureTextEntry
        />
        <View style={[styles.policyBox, {backgroundColor: palette.surfaceMuted}]}>
          {passwordPolicy.map((item) => (
            <View key={item} style={styles.policyRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={palette.accentDark} />
              <Text style={[styles.policyText, {color: palette.muted}]}>{item}</Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={savePassword}
          disabled={savingPassword}
          style={[styles.saveButton, {backgroundColor: palette.accent}, savingPassword && styles.saveButtonDisabled]}>
          <Text style={[styles.saveButtonText, {color: palette.inverseText}]}>
            {savingPassword ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบัญชี'}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.deleteButton,
            deleteButtonTone,
          ]}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={palette.danger} />
          <Text style={[styles.deleteButtonText, {color: palette.danger}]}>ลบบัญชี</Text>
        </Pressable>
      </View>
    );
  }

  function renderAddressTab() {
    return (
      <View style={styles.panel}>
        <Text style={[styles.panelTitle, {color: palette.text}]}>ข้อมูลที่อยู่</Text>
        {profileLoading ? <ApiLoadingState label="กำลังโหลดข้อมูลโปรไฟล์" variant="inline" /> : null}
        <LabeledInput
          label="ที่อยู่"
          value={address}
          onChangeText={setAddress}
          placeholder="บ้านเลขที่ อาคาร ถนน"
          multiline
        />
        <LocationDropdown
          label="จังหวัด"
          value={selectedProvince?.nameTh || 'เลือกจังหวัด'}
          expanded={openLocationPicker === 'province'}
          loading={locationLoading && openLocationPicker === 'province'}
          options={provinces}
          getOptionKey={(item) => item.id}
          getOptionLabel={(item) => item.nameTh}
          onPress={() => {
            setOpenLocationPicker(openLocationPicker === 'province' ? null : 'province');
            if (provinces.length === 0) {
              loadProvinces();
            }
          }}
          onSelect={(item) => {
            setSelectedProvince(item);
            setSelectedAmphure(null);
            setSelectedSubdistrict(null);
            setProfileLocationIds({
              provinceId: item.id,
              amphureId: null,
              subdistrictId: null,
            });
            setAmphures([]);
            setSubdistricts([]);
            setOpenLocationPicker(null);
            loadAmphures(item.id);
          }}
        />
        <LocationDropdown
          label="อำเภอ"
          value={selectedAmphure?.nameTh || 'เลือกอำเภอ/เขต'}
          expanded={openLocationPicker === 'amphure'}
          loading={locationLoading && openLocationPicker === 'amphure'}
          disabled={!selectedProvince}
          options={amphures}
          getOptionKey={(item) => item.id}
          getOptionLabel={(item) => item.nameTh}
          onPress={() => {
            if (!selectedProvince) {
              return;
            }
            setOpenLocationPicker(openLocationPicker === 'amphure' ? null : 'amphure');
            if (amphures.length === 0) {
              loadAmphures(selectedProvince.id);
            }
          }}
          onSelect={(item) => {
            setSelectedAmphure(item);
            setSelectedSubdistrict(null);
            setProfileLocationIds((current) => ({
              ...current,
              amphureId: item.id,
              subdistrictId: null,
            }));
            setSubdistricts([]);
            setOpenLocationPicker(null);
            loadSubdistricts(item.id);
          }}
        />
        <LocationDropdown
          label="ตำบล"
          value={selectedSubdistrict?.nameTh || 'เลือกตำบล/แขวง'}
          expanded={openLocationPicker === 'subdistrict'}
          loading={locationLoading && openLocationPicker === 'subdistrict'}
          disabled={!selectedAmphure}
          options={subdistricts}
          getOptionKey={(item) => item.id}
          getOptionLabel={(item) => `${item.nameTh} ${item.zipCode}`}
          onPress={() => {
            if (!selectedAmphure) {
              return;
            }
            setOpenLocationPicker(openLocationPicker === 'subdistrict' ? null : 'subdistrict');
            if (subdistricts.length === 0) {
              loadSubdistricts(selectedAmphure.id);
            }
          }}
          onSelect={(item) => {
            setSelectedSubdistrict(item);
            setProfileLocationIds((current) => ({
              ...current,
              subdistrictId: item.id,
            }));
            setOpenLocationPicker(null);
          }}
        />
        <ReadonlyRow
          label="รหัสไปรษณีย์"
          value={selectedSubdistrict?.zipCode || '-'}
          icon="mailbox-outline"
        />
        {locationLoading && provinces.length === 0 ? (
          <ApiLoadingState label="กำลังโหลดข้อมูลที่อยู่" style={styles.addressLoadingCard} />
        ) : null}
        {locationMessage ? <Text style={[styles.locationMessage, {color: palette.danger}]}>{locationMessage}</Text> : null}
        <PdpaRow
          title="ยอมรับเงื่อนไข PDPA และนโยบายความเป็นส่วนตัว"
          value={pdpaTerms}
          onValueChange={setPdpaTerms}
        />
        <PdpaRow
          title="ยินยอมรับข่าวสารและโปรโมชันจากตลาด"
          value={pdpaMarketing}
          onValueChange={setPdpaMarketing}
        />
        <Pressable style={styles.linkButton}>
          <Text style={[styles.linkButtonText, {color: palette.accentDark}]}>อ่านรายละเอียด PDPA</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color={palette.accentDark} />
        </Pressable>
        <Pressable
          onPress={saveAddress}
          disabled={savingAddress}
          style={[styles.saveButton, {backgroundColor: palette.accent}, savingAddress && styles.saveButtonDisabled]}>
          <Text style={[styles.saveButtonText, {color: palette.inverseText}]}>
            {savingAddress ? 'กำลังบันทึก...' : 'บันทึกที่อยู่'}
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderHistoryTab() {
    return (
      <View style={styles.panel}>
        <Text style={[styles.panelTitle, {color: palette.text}]}>ประวัติการจอง</Text>
        <View style={[styles.historyFilterRow, {backgroundColor: palette.surfaceMuted}]}>
          {historyFilterOptions.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setHistoryFilter(option.key)}
              style={[
                styles.historyFilterButton,
                historyFilter === option.key && {backgroundColor: palette.surface},
              ]}>
              <Text
                style={[
                  styles.historyFilterText,
                  {color: palette.muted},
                  historyFilter === option.key && {color: palette.text},
                ]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {historyLoading ? <ApiLoadingState label="กำลังโหลดประวัติการจอง" /> : null}
        {historyMessage ? <Text style={[styles.locationMessage, {color: palette.danger}]}>{historyMessage}</Text> : null}
        {!historyLoading && filteredHistoryItems.length === 0 ? (
          <Text style={[styles.optionStateText, {color: palette.muted}]}>ไม่พบรายการตามตัวกรองนี้</Text>
        ) : null}
        {filteredHistoryItems.map((item) => (
          <View key={item.publicId} style={[styles.historyCard, {borderColor: palette.border, backgroundColor: palette.surface}]}>
            <View style={styles.historyCopy}>
              <Text style={[styles.historyId, {color: palette.text}]}>{item.publicId}</Text>
              <Text style={[styles.historyText, {color: palette.muted}]}>{item.marketName}</Text>
              <Text style={[styles.historyText, {color: palette.muted}]}>{formatHistoryLine(item)}</Text>
              <Text style={[styles.historyAmount, {color: palette.text}]}>{`${formatMoney(item.totalAmount)} บาท`}</Text>
            </View>
            <View style={[styles.statusPill, statusPillStyles(item.status, resolvedTheme)]}>
              <Text style={[styles.statusText, statusTextStyles(item.status, palette)]}>{mapBookingStatus(item.status)}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderSettingsTab() {
    return (
      <View style={styles.panel}>
        <Text style={[styles.panelTitle, {color: palette.text}]}>การตั้งค่า</Text>
        <SettingSwitch
          title="Notification"
          text="เปิดหรือปิดการแจ้งเตือนข่าวสารและสถานะการจอง"
          value={notification}
          onValueChange={setNotification}
        />
        <View style={[styles.settingBlock, {borderBottomColor: palette.border}]}>
          <Text style={[styles.settingTitle, {color: palette.text}]}>Theme</Text>
          <Text style={[styles.settingText, {color: palette.muted}]}>เลือก Dark, Light หรือปรับตามเครื่อง</Text>
          <View style={[styles.themeSegment, {backgroundColor: palette.surfaceMuted}]}>
            {(['auto', 'light', 'dark'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setThemeMode(mode)}
                style={[
                  styles.themeButton,
                  themeMode === mode && [styles.themeButtonActive, {backgroundColor: palette.surface}],
                ]}>
                <Text
                  style={[
                    styles.themeText,
                    {color: palette.muted},
                    themeMode === mode && [styles.themeTextActive, {color: palette.text}],
                  ]}>
                  {mode === 'auto' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Pressable style={styles.settingLink}>
          <MaterialCommunityIcons name="help-circle-outline" size={23} color={palette.accentDark} />
          <View style={styles.settingCopy}>
            <Text style={[styles.settingTitle, {color: palette.text}]}>วิธีใช้งาน</Text>
            <Text style={[styles.settingText, {color: palette.muted}]}>Mock หน้าคู่มือการจองและการชำระเงิน</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={palette.muted} />
        </Pressable>
      </View>
    );
  }

  function renderStoreScreen() {
    const logoPreview = pendingStoreLogo?.uri || storeLogoUrl || '';
    const galleryPreview = pendingStoreGallery.length
      ? pendingStoreGallery.map((item) => item.uri)
      : storeGalleryImages;

    return (
      <View style={styles.panel}>
        <View style={styles.storeHeaderRow}>
          <Pressable onPress={() => setShopScreenOpen(false)} style={[styles.storeBackButton, {backgroundColor: palette.surfaceMuted}]}>
            <MaterialCommunityIcons name="chevron-left" size={20} color={palette.text} />
            <Text style={[styles.storeBackText, {color: palette.text}]}>กลับ</Text>
          </Pressable>
        </View>
        <Text style={[styles.panelTitle, {color: palette.text}]}>ข้อมูลร้านค้า</Text>
        <Text style={[styles.settingText, {color: palette.muted}]}>ทุกช่องเป็นข้อมูลเสริม สามารถเว้นว่างได้</Text>

        <View style={styles.storeMediaSection}>
          <Pressable onPress={selectStoreLogo} style={[styles.storeLogoPicker, {backgroundColor: palette.surfaceMuted, borderColor: palette.border}]}>
            {logoPreview ? (
              <Image source={{uri: logoPreview}} style={styles.storeLogoImage} />
            ) : (
              <View style={styles.storeLogoFallback}>
                <MaterialCommunityIcons name="storefront-outline" size={28} color={palette.accentDark} />
                <Text style={[styles.storeLogoHint, {color: palette.muted}]}>โลโก้ร้าน</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={selectStoreGallery} style={[styles.storeGalleryButton, {backgroundColor: palette.surfaceMuted, borderColor: palette.border}]}>
            <MaterialCommunityIcons name="image-multiple-outline" size={20} color={palette.accentDark} />
            <Text style={[styles.storeGalleryButtonText, {color: palette.text}]}>เลือกแกลลอรี่</Text>
            <Text style={[styles.storeGalleryButtonCaption, {color: palette.muted}]}>
              {galleryPreview.length ? `${galleryPreview.length} รูป` : 'ยังไม่มีรูป'}
            </Text>
          </Pressable>
        </View>

        {galleryPreview.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeGalleryRow}>
            {galleryPreview.map((imageUrl) => (
              <Image key={imageUrl} source={{uri: imageUrl}} style={styles.storeGalleryImage} />
            ))}
          </ScrollView>
        ) : null}

        <LabeledInput label="ชื่อร้าน" value={storeName} onChangeText={setStoreName} placeholder="ชื่อร้านค้า" />
        <LabeledInput
          label="สินค้าที่ขาย"
          value={storeProductDescription}
          onChangeText={setStoreProductDescription}
          placeholder="อาหาร เครื่องดื่ม เสื้อผ้า หรืออื่น ๆ"
          multiline
        />
        <LabeledInput label="Facebook" value={storeFacebookUrl} onChangeText={setStoreFacebookUrl} placeholder="https://facebook.com/yourshop" autoCapitalize="none" />
        <LabeledInput label="LINE" value={storeLineId} onChangeText={setStoreLineId} placeholder="@yourshop" autoCapitalize="none" />
        <LabeledInput label="Website" value={storeWebsiteUrl} onChangeText={setStoreWebsiteUrl} placeholder="https://yourshop.com" autoCapitalize="none" />
        <LabeledInput label="เบอร์ติดต่อ" value={storeContactPhone} onChangeText={setStoreContactPhone} placeholder="08x-xxx-xxxx" keyboardType="phone-pad" />

        <Pressable
          onPress={saveStoreProfile}
          disabled={savingStore}
          style={[styles.saveButton, {backgroundColor: palette.accent}, savingStore && styles.saveButtonDisabled]}>
          <Text style={[styles.saveButtonText, {color: palette.inverseText}]}>
            {savingStore ? 'กำลังอัปเดต...' : 'อัปเดตข้อมูล'}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!user) {
    return renderGuestLogin();
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screenScroll, {backgroundColor: palette.background}]}
      refreshControl={
        activeTab === 'account' || activeTab === 'address' || activeTab === 'history'
          ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.accent} />
          : undefined
      }>
      <View style={styles.profileHero}>
        <Pressable onPress={onLogout} style={[styles.logoutButton, {backgroundColor: palette.surface, borderColor: palette.border}]}>
          <MaterialCommunityIcons name="logout" size={20} color={palette.danger} />
        </Pressable>
        {renderAvatar()}
        <Text style={[styles.profileName, {color: palette.text}]}>{user.name}</Text>
        <Pressable onPress={() => setShopScreenOpen(true)} style={[styles.profileBadge, {backgroundColor: palette.accent}]}>
          <Text style={[styles.profileBadgeText, {color: palette.inverseText}]}>ข้อมูลร้านค้า</Text>
        </Pressable>
      </View>

      <View style={[styles.tabBar, {backgroundColor: palette.surfaceMuted, borderColor: palette.surface}]}>
        {profileTabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.profileTab,
              {backgroundColor: palette.surface},
              activeTab === tab.key && [styles.profileTabActive, {backgroundColor: palette.accent}],
            ]}>
            <MaterialCommunityIcons
              name={tab.icon}
              size={21}
              color={activeTab === tab.key ? palette.inverseText : palette.accentDark}
            />
            <Text
              style={[
                styles.profileTabText,
                {color: palette.accentDark},
                activeTab === tab.key && [styles.profileTabTextActive, {color: palette.inverseText}],
              ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {message ? (
        <Text style={[styles.messageText, {color: messageTone === 'success' ? palette.accentDark : palette.danger}]}>
          {message}
        </Text>
      ) : null}

      {shopScreenOpen ? renderStoreScreen() : null}
      {!shopScreenOpen && activeTab === 'account' && renderAccountTab()}
      {!shopScreenOpen && activeTab === 'address' && renderAddressTab()}
      {!shopScreenOpen && activeTab === 'history' && renderHistoryTab()}
      {!shopScreenOpen && activeTab === 'settings' && renderSettingsTab()}
    </ScrollView>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return '-';
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

function formatHistoryLine(item: BookingHistoryRecord) {
  const boothLabel = item.boothNames.length ? item.boothNames.join(', ') : '-';
  const firstDate = formatShortDate(item.firstBookingDate);
  const lastDate = formatShortDate(item.lastBookingDate);
  const dateLabel = item.firstBookingDate && item.lastBookingDate && item.firstBookingDate !== item.lastBookingDate
    ? `${firstDate} - ${lastDate}`
    : firstDate;
  return `${boothLabel} • ${dateLabel}`;
}

function mapBookingStatus(status: string) {
  switch (resolveBookingHistoryStatus(status)) {
    case 'paid':
      return 'ชำระแล้ว';
    case 'payment_processing':
      return 'รอตรวจสอบ';
    case 'pending_payment':
      return 'รอชำระ';
    case 'cancelled':
      return 'ยกเลิก';
    case 'expired':
      return 'หมดอายุ';
    default:
      return status || '-';
  }
}

function statusPillStyles(status: string, resolvedTheme: 'light' | 'dark') {
  switch (resolveBookingHistoryStatus(status)) {
    case 'paid':
      return {
        backgroundColor: resolvedTheme === 'dark' ? '#17392f' : '#e5faf3',
      };
    case 'payment_processing':
      return {
        backgroundColor: resolvedTheme === 'dark' ? '#433110' : '#fff5d8',
      };
    case 'expired':
      return {
        backgroundColor: resolvedTheme === 'dark' ? '#391a23' : '#ffe8ee',
      };
    case 'cancelled':
      return {
        backgroundColor: resolvedTheme === 'dark' ? '#35262a' : '#f3ecef',
      };
    default:
      return {
        backgroundColor: resolvedTheme === 'dark' ? '#1e3344' : colors.soft,
      };
  }
}

function statusTextStyles(
  status: string,
  palette: ReturnType<typeof useTheme>['palette'],
) {
  switch (resolveBookingHistoryStatus(status)) {
    case 'paid':
      return {color: '#119c6b'};
    case 'payment_processing':
      return {color: '#cc8a00'};
    case 'expired':
      return {color: palette.danger};
    case 'cancelled':
      return {color: palette.danger};
    default:
      return {color: palette.accentDark};
  }
}

function resolveBookingHistoryStatus(status?: string | null) {
  return String(status || '').trim().toLowerCase();
}

function ReadonlyRow({label, value, icon}: {label: string; value: string; icon: string}) {
  const {palette} = useTheme();

  return (
    <View style={[styles.readonlyRow, {backgroundColor: palette.surfaceMuted}]}>
      <MaterialCommunityIcons name={icon} size={22} color={palette.accentDark} />
      <View style={styles.readonlyCopy}>
        <Text style={[styles.readonlyLabel, {color: palette.muted}]}>{label}</Text>
        <Text style={[styles.readonlyValue, {color: palette.text}]}>{value}</Text>
      </View>
    </View>
  );
}

function LocationDropdown<T>({
  label,
  value,
  expanded,
  loading,
  disabled,
  options,
  getOptionKey,
  getOptionLabel,
  onPress,
  onSelect,
}: {
  label: string;
  value: string;
  expanded: boolean;
  loading?: boolean;
  disabled?: boolean;
  options: T[];
  getOptionKey: (item: T) => string | number;
  getOptionLabel: (item: T) => string;
  onPress: () => void;
  onSelect: (item: T) => void;
}) {
  const {palette} = useTheme();
  const renderOption = useCallback(({item}: {item: T}) => (
    <Pressable
      onPress={() => onSelect(item)}
      style={[styles.optionItem, {borderBottomColor: palette.border}]}>
      <Text style={[styles.optionText, {color: palette.text}]}>{getOptionLabel(item)}</Text>
    </Pressable>
  ), [getOptionLabel, onSelect, palette.border, palette.text]);

  return (
    <View style={styles.dropdownWrap}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.dropdown,
          {borderColor: palette.border, backgroundColor: palette.surface},
          disabled && [styles.dropdownDisabled, {backgroundColor: palette.surfaceMuted}],
        ]}>
        <View>
          <Text style={[styles.dropdownLabel, {color: palette.muted}]}>{label}</Text>
          <Text style={[styles.dropdownValue, {color: palette.text}, disabled && styles.dropdownValueDisabled]}>{value}</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={disabled ? '#b8c8d4' : palette.muted}
        />
      </Pressable>
      {expanded ? (
        <View style={[styles.optionList, {borderColor: palette.border, backgroundColor: palette.surface}]}>
          {loading ? <ApiLoadingState label="กำลังโหลดข้อมูล" variant="inline" /> : null}
          {!loading && options.length === 0 ? <Text style={[styles.optionStateText, {color: palette.muted}]}>ไม่พบข้อมูล</Text> : null}
          {!loading ? (
            <FlatList
              nestedScrollEnabled
              data={options}
              keyExtractor={(item) => String(getOptionKey(item))}
              renderItem={renderOption}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={5}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function PdpaRow({
  title,
  value,
  onValueChange,
}: {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const {palette} = useTheme();

  return (
    <View style={[styles.pdpaRow, {borderBottomColor: palette.border}]}>
      <Text style={[styles.pdpaText, {color: palette.text}]}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? palette.inverseText : '#f4f7fa'}
        trackColor={{false: '#d7e3eb', true: palette.accent}}
      />
    </View>
  );
}

function SettingSwitch({
  title,
  text,
  value,
  onValueChange,
}: {
  title: string;
  text: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const {palette} = useTheme();

  return (
    <View style={[styles.settingLink, {borderBottomColor: palette.border}]}>
      <MaterialCommunityIcons name="bell-outline" size={23} color={palette.accentDark} />
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, {color: palette.text}]}>{title}</Text>
        <Text style={[styles.settingText, {color: palette.muted}]}>{text}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? palette.inverseText : '#f4f7fa'}
        trackColor={{false: '#d7e3eb', true: palette.accent}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenScroll: {
    padding: 22,
    paddingBottom: 122,
  },
  guestScreenLayout: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  guestHero: {
    minHeight: 250,
    borderRadius: 34,
    padding: 24,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  guestLogo: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  guestTitle: {
    color: colors.ink,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '900',
  },
  guestText: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },
  guestCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  guestAuditFooter: {
    marginTop: 20,
    paddingTop: 10,
  },
  auditPortalButton: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: '#0d2238',
    borderWidth: 1,
    borderColor: '#213a55',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadow,
  },
  auditPortalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  gmailButton: {
    height: 58,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  gmailButtonText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  messageText: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  profileHero: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
  },
  logoutButton: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrap: {
    marginTop: 4,
  },
  avatarImage: {
    borderRadius: 52,
    borderWidth: 4,
    borderColor: colors.white,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.tealDark,
    fontSize: 34,
    fontWeight: '900',
  },
  avatarEdit: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  profileName: {
    marginTop: 14,
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  profileBadge: {
    marginTop: 9,
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: colors.teal,
    justifyContent: 'center',
  },
  profileBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  storeHeaderRow: {
    marginBottom: 12,
  },
  storeBackButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeBackText: {
    fontSize: 13,
    fontWeight: '900',
  },
  storeMediaSection: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  storeLogoPicker: {
    width: 108,
    height: 108,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  storeLogoImage: {
    width: '100%',
    height: '100%',
  },
  storeLogoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  storeLogoHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  storeGalleryButton: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  storeGalleryButtonText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '900',
  },
  storeGalleryButtonCaption: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  storeGalleryRow: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: 4,
  },
  storeGalleryImage: {
    width: 96,
    height: 96,
    borderRadius: 18,
    backgroundColor: colors.soft,
  },
  tabBar: {
    marginTop: 8,
    marginHorizontal: 12,
    padding: 8,
    borderRadius: 27,
    backgroundColor: '#eff8f7',
    flexDirection: 'row',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.white,
    ...shadow,
  },
  profileTab: {
    flex: 1,
    minHeight: 58,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: colors.white,
  },
  profileTabActive: {
    backgroundColor: colors.teal,
  },
  profileTabText: {
    color: colors.tealDark,
    fontSize: 10,
    fontWeight: '900',
  },
  profileTabTextActive: {
    color: colors.white,
  },
  panel: {
    marginTop: 18,
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16,
  },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 20,
    backgroundColor: colors.soft,
    marginBottom: 14,
  },
  readonlyCopy: {
    flex: 1,
  },
  readonlyLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  readonlyValue: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineInput: {
    flex: 1,
  },
  secondaryButton: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryButtonDisabled: {
    opacity: 0.55,
  },
  helperText: {
    marginTop: -2,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: '800',
  },
  policyBox: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f7fbfb',
    gap: 8,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  policyText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  saveButton: {
    marginTop: 16,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  deleteButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#f3b9c6',
    backgroundColor: '#fff5f7',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
  dropdownWrap: {
    marginBottom: 14,
  },
  dropdown: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fbfdfe',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownDisabled: {
    backgroundColor: '#f1f6f8',
  },
  dropdownLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  dropdownValue: {
    marginTop: 5,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  dropdownValueDisabled: {
    color: '#9badbc',
  },
  optionList: {
    marginTop: 8,
    maxHeight: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  optionItem: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf3f7',
  },
  optionText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  optionStateText: {
    padding: 16,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  addressLoadingCard: {
    marginBottom: 12,
  },
  locationMessage: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
  },
  pdpaRow: {
    minHeight: 60,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  pdpaText: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  linkButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  linkButtonText: {
    color: colors.tealDark,
    fontSize: 14,
    fontWeight: '900',
  },
  historyCard: {
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fbfdfe',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyFilterRow: {
    marginBottom: 14,
    padding: 4,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
  },
  historyFilterButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  historyFilterText: {
    fontSize: 12,
    fontWeight: '900',
  },
  historyCopy: {
    flex: 1,
  },
  historyId: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  historyText: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  historyAmount: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '900',
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.soft,
    justifyContent: 'center',
  },
  statusText: {
    color: colors.tealDark,
    fontSize: 11,
    fontWeight: '900',
  },
  settingLink: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  settingText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  settingBlock: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  themeSegment: {
    marginTop: 12,
    padding: 4,
    borderRadius: 17,
    backgroundColor: colors.soft,
    flexDirection: 'row',
  },
  themeButton: {
    flex: 1,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeButtonActive: {
    backgroundColor: colors.white,
  },
  themeText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  themeTextActive: {
    color: colors.ink,
  },
});

export default React.memo(ProfileScreen);
