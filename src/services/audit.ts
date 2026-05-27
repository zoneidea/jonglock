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
  latestFineAmount: number;
  latestCheckedAt: string | null;
  checkedInAt: string | null;
  checkinStatus: 'checked_in' | 'waiting';
  paidAt: string | null;
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
      latestFineAmount: Number(item.latestFineAmount || 0),
    })),
  };
}
