import type {ReservepayMethod} from '../../services/reservepay';

export type PaymentOptionKind = 'qr' | 'wallet' | 'card' | 'banking' | 'other';

export type PaymentOption = {
  /** ReservePay payment_method value sent to select-payment-method. */
  name: string;
  label: string;
  icon: string;
  kind: PaymentOptionKind;
  /** Card needs ReservePay's hosted card fields (tokenize) – not wired up in the app yet. */
  comingSoon?: boolean;
};

type Rule = {match: RegExp; label: string; icon: string; kind: PaymentOptionKind};

// Display order follows the payment channel list used by Jonglock (PromptPay first, mobile banking last).
const PRIMARY_RULES: Rule[] = [
  {match: /prompt\s*_?pay/i, label: 'PromptPay QR', icon: 'qrcode-scan', kind: 'qr'},
  {match: /we\s*_?chat/i, label: 'WeChat Pay', icon: 'wechat', kind: 'wallet'},
  {match: /ali\s*_?pay/i, label: 'Alipay', icon: 'alpha-a-circle-outline', kind: 'wallet'},
  {match: /true\s*_?money/i, label: 'TrueMoney', icon: 'wallet-outline', kind: 'wallet'},
  {match: /^card$|credit|debit|\bcard\b/i, label: 'Card', icon: 'credit-card-outline', kind: 'card'},
];

const BANK_RULES: Rule[] = [
  {match: /k\s*_?plus/i, label: 'K PLUS', icon: 'bank-outline', kind: 'banking'},
  {match: /bangkok\s*_?bank|bualuang|\bbbl\b/i, label: 'Bangkok Bank', icon: 'bank-outline', kind: 'banking'},
  {match: /ttb/i, label: 'ttb touch', icon: 'bank-outline', kind: 'banking'},
  {match: /make/i, label: 'MAKE by KBank', icon: 'bank-outline', kind: 'banking'},
  {match: /krung\s*_?thai|\bktb\b|ktb_?next/i, label: 'Krungthai NEXT', icon: 'bank-outline', kind: 'banking'},
  {match: /scb/i, label: 'SCB EASY', icon: 'bank-outline', kind: 'banking'},
  {match: /krung\s*_?sri|\bkma\b|\bbay\b/i, label: 'krungsri', icon: 'bank-outline', kind: 'banking'},
  {match: /pao\s*_?tang/i, label: 'Paotang', icon: 'bank-outline', kind: 'banking'},
];

function matchRule(rules: Rule[], method: ReservepayMethod) {
  const text = `${method.name} ${method.displayName}`;
  const index = rules.findIndex((rule) => rule.match.test(text));
  return index >= 0 ? {rule: rules[index], index} : null;
}

function isBankingMethod(method: ReservepayMethod) {
  return /bank|banking/i.test(method.category) || Boolean(matchRule(BANK_RULES, method));
}

/** Splits the installation's methods into top-level options and the mobile-banking sub-list, in display order. */
export function groupPaymentMethods(methods: ReservepayMethod[]) {
  const primary: Array<PaymentOption & {order: number}> = [];
  const banking: Array<PaymentOption & {order: number}> = [];

  methods.forEach((method, position) => {
    // Bank rules first so "MAKE by KBank" etc. never fall into a wallet/card rule.
    const bank = isBankingMethod(method) ? matchRule(BANK_RULES, method) : null;
    if (bank || isBankingMethod(method)) {
      banking.push({
        name: method.name,
        label: bank?.rule.label || method.displayName || method.name,
        icon: 'bank-outline',
        kind: 'banking',
        order: bank ? bank.index : 100 + position,
      });
      return;
    }
    const known = matchRule(PRIMARY_RULES, method);
    primary.push({
      name: method.name,
      label: known?.rule.label || method.displayName || method.name,
      icon: known?.rule.icon || 'cash-multiple',
      kind: known?.rule.kind || 'other',
      comingSoon: false,
      order: known ? known.index : 100 + position,
    });
  });

  const byOrder = (a: {order: number}, b: {order: number}) => a.order - b.order;
  return {
    primary: primary.sort(byOrder).map(({order: _order, ...option}) => option),
    banking: banking.sort(byOrder).map(({order: _order, ...option}) => option),
  };
}
