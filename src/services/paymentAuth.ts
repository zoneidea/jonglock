import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {API_BASE_URL} from '../config/api';
import {paymentFetch} from './paymentTransport';
import {paymentActivity} from './paymentActivity';

async function restoredGoogleToken(): Promise<string> {
  paymentActivity('restore-google-session', 'customer-token');
  let result;
  try {result = await GoogleSignin.signInSilently();}
  catch {throw new Error('เชื่อมต่อบัญชี Google ไม่สำเร็จ กรุณาลองอีกครั้ง');}
  if (result.type !== 'success') {
    throw new Error('ไม่พบเซสชัน Google ที่บันทึกไว้ กรุณาเข้าสู่ระบบด้วย Google ก่อนชำระเงิน');
  }
  try {
    const {idToken} = await GoogleSignin.getTokens();
    if (!idToken) {throw new Error('NO_TOKEN');}
    return idToken;
  } catch {throw new Error('ต่ออายุเซสชันชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง');}
}

async function existingGoogleToken(): Promise<string> {
  try {
    const {idToken} = await GoogleSignin.getTokens();
    if (!idToken) {throw new Error('NO_TOKEN');}
    return idToken;
  } catch {
    // AsyncStorage profile restoration does not restore native Google currentUser.
    // Restore the saved Google credential without opening an interactive sign-in UI.
    return restoredGoogleToken();
  }
}

/** Use and silently restore the existing Google session. Never persist ID/JWT tokens in AsyncStorage. */
export async function paymentAccessToken(organizationId: number, expectedEmail: string): Promise<string> {
  const exchange = async (idToken: string) => {
    try {
      const response = await paymentFetch(`${API_BASE_URL}/mobile/auth/google`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({organizationId, googleIdToken: idToken}),
      }, 'customer-token');
      return {response, payload: await response.json().catch(() => null)};
    } catch {throw new Error('เชื่อมต่อระบบชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง');}
  };
  let {response, payload} = await exchange(await existingGoogleToken());
  // A rejected identity token gets one silent refresh, never an automatic logout.
  if (response.status === 401) {
    ({response, payload} = await exchange(await restoredGoogleToken()));
  }
  if (!response.ok || typeof payload?.data?.token !== 'string' || !payload.data.token) {
    if (payload?.code === 'CUSTOMER_NOT_FOUND') {throw new Error('ไม่พบบัญชีผู้จองในตลาดนี้ กรุณาติดต่อผู้ดูแลตลาด');}
    throw new Error('ยังยืนยันเซสชันชำระเงินไม่ได้ กรุณาลองอีกครั้ง');
  }
  if (payload.data.user?.email?.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) {
    throw new Error('บัญชี Google ที่เข้าสู่ระบบไม่ตรงกับเจ้าของรายการจอง');
  }
  return payload.data.token;
}
