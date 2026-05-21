export type MobileUser = {
  name: string;
  email: string;
  avatar?: string | null;
  provider: 'gmail' | 'local';
  phone?: string;
  phoneVerifiedAt?: string | null;
  address?: string;
  provinceId?: number | null;
  amphureId?: number | null;
  subdistrictId?: number | null;
  pdpaTermsAccepted?: boolean;
  pdpaMarketingAccepted?: boolean;
  notificationEnabled?: boolean;
  firebaseUid?: string;
};
