import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {paymentAccessToken} from '../src/services/paymentAuth';
jest.mock('@react-native-google-signin/google-signin', () => ({GoogleSignin: {getTokens: jest.fn(), signIn: jest.fn(), signInSilently: jest.fn()}}));
jest.mock('../src/services/paymentActivity', () => ({paymentActivity: jest.fn()}));
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(GoogleSignin.getTokens).mockResolvedValue({idToken: 'existing-google-session', accessToken: 'unused'});
  jest.mocked(GoogleSignin.signInSilently).mockResolvedValue({type: 'noSavedCredentialFound', data: null});
  global.fetch = jest.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({data: {token: 'short-jwt', user: {email: 'buyer@gmail.com'}}})});
});
test('restores the saved native credential when the app profile is logged in but native currentUser is absent', async () => {
  jest.mocked(GoogleSignin.getTokens).mockRejectedValueOnce(new Error('getTokens requires a user to be signed in'));
  jest.mocked(GoogleSignin.signInSilently).mockResolvedValue({type: 'success', data: {user: {email: 'buyer@gmail.com'}}} as Awaited<ReturnType<typeof GoogleSignin.signInSilently>>);
  expect(await paymentAccessToken(7, 'buyer@gmail.com')).toBe('short-jwt');
  expect(GoogleSignin.signInSilently).toHaveBeenCalledTimes(1);
  expect(GoogleSignin.signIn).not.toHaveBeenCalled();
});
test('rejected identity token is refreshed silently once before repeating only the authentication exchange', async () => {
  jest.mocked(GoogleSignin.getTokens).mockResolvedValueOnce({idToken: 'old-session', accessToken: 'unused'})
    .mockResolvedValueOnce({idToken: 'refreshed-session', accessToken: 'unused'});
  (fetch as jest.Mock).mockResolvedValueOnce({ok: false, status: 401, json: async () => ({code: 'INVALID_IDENTITY_TOKEN'})});
  jest.mocked(GoogleSignin.signInSilently).mockResolvedValue({type: 'success', data: {user: {email: 'buyer@gmail.com'}}} as Awaited<ReturnType<typeof GoogleSignin.signInSilently>>);
  expect(await paymentAccessToken(7, 'buyer@gmail.com')).toBe('short-jwt');
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse((fetch as jest.Mock).mock.calls[1][1].body).googleIdToken).toBe('refreshed-session');
  expect(GoogleSignin.signInSilently).toHaveBeenCalledTimes(1);
  expect(GoogleSignin.signIn).not.toHaveBeenCalled();
});
test('customer authorization failure is explained without asking the logged-in user to sign in again', async () => {
  (fetch as jest.Mock).mockResolvedValue({ok: false, status: 403, json: async () => ({code: 'CUSTOMER_NOT_FOUND'})});
  await expect(paymentAccessToken(7, 'buyer@gmail.com')).rejects.toThrow('ติดต่อผู้ดูแลตลาด');
  expect(GoogleSignin.signInSilently).not.toHaveBeenCalled();
});
test('transient server failure does not turn into a login-required error', async () => {
  (fetch as jest.Mock).mockResolvedValue({ok: false, status: 503, json: async () => ({})});
  await expect(paymentAccessToken(7, 'buyer@gmail.com')).rejects.toThrow('กรุณาลองอีกครั้ง');
  expect(GoogleSignin.signIn).not.toHaveBeenCalled();
  expect(GoogleSignin.signInSilently).not.toHaveBeenCalled();
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
