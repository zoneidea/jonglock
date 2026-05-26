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
