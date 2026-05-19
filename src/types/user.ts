export type MobileUser = {
  name: string;
  email: string;
  avatar?: string | null;
  provider: 'gmail' | 'local';
};
