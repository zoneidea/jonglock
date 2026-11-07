import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {API_BASE_URL} from '../config/api';

export async function deleteMyAccount(expectedEmail: string): Promise<void> {
  let session;
  try {session = await GoogleSignin.signInSilently();} catch { /* Reauthenticate interactively below. */ }
  if (!session || session.type !== 'success') {session = await GoogleSignin.signIn();}
  if (session.type !== 'success') {
    throw new Error('ยกเลิกการยืนยันบัญชี Google');
  }
  if (session.data.user.email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) {
    throw new Error('กรุณายืนยันด้วยบัญชี Google เดียวกับบัญชีที่ต้องการลบ');
  }
  const {idToken} = await GoogleSignin.getTokens();
  if (!idToken) {throw new Error('ยืนยันบัญชี Google ไม่สำเร็จ กรุณาลองอีกครั้ง');}
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_BASE_URL}/mobile/account`, {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${idToken}`},
      body: JSON.stringify({confirmation: true}), signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.data?.deleted !== true) {
      throw new Error(payload?.message || 'ลบบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
    await GoogleSignin.revokeAccess().catch(() => undefined);
  } finally {clearTimeout(timer);}
}
