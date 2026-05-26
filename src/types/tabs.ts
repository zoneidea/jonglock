export type TabKey = 'home' | 'booking' | 'checkin' | 'cart' | 'profile';

export type TabItem = {
  key: TabKey;
  label: string;
  icon: string;
};

export const tabs: TabItem[] = [
  {key: 'home', label: 'หน้าหลัก', icon: 'home-variant'},
  {key: 'booking', label: 'จอง', icon: 'storefront-outline'},
  {key: 'checkin', label: 'Check-in', icon: 'qrcode-scan'},
  {key: 'cart', label: 'ตะกร้า', icon: 'cart-outline'},
  {key: 'profile', label: 'โปรไฟล์', icon: 'card-account-details-outline'},
];
