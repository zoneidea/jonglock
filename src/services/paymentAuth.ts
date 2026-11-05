import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {API_BASE_URL} from '../config/api';
import {paymentFetch} from './paymentTransport';

/** Use the existing native Google session silently. Never persist ID/JWT tokens in AsyncStorage. */
export async function paymentAccessToken(organizationId: number, expectedEmail: string): Promise<string> {
  let idToken: string;
  try {idToken = (await GoogleSignin.getTokens()).idToken; if (!idToken) {throw new Error('NO_TOKEN');}}
  catch {throw new Error('กรุณาเข้าสู่ระบบด้วย Google อีกครั้งก่อนชำระเงิน');}
  const response = await paymentFetch(`${API_BASE_URL}/mobile/auth/google`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({organizationId, googleIdToken: idToken}),
  }, 'customer-token');
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data?.token) {throw new Error('ยืนยันบัญชีสำหรับชำระเงินไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');}
  if (payload.data.user?.email?.toLowerCase() !== expectedEmail.trim().toLowerCase()) {
    throw new Error('บัญชี Google ที่เข้าสู่ระบบไม่ตรงกับเจ้าของรายการจอง');
  }
  return payload.data.token;
}
