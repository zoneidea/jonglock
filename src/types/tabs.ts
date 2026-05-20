export type TabKey = 'home' | 'booking' | 'cart' | 'profile';

export type TabItem = {
  key: TabKey;
  label: string;
  icon: string;
};

export const tabs: TabItem[] = [
  {key: 'home', label: 'หน้าหลัก', icon: 'home-variant'},
  {key: 'booking', label: 'จอง', icon: 'storefront-outline'},
  {key: 'cart', label: 'ตระกร้า', icon: 'cart-outline'},
  {key: 'profile', label: 'โปรไฟล์', icon: 'card-account-details-outline'},
];
