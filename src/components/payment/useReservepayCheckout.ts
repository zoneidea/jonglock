import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, Linking} from 'react-native';
import {paymentAccessToken} from '../../services/paymentAuth';
import {
  ReservepayError, discoverNextAction, getRedirectUrl, getActiveReservepayAttempt,
  getReservepayPaymentStatus, initiateReservepayPayment, retrievePaymentSession,
  retrieveQrData, selectPaymentMethod, toMinorUnits,
  type ReservepayConfig, type ReservepayAttempt, type ReservepayInitiation,
} from '../../services/reservepay';

export type CheckoutPhase = 'idle' | 'starting' | 'qr' | 'redirect' | 'waiting' | 'success' | 'failed' | 'expired' | 'error';
export type CheckoutState = {phase: CheckoutPhase; qrPayload?: string; expiresAtMs?: number | null; message?: string};
type PendingRequest = {body: ReservepayInitiation; key: string};
// Retain the exact request after an uncertain response; never persist sessions or tokens to AsyncStorage.
const pendingRequests = new Map<string, PendingRequest>();
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const finished = (attempt: ReservepayAttempt) => ['paid', 'failed', 'expired', 'cancelled', 'review'].includes(attempt.status);

export function useReservepayCheckout() {
  const [state, setState] = useState<CheckoutState>({phase: 'idle'});
  const runIdRef = useRef(0);
  const running = useRef(false);
  const cancel = useCallback(() => {runIdRef.current += 1; running.current = false; setState({phase: 'idle'});}, []);
  useEffect(() => () => {runIdRef.current += 1;}, []);

  const start = useCallback(async (args: {
    config: ReservepayConfig; paymentMethod: string; amountBaht: number; bookingIds: number[];
    organizationId: number; user: {email: string; name?: string}; onSuccess: () => void;
    getCardToken?: () => Promise<string>;
  }) => {
    if (running.current) {return;}
    running.current = true;
    const runId = ++runIdRef.current;
    const cancelled = () => runIdRef.current !== runId;
    const group = `${args.user.email.trim().toLowerCase()}:${args.organizationId}:${[...args.bookingIds].sort((a, b) => a - b).join(',')}`;
    setState({phase: 'starting'});
    try {
      const token = await paymentAccessToken(args.organizationId, args.user.email);
      if (cancelled()) {return;}
      let attempt = (await getActiveReservepayAttempt(token, args.bookingIds)).attempt;
      if (cancelled()) {return;}
      if (!attempt) {
        let request = pendingRequests.get(group);
        if (!request) {
          const cardToken = args.paymentMethod === 'CARD' ? await args.getCardToken?.() : undefined;
          if (cancelled()) {return;}
          if (args.paymentMethod === 'CARD' && !cardToken) {throw new Error('กรุณากรอกข้อมูลบัตร');}
          const amount = toMinorUnits(args.amountBaht);
          const paymentSessionId = await selectPaymentMethod(args.config, {amount, paymentMethod: args.paymentMethod,
            customerEmail: args.user.email, ...(cardToken ? {token: cardToken} : {})});
          if (cancelled()) {return;}
          request = {body: {bookingIds: args.bookingIds, paymentSessionId, amount}, key: `JL-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`};
          pendingRequests.set(group, request);
        }
        // An HTTP timeout may follow a committed attempt. Retry only this exact body and key.
        for (let retry = 0; retry < 3 && !cancelled(); retry += 1) {
          try {attempt = await initiateReservepayPayment(token, request.body, request.key); break;}
          catch (error) {
            if (error instanceof ReservepayError && !error.code.startsWith('HTTP_5')) {throw error;}
            if (retry === 2) {throw new Error('ยังยืนยันผลเริ่มชำระไม่ได้ กรุณาตรวจสอบรายการเดิมอีกครั้ง');}
            await sleep(1500);
          }
        }
      }
      if (!attempt || cancelled()) {return;}
      const deadline = Date.now() + 10 * 60 * 1000;
      let actionHandled = false;
      while (!cancelled() && Date.now() < deadline) {
        if (AppState.currentState && AppState.currentState !== 'active') {await sleep(1000); continue;}
        try {
          attempt = await getReservepayPaymentStatus(token, attempt.attemptId);
          if (cancelled()) {return;}
          if (finished(attempt)) {break;}
          if (!actionHandled && attempt.paymentId) {
            const action = await discoverNextAction(args.config, attempt.paymentSessionId);
            if (cancelled()) {return;}
            if (action === 'DISPLAY_QR') {
              const qrPayload = await retrieveQrData(args.config, attempt.paymentSessionId);
              const session = await retrievePaymentSession(args.config, attempt.paymentSessionId).catch(() => null);
              if (cancelled()) {return;}
              setState({phase: 'qr', qrPayload, expiresAtMs: session?.expires_at ? session.expires_at * 1000 : null});
              actionHandled = true;
            } else if (action === 'REDIRECT') {
              const url = await getRedirectUrl(args.config, attempt.paymentSessionId);
              if (cancelled()) {return;}
              if (url) {setState({phase: 'redirect'}); await Linking.openURL(url); actionHandled = true;}
            } else if (action === 'CHECK_STATUS') {setState({phase: 'waiting'}); actionHandled = true;}
          }
        } catch (error) {
          if (error instanceof ReservepayError && !['NOT_READY', 'HTTP_500', 'HTTP_502', 'HTTP_503', 'HTTP_504'].includes(error.code)) {throw error;}
        }
        await sleep(3000);
      }
      if (cancelled()) {return;}
      if (attempt.status === 'paid') {
        pendingRequests.delete(group); setState({phase: 'success'}); args.onSuccess();
      } else if (['failed', 'expired', 'cancelled'].includes(attempt.status)) {
        pendingRequests.delete(group);
        const minimumMessage = attempt.failureCode === 'AMOUNT_BELOW_MINIMUM' && /^\d{1,14}$/.test(attempt.minimumAmount || '')
          ? `ช่องทางนี้รับชำระขั้นต่ำ ${(Number(attempt.minimumAmount) / 100).toLocaleString('th-TH')} บาท กรุณาเลือกช่องทางอื่นหรือโอนเงินแนบสลิป` : undefined;
        setState({phase: attempt.status === 'expired' ? 'expired' : 'failed', message: minimumMessage || (attempt.status === 'expired' ? 'รายการหมดอายุแล้ว สามารถเริ่มชำระใหม่ได้' : 'การชำระไม่สำเร็จ สามารถเลือกช่องทางและลองใหม่ได้')});
      } else {
        setState({phase: 'waiting', message: attempt.status === 'review' ? 'รายการอยู่ระหว่างตรวจสอบ กรุณาติดต่อผู้ดูแล' : 'ยังรอยืนยันผลชำระเงิน สามารถกลับมาตรวจสอบรายการเดิมได้'});
      }
    } catch (error) {
      if (cancelled()) {return;}
      setState({phase: 'error', message: error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อระบบชำระเงินได้'});
    } finally {if (!cancelled()) {running.current = false;}}
  }, []);
  return {state, start, cancel};
}
