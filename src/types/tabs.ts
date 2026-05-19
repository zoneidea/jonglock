export type TabKey = 'home' | 'booking' | 'cart' | 'profile';

export type TabItem = {
  key: TabKey;
  label: string;
  icon: string;
};

export const tabs: TabItem[] = [
  {key: 'home', label: 'หน้าหลัก', icon: 'H'},
  {key: 'booking', label: 'จอง', icon: 'B'},
  {key: 'cart', label: 'ตระกร้า', icon: 'C'},
  {key: 'profile', label: 'โปรไฟล์', icon: 'P'},
];
