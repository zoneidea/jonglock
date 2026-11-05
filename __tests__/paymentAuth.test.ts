import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {paymentAccessToken} from '../src/services/paymentAuth';
jest.mock('@react-native-google-signin/google-signin', () => ({GoogleSignin: {getTokens: jest.fn(), signIn: jest.fn()}}));
jest.mock('../src/services/paymentActivity', () => ({paymentActivity: jest.fn()}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(GoogleSignin.getTokens).mockResolvedValue({idToken: 'existing-google-session', accessToken: 'unused'});
  global.fetch = jest.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({data: {token: 'short-jwt', user: {email: 'buyer@gmail.com'}}})});
});
test('uses the existing Google session silently and email restored by the app, without extra sign-in', async () => {
  expect(await paymentAccessToken(7, 'Buyer@gmail.com')).toBe('short-jwt');
  expect(GoogleSignin.signIn).not.toHaveBeenCalled();
  const [url, request] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(/\/mobile\/auth\/google$/);
  expect(JSON.parse(request.body)).toEqual({organizationId: 7, googleIdToken: 'existing-google-session'});
});
test('a changed local email does not grant access to another customer', async () => {
  await expect(paymentAccessToken(7, 'other@gmail.com')).rejects.toThrow('ไม่ตรงกับเจ้าของรายการ');
});
test('local email-only state cannot manufacture an authenticated payment session', async () => {
  jest.mocked(GoogleSignin.getTokens).mockRejectedValue(new Error('SIGN_IN_REQUIRED'));
  await expect(paymentAccessToken(7, 'buyer@gmail.com')).rejects.toThrow('เข้าสู่ระบบด้วย Google');
  expect(fetch).not.toHaveBeenCalled();
});
