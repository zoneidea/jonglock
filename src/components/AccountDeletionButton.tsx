import React, {useRef, useState} from 'react';
import {Alert, Pressable, StyleSheet} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Text} from './AppText';
import {deleteMyAccount} from '../services/accountDeletion';
import {useTheme} from '../theme/theme';

export default function AccountDeletionButton({email, onDeleted}: {email: string; onDeleted: () => void}) {
  const {palette} = useTheme();
  const [deleting, setDeleting] = useState(false);
  const busy = useRef(false);
  const performDeletion = async () => {
    if (busy.current) {return;}
    busy.current = true;
    setDeleting(true);
    try {
      await deleteMyAccount(email);
    } catch (error) {
      busy.current = false;
      setDeleting(false);
      Alert.alert('ลบบัญชีไม่สำเร็จ', (error as Error).message || 'กรุณาลองอีกครั้ง');
      return;
    }
    await onDeleted();
    Alert.alert('ลบบัญชีสำเร็จ', 'ข้อมูลโปรไฟล์และบัญชีผู้ใช้ถูกลบแล้ว');
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="ลบบัญชี" disabled={deleting}
      accessibilityState={{disabled: deleting, busy: deleting}}
      onPress={() => Alert.alert('ยืนยันลบบัญชี',
        'ระบบจะลบข้อมูลโปรไฟล์ ร้านค้า รูปภาพ และการแจ้งเตือนของคุณ บัญชีนี้จะใช้งานต่อไม่ได้ ประวัติธุรกรรมที่จำเป็นต่อระบบบัญชีจะถูกเก็บโดยไม่ผูกกับข้อมูลโปรไฟล์เดิม คุณต้องการลบบัญชีหรือไม่?',
        [{text: 'ยกเลิก', style: 'cancel'}, {text: 'ลบบัญชีถาวร', style: 'destructive', onPress: performDeletion}])}
      style={[styles.button, {borderColor: palette.danger}, deleting && styles.disabled]}>
      <MaterialCommunityIcons name="trash-can-outline" size={18} color={palette.danger} />
      <Text style={[styles.label, {color: palette.danger}]}>{deleting ? 'กำลังลบบัญชี...' : 'ลบบัญชี'}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {minHeight:48, borderWidth:1, borderRadius:16, flexDirection:'row', gap:8, alignItems:'center', justifyContent:'center', marginTop:16},
  label: {fontSize:14, fontWeight:'700'},
  disabled: {opacity:0.5},
});
