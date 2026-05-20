import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import GoogleIcon from '../components/GoogleIcon';
import LabeledInput from '../components/LabeledInput';
import {
  getAmphures,
  getProvinces,
  getSubdistricts,
  type Amphure,
  type Province,
  type Subdistrict,
} from '../services/locations';
import {colors, shadow} from '../theme/colors';
import type {MobileUser} from '../types/user';

type ProfileTab = 'account' | 'address' | 'history' | 'settings';

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

function ProfileScreen({
  user,
  onLogout,
  onAuthenticated,
  onUserChange,
}: {
  user: MobileUser | null;
  onLogout: () => void;
  onAuthenticated: (user: MobileUser) => void;
  onUserChange: (user: MobileUser) => void;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('account');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
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
  const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark'>('auto');
  const [message, setMessage] = useState('');

  const initials = useMemo(() => {
    const source = user?.name || user?.email || 'J';
    return source
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

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

  async function changeAvatar() {
    if (!user) {
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
    const uri = result.assets?.[0]?.uri;
    if (uri) {
      onUserChange({...user, avatar: uri});
    }
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
        return;
      }
      if (!isSuccessResponse(result)) {
        setMessage('ยังไม่สามารถเข้าสู่ระบบด้วย Gmail ได้');
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
    } catch (error) {
      const code = isErrorWithCode(error) ? String(error.code) : '';
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        setMessage('ยกเลิกการเข้าสู่ระบบด้วย Gmail');
      } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setMessage('Google Play Services ยังไม่พร้อมใช้งาน');
      } else if (code === '10' || code === 'DEVELOPER_ERROR') {
        setMessage('ตั้งค่า Google Sign-In ยังไม่ครบ กรุณาตรวจสอบ SHA-1/SHA-256 ใน Firebase');
      } else {
        setMessage('ยังไม่สามารถเข้าสู่ระบบด้วย Gmail ได้');
      }
    }
  }

  function renderAvatar(size = 104) {
    return (
      <Pressable onPress={changeAvatar} disabled={!user} style={styles.avatarWrap}>
        {user?.avatar ? (
          <Image source={{uri: user.avatar}} style={[styles.avatarImage, {width: size, height: size}]} />
        ) : (
          <LinearGradient
            colors={['#dff8f4', '#ffffff']}
            style={[styles.avatarImage, styles.avatarFallback, {width: size, height: size}]}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </LinearGradient>
        )}
        {user ? (
          <View style={styles.avatarEdit}>
            <MaterialCommunityIcons name="camera-outline" size={17} color={colors.white} />
          </View>
        ) : null}
      </Pressable>
    );
  }

  function renderGuestLogin() {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.screenScroll} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={['#e4fbf8', '#ffffff']} style={styles.guestHero}>
            <View style={styles.guestLogo}>
              <MaterialCommunityIcons name="storefront-outline" size={28} color={colors.tealDark} />
            </View>
            <Text style={styles.guestTitle}>เข้าสู่ระบบผู้ค้า</Text>
            <Text style={styles.guestText}>
              ใช้ Gmail เพื่อดูข้อมูลบัญชี ประวัติการจอง และตั้งค่าการใช้งานส่วนตัว
            </Text>
          </LinearGradient>

          <View style={styles.guestCard}>
            <Pressable onPress={continueWithGmail} style={styles.gmailButton}>
              <GoogleIcon />
              <Text style={styles.gmailButtonText}>ดำเนินการต่อด้วย Gmail</Text>
            </Pressable>
            {message ? <Text style={styles.messageText}>{message}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  function renderAccountTab() {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>ข้อมูล Account</Text>
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
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>ส่ง OTP</Text>
          </Pressable>
        </View>
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
        <View style={styles.policyBox}>
          {passwordPolicy.map((item) => (
            <View key={item} style={styles.policyRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.tealDark} />
              <Text style={styles.policyText}>{item}</Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.saveButton}>
          <Text style={styles.saveButtonText}>บันทึกข้อมูลบัญชี</Text>
        </Pressable>
        <Pressable style={styles.deleteButton}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteButtonText}>ลบบัญชี</Text>
        </Pressable>
      </View>
    );
  }

  function renderAddressTab() {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>ข้อมูลที่อยู่</Text>
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
            setOpenLocationPicker(null);
          }}
        />
        <ReadonlyRow
          label="รหัสไปรษณีย์"
          value={selectedSubdistrict?.zipCode || '-'}
          icon="mailbox-outline"
        />
        {locationMessage ? <Text style={styles.locationMessage}>{locationMessage}</Text> : null}
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
          <Text style={styles.linkButtonText}>อ่านรายละเอียด PDPA</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color={colors.tealDark} />
        </Pressable>
        <Pressable style={styles.saveButton}>
          <Text style={styles.saveButtonText}>บันทึกที่อยู่</Text>
        </Pressable>
      </View>
    );
  }

  function renderHistoryTab() {
    const histories = [
      {id: 'T22605000336', market: 'อาคาร ชินวัตร 2', booth: 'B15', date: '18 พ.ค. 2569', status: 'ชำระแล้ว'},
      {id: 'T22605000309', market: 'ตลาดนัดทดสอบ', booth: 'B10', date: '15 พ.ค. 2569', status: 'รอชำระเงิน'},
      {id: 'T22604001738', market: 'อาคาร ชินวัตร 2', booth: 'B7', date: '5 พ.ค. 2569', status: 'หมดเวลา'},
    ];
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>ประวัติการจอง</Text>
        {histories.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View>
              <Text style={styles.historyId}>{item.id}</Text>
              <Text style={styles.historyText}>{item.market}</Text>
              <Text style={styles.historyText}>Booth {item.booth} · {item.date}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderSettingsTab() {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>การตั้งค่า</Text>
        <SettingSwitch
          title="Notification"
          text="เปิดหรือปิดการแจ้งเตือนข่าวสารและสถานะการจอง"
          value={notification}
          onValueChange={setNotification}
        />
        <View style={styles.settingBlock}>
          <Text style={styles.settingTitle}>Theme</Text>
          <Text style={styles.settingText}>เลือก Dark, Light หรือปรับตามเครื่อง</Text>
          <View style={styles.themeSegment}>
            {(['auto', 'light', 'dark'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setThemeMode(mode)}
                style={[styles.themeButton, themeMode === mode && styles.themeButtonActive]}>
                <Text style={[styles.themeText, themeMode === mode && styles.themeTextActive]}>
                  {mode === 'auto' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Pressable style={styles.settingLink}>
          <MaterialCommunityIcons name="help-circle-outline" size={23} color={colors.tealDark} />
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>วิธีใช้งาน</Text>
            <Text style={styles.settingText}>Mock หน้าคู่มือการจองและการชำระเงิน</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.muted} />
        </Pressable>
      </View>
    );
  }

  if (!user) {
    return renderGuestLogin();
  }

  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <View style={styles.profileHero}>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
        </Pressable>
        {renderAvatar()}
        <Text style={styles.profileName}>{user.name}</Text>
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeText}>Gmail Connected</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {profileTabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.profileTab, activeTab === tab.key && styles.profileTabActive]}>
            <MaterialCommunityIcons
              name={tab.icon}
              size={21}
              color={activeTab === tab.key ? colors.white : colors.tealDark}
            />
            <Text style={[styles.profileTabText, activeTab === tab.key && styles.profileTabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'account' && renderAccountTab()}
      {activeTab === 'address' && renderAddressTab()}
      {activeTab === 'history' && renderHistoryTab()}
      {activeTab === 'settings' && renderSettingsTab()}
    </ScrollView>
  );
}

function ReadonlyRow({label, value, icon}: {label: string; value: string; icon: string}) {
  return (
    <View style={styles.readonlyRow}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.tealDark} />
      <View style={styles.readonlyCopy}>
        <Text style={styles.readonlyLabel}>{label}</Text>
        <Text style={styles.readonlyValue}>{value}</Text>
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
  return (
    <View style={styles.dropdownWrap}>
      <Pressable onPress={onPress} disabled={disabled} style={[styles.dropdown, disabled && styles.dropdownDisabled]}>
        <View>
          <Text style={styles.dropdownLabel}>{label}</Text>
          <Text style={[styles.dropdownValue, disabled && styles.dropdownValueDisabled]}>{value}</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={disabled ? '#b8c8d4' : colors.muted}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.optionList}>
          {loading ? <Text style={styles.optionStateText}>กำลังโหลดข้อมูล...</Text> : null}
          {!loading && options.length === 0 ? <Text style={styles.optionStateText}>ไม่พบข้อมูล</Text> : null}
          {!loading ? (
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {options.map((item) => (
                <Pressable key={String(getOptionKey(item))} onPress={() => onSelect(item)} style={styles.optionItem}>
                  <Text style={styles.optionText}>{getOptionLabel(item)}</Text>
                </Pressable>
              ))}
            </ScrollView>
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
  return (
    <View style={styles.pdpaRow}>
      <Text style={styles.pdpaText}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? colors.white : '#f4f7fa'}
        trackColor={{false: '#d7e3eb', true: colors.teal}}
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
  return (
    <View style={styles.settingLink}>
      <MaterialCommunityIcons name="bell-outline" size={23} color={colors.tealDark} />
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingText}>{text}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? colors.white : '#f4f7fa'}
        trackColor={{false: '#d7e3eb', true: colors.teal}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenScroll: {
    padding: 22,
    paddingBottom: 122,
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
