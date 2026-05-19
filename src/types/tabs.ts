export type TabKey = 'home' | 'booking' | 'cart' | 'profile';

export type TabItem = {
  key: TabKey;
  label: string;
  icon: string;
};

export const tabs: TabItem[] = [
  {key: 'home', label: 'หน้าหลัก', icon: '⌂'},
  {key: 'booking', label: 'จอง', icon: '◫'},
  {key: 'cart', label: 'ตระกร้า', icon: '▣'},
  {key: 'profile', label: 'โปรไฟล์', icon: '◉'},
];
