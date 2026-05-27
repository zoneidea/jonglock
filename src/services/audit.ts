import {API_BASE_URL} from '../config/api';
import type {AuditUser} from '../types/user';

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

type AuditLoginResponse = {
  token: string;
  user: {
    id: number;
    organizationId: number;
    organizationCode: string;
    organizationName: string;
    role: 'audit';
    marketIds: number[];
    name: string;
  };
};

type AuditSummaryResponse = {
  bookingDate: string;
  totalJobs: number;
  pendingJobs: number;
  violationJobs: number;
  totalFineAmount: number;
};

export type AuditInspectionFilter = 'all' | 'pending' | 'violation' | 'fine';

export type AuditInspectionItem = {
  bookingItemId: number;
  bookingId: number;
  bookingPublicId: string;
  bookingDate: string;
  marketId: number;
  marketName: string;
  boothCode: string;
  boothName: string;
  customerName: string;
  auditStatus: 'pending' | 'pass' | 'warning' | 'failed';
  latestAuditResult: 'pass' | 'warning' | 'failed' | null;
  latestAuditNote: string;
  latestFineAmount: number;
  latestCheckedAt: string | null;
  checkedInAt: string | null;
  checkinStatus: 'checked_in' | 'waiting';
  paidAt: string | null;
};

export type AuditInspectionForm = {
  item: AuditInspectionItem;
  vat: {
    enabled: boolean;
    rate: number;
  };
  usedAccessories: AuditAccessoryLine[];
  availableAccessories: AuditAccessory[];
  latestCheck: {
    id: number;
    result: 'pass' | 'warning' | 'failed';
    note: string;
    fineAmount: number;
    accessoriesAmount: number;
    damageFineAmount: number;
    vatAmount: number;
    totalAmount: number;
    paymentStatus: string;
    checkedAt: string | null;
  } | null;
};

export type AuditAccessory = {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  grossPrice: number;
  stockQuantity: number;
};

export type AuditAccessoryLine = {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type AuditCheckPayload = {
  result: 'pass' | 'warning' | 'failed';
  note: string;
  fineAmount: number;
  accessories: Array<{accessoryId: number; quantity: number}>;
};

export type AuditCheckSaveResult = {
  id: number;
  result: 'pass' | 'warning' | 'failed';
  accessoriesAmount: number;
  fineAmount: number;
  vatAmount: number;
  totalAmount: number;
  paymentStatus: string;
};

type AuditInspectionsResponse = {
  bookingDate: string;
  filter: AuditInspectionFilter;
  items: AuditInspectionItem[];
};

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {message?: string};
    return payload.message || 'Request failed';
  } catch {
    return 'Request failed';
  }
}

function normalizeAuditInspectionForm(form: AuditInspectionForm): AuditInspectionForm {
  return {
    ...form,
    vat: {
      enabled: Boolean(form.vat?.enabled),
      rate: Number(form.vat?.rate || 0),
    },
    availableAccessories: (form.availableAccessories || []).map((accessory) => ({
      ...accessory,
      price: Number(accessory.price || 0),
      grossPrice: Number(accessory.grossPrice || accessory.price || 0),
      stockQuantity: Number(accessory.stockQuantity || 0),
    })),
    usedAccessories: (form.usedAccessories || []).map((accessory) => ({
      ...accessory,
      price: Number(accessory.price || 0),
      quantity: Number(accessory.quantity || 0),
      lineTotal: Number(accessory.lineTotal || 0),
    })),
    latestCheck: form.latestCheck ? {
      ...form.latestCheck,
      fineAmount: Number(form.latestCheck.fineAmount || 0),
      accessoriesAmount: Number(form.latestCheck.accessoriesAmount || 0),
      damageFineAmount: Number(form.latestCheck.damageFineAmount || 0),
      vatAmount: Number(form.latestCheck.vatAmount || 0),
      totalAmount: Number(form.latestCheck.totalAmount || 0),
    } : null,
  };
}

export async function loginAudit(payload: {
  organizationCode: string;
  username: string;
  password: string;
}): Promise<AuditUser> {
  const response = await fetch(`${API_BASE_URL}/mobile/audit/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const result = (await response.json()) as ApiResponse<AuditLoginResponse>;
  return {
    name: result.data.user.name,
    email: `${result.data.user.organizationCode.toLowerCase()}+${payload.username.toLowerCase()}@audit.local`,
    staffCode: payload.username,
    role: 'audit',
    token: result.data.token,
    organizationId: result.data.user.organizationId,
    organizationCode: result.data.user.organizationCode,
    organizationName: result.data.user.organizationName,
    marketIds: result.data.user.marketIds,
  };
}

export async function fetchAuditSummary({
  token,
  date,
}: {
  token: string;
  date: string;
}): Promise<AuditSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/mobile/audit/summary?date=${encodeURIComponent(date)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const result = (await response.json()) as ApiResponse<AuditSummaryResponse>;
  return result.data;
}

export async function fetchAuditInspections({
  token,
  date,
  filter,
}: {
  token: string;
  date: string;
  filter: AuditInspectionFilter;
}): Promise<AuditInspectionsResponse> {
  const params = new URLSearchParams({date, filter});
  const response = await fetch(`${API_BASE_URL}/mobile/audit/inspections?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const result = (await response.json()) as ApiResponse<AuditInspectionsResponse>;
  return {
    ...result.data,
    items: (result.data.items || []).map((item) => ({
      ...item,
      latestAuditNote: item.latestAuditNote || '',
      latestFineAmount: Number(item.latestFineAmount || 0),
    })),
  };
}

export async function fetchAuditInspectionForm({
  token,
  bookingItemId,
}: {
  token: string;
  bookingItemId: number;
}): Promise<AuditInspectionForm> {
  const response = await fetch(`${API_BASE_URL}/mobile/audit/inspections/${bookingItemId}/form`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const result = (await response.json()) as ApiResponse<AuditInspectionForm>;
  return normalizeAuditInspectionForm(result.data);
}

export async function saveAuditInspectionCheck({
  token,
  bookingItemId,
  payload,
}: {
  token: string;
  bookingItemId: number;
  payload: AuditCheckPayload;
}): Promise<AuditCheckSaveResult> {
  const response = await fetch(`${API_BASE_URL}/mobile/audit/inspections/${bookingItemId}/check`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const result = (await response.json()) as ApiResponse<AuditCheckSaveResult>;
  return {
    ...result.data,
    accessoriesAmount: Number(result.data.accessoriesAmount || 0),
    fineAmount: Number(result.data.fineAmount || 0),
    vatAmount: Number(result.data.vatAmount || 0),
    totalAmount: Number(result.data.totalAmount || 0),
  };
}
