import {API_BASE_URL} from '../config/api';

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

type PublicUserIdentity = {
  email: string;
  name?: string;
};

export type PublicProfile = {
  id: number;
  publicId: string;
  name: string;
  email: string;
  phone: string;
  phoneVerifiedAt?: string | null;
  firebaseUid?: string;
  avatarUrl: string;
  storeName: string;
  storeLogoUrl: string;
  storeProductDescription: string;
  storeFacebookUrl: string;
  storeLineId: string;
  storeWebsiteUrl: string;
  storeContactPhone: string;
  storeGalleryImages: string[];
  address: string;
  provinceId?: number | null;
  amphureId?: number | null;
  subdistrictId?: number | null;
  pdpaTermsAccepted: boolean;
  pdpaTermsAcceptedAt?: string | null;
  pdpaMarketingAccepted: boolean;
  pdpaMarketingAcceptedAt?: string | null;
  notificationEnabled: boolean;
};

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {message?: string};
    return payload.message || 'Request failed';
  } catch {
    return 'Request failed';
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

function normalizeProfile(profile: PublicProfile): PublicProfile {
  return {
    ...profile,
    phoneVerifiedAt: profile.phoneVerifiedAt || null,
    provinceId: profile.provinceId ? Number(profile.provinceId) : null,
    amphureId: profile.amphureId ? Number(profile.amphureId) : null,
    subdistrictId: profile.subdistrictId ? Number(profile.subdistrictId) : null,
    storeName: profile.storeName || '',
    storeLogoUrl: profile.storeLogoUrl || '',
    storeProductDescription: profile.storeProductDescription || '',
    storeFacebookUrl: profile.storeFacebookUrl || '',
    storeLineId: profile.storeLineId || '',
    storeWebsiteUrl: profile.storeWebsiteUrl || '',
    storeContactPhone: profile.storeContactPhone || '',
    storeGalleryImages: Array.isArray(profile.storeGalleryImages) ? profile.storeGalleryImages.filter(Boolean) : [],
    pdpaTermsAccepted: Boolean(profile.pdpaTermsAccepted),
    pdpaMarketingAccepted: Boolean(profile.pdpaMarketingAccepted),
    notificationEnabled: Boolean(profile.notificationEnabled),
  };
}

export async function getPublicProfile(user: PublicUserIdentity) {
  const profile = await postJson<PublicProfile>('/public/profile/me', {user});
  return normalizeProfile(profile);
}

export async function updatePublicProfileAddress(
  user: PublicUserIdentity,
  payload: {
    address: string;
    provinceId?: number | null;
    amphureId?: number | null;
    subdistrictId?: number | null;
    pdpaTermsAccepted: boolean;
    pdpaMarketingAccepted: boolean;
    notificationEnabled: boolean;
  },
) {
  const profile = await postJson<PublicProfile>('/public/profile/address', {
    user,
    ...payload,
  });
  return normalizeProfile(profile);
}

export async function changePublicProfilePassword(
  user: PublicUserIdentity,
  payload: {
    currentPassword?: string;
    newPassword: string;
  },
) {
  return postJson<{updated: boolean}>('/public/profile/password', {
    user,
    ...payload,
  });
}

export async function verifyPublicProfilePhone(user: PublicUserIdentity, firebaseIdToken: string) {
  const profile = await postJson<PublicProfile>('/public/profile/phone/verify', {
    user,
    firebaseIdToken,
  });
  return normalizeProfile(profile);
}

export async function uploadPublicProfileAvatar(
  user: PublicUserIdentity,
  file: {uri: string; name?: string; type?: string},
) {
  const formData = new FormData();
  formData.append('email', user.email);
  if (user.name) {
    formData.append('name', user.name);
  }
  formData.append('image', {
    uri: file.uri,
    name: file.name || 'profile.jpg',
    type: file.type || 'image/jpeg',
  } as never);

  const response = await fetch(`${API_BASE_URL}/public/profile/avatar`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as ApiResponse<PublicProfile>;
  return normalizeProfile(payload.data);
}

export async function updatePublicStoreProfile(
  user: PublicUserIdentity,
  payload: {
    storeName?: string;
    storeProductDescription?: string;
    storeFacebookUrl?: string;
    storeLineId?: string;
    storeWebsiteUrl?: string;
    storeContactPhone?: string;
    logoFile?: {uri: string; name?: string; type?: string} | null;
    galleryFiles?: Array<{uri: string; name?: string; type?: string}>;
  },
) {
  const formData = new FormData();
  formData.append('email', user.email);
  if (user.name) {
    formData.append('name', user.name);
  }
  formData.append('storeName', payload.storeName || '');
  formData.append('storeProductDescription', payload.storeProductDescription || '');
  formData.append('storeFacebookUrl', payload.storeFacebookUrl || '');
  formData.append('storeLineId', payload.storeLineId || '');
  formData.append('storeWebsiteUrl', payload.storeWebsiteUrl || '');
  formData.append('storeContactPhone', payload.storeContactPhone || '');

  if (payload.logoFile?.uri) {
    formData.append('logo', {
      uri: payload.logoFile.uri,
      name: payload.logoFile.name || 'store-logo.jpg',
      type: payload.logoFile.type || 'image/jpeg',
    } as never);
  }

  (payload.galleryFiles || []).forEach((file, index) => {
    if (!file?.uri) return;
    formData.append('gallery', {
      uri: file.uri,
      name: file.name || `store-gallery-${index + 1}.jpg`,
      type: file.type || 'image/jpeg',
    } as never);
  });

  const response = await fetch(`${API_BASE_URL}/public/profile/store`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const apiResponse = (await response.json()) as ApiResponse<PublicProfile>;
  return normalizeProfile(apiResponse.data);
}
