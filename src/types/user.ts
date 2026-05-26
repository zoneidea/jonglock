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

export type AuditUser = {
  name: string;
  email: string;
  staffCode: string;
  role: 'audit';
  token?: string;
  organizationId?: number;
  organizationCode?: string;
  organizationName?: string;
  marketIds?: number[];
};
