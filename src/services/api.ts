import { BloodCenter, BloodRequest, Donor, InventoryItem, User, DonationRecord, BloodRequestResponse, AppNotification } from '../types';
import { localizeError } from '../utils/errors';

// Backend URL. Set VITE_API_BASE_URL (for example https://lifora-api.onrender.com/api) in production.
// While developing with `npm run dev`, an empty value uses the Vite proxy to the local server (python -m backend.run).
const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
export const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, '') : '/api';

export interface ApiError extends Error {
  status?: number;
  needsVerification?: boolean;
  email?: string;
}

/** What a shared request link shows (no patient name, phone or reason). */
export interface SharedRequest {
  id: string;
  bloodGroup: string;
  unitsNeeded: number;
  hospitalName: string;
  city: string;
  urgency: 'Normal' | 'Urgent' | 'Critical';
  deadline: string;
  status: string;
  displayStatus: string;
  isOpen: boolean;
  createdAt: string | null;
}

export interface VerifiedDonor {
  id: string;
  name: string;
  bloodGroup: string;
  city: string;
  availability: string;
  totalDonations: number;
  verified: true;
}

export interface AdminUser {
  id: string; name: string; email: string; phone: string | null; role: string; bloodGroup: string | null; city: string | null;
  emailVerified: boolean; profileCompleted: boolean; totalDonations: number; createdAt: string | null;
}
export interface AdminRequest extends BloodRequest {
  requester: { id: string; name: string; email: string; phone: string | null } | null;
  responses: Array<{ id: string; donorName: string | null; donorBloodGroup: string | null; status: string; createdAt: string | null; donorClaimedAt: string | null }>;
}
export interface AdminDonation extends DonationRecord { requestId?: string | null; createdAt?: string | null }
export interface AdminActivity {
  id: string; createdAt: string | null; event: string; actorId: string | null; actorName: string | null; actorEmail: string | null;
  subjectType: string | null; subjectId: string | null; detail: string | null;
}
export interface ContactMessageRow { id: string; name: string; email: string; message: string; handled: boolean; createdAt: string | null }

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('lifora_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  let response: globalThis.Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    throw new Error(localizeError('Cannot reach the LIFORA server. Please check your connection and try again.'));
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(localizeError('The LIFORA server returned an unexpected response. Please try again shortly.'));
  }

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.statusText}`;
    let needsVerificationFlag = false;
    let errorEmail: string | undefined;
    try {
      const errData = await response.json();
      needsVerificationFlag = !!errData?.needsVerification;
      errorEmail = errData?.email;
      if (errData?.detail) {
        if (typeof errData.detail === 'string') {
          errorMsg = errData.detail;
        } else if (Array.isArray(errData.detail)) {
          errorMsg = errData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        }
      } else if (errData?.error) {
        errorMsg = errData.error;
      }
    } catch {
      // ignore json parse error
    }

    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
      localStorage.removeItem('lifora_token');
    }

    const err = new Error(localizeError(errorMsg)) as ApiError;
    err.status = response.status;
    err.needsVerification = needsVerificationFlag;
    err.email = errorEmail;
    throw err;
  }

  return response.json();
}

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') query.append(k, String(v));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

/** True when the server answers. The site shows a clear warning when it does not. */
export async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { headers: { Accept: 'application/json' } });
    if (!(res.headers.get('content-type') || '').includes('application/json')) return false;
    return res.ok;
  } catch {
    return false;
  }
}

export const api = {
  auth: {
    login: async (credentials: { email: string; password?: string; role?: string }) => {
      const data = await request<{ message: string; user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (data.token) {
        localStorage.setItem('lifora_token', data.token);
      }
      return data;
    },

    /** Step 1: name, email, password. A 6-digit code is emailed; no session is created yet. */
    register: async (data: { name: string; email: string; password: string }) => {
      return request<{ message: string; needsVerification: boolean; email: string; emailSent: boolean; expiresInMinutes: number; devCode?: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /** Step 2: confirm the emailed code. Returns the session. */
    verifyEmail: async (email: string, code: string) => {
      const data = await request<{ message: string; user: User; token: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      if (data.token) localStorage.setItem('lifora_token', data.token);
      return data;
    },

    resendCode: async (email: string) => {
      return request<{ message: string; devCode?: string }>('/auth/resend-code', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    /** Step 3: choose Donor or Requester and fill the profile. */
    onboarding: async (profile: { role: 'donor' | 'requester'; bloodGroup: string; age: number; city: string; location: string; radiusKm: number; phone: string }) => {
      return request<{ message: string; user: User }>('/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(profile),
      });
    },

    updateProfile: async (profile: Partial<{ bloodGroup: string; age: number; city: string; location: string; radiusKm: number; phone: string }>) => {
      return request<{ message: string; user: User }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
    },

    /** Also keeps the person logged in: the server sends a fresh token when the current one is more than a day old. */
    getMe: async () => {
      const data = await request<{ user: User | null; token?: string }>('/auth/me');
      if (data.token) localStorage.setItem('lifora_token', data.token);
      return data;
    },

    forgotPassword: async (email: string) => {
      return request<{ message: string; emailConfigured: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    resetPassword: async (token: string, newPassword: string) => {
      return request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
    },

    /** One account, two dashboards: keeps the saved profile and just changes the active role. */
    switchRole: async (role: 'donor' | 'requester') => {
      return request<{ message: string; user: User }>('/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
    },

    /** Permanently removes the signed-in user's personal data. */
    deleteAccount: async () => {
      const data = await request<{ message: string }>('/auth/me', { method: 'DELETE' });
      localStorage.removeItem('lifora_token');
      return data;
    },

    logout: async () => {
      localStorage.removeItem('lifora_token');
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch {
        // ignore logout errors
      }
    },
  },

  donors: {
    /** One page of donors. `total` is every matching donor, so the page numbers know how many pages exist. */
    getAll: async (params?: { blood_group?: string; city?: string; availability?: string; q?: string; verified?: boolean; max_distance?: number; sort?: 'distance' | 'match' | 'donations'; limit?: number; offset?: number }) => {
      return request<{ donors: Donor[]; count: number; total?: number }>(`/donors${qs({ ...params })}`);
    },

    /** Public: verified donors for the home page (first name + initial only). */
    getVerified: async (limit = 12) => {
      return request<{ donors: VerifiedDonor[]; count: number; total: number }>(`/donors/verified${qs({ limit })}`);
    },

    getById: async (id: string) => {
      return request<{ donor: Donor }>(`/donors/${id}`);
    },

    create: async (donorData: Partial<Donor>) => {
      return request<{ message: string; donor: Donor }>('/donors', {
        method: 'POST',
        body: JSON.stringify(donorData),
      });
    },

    updateAvailability: async (id: string, availability: string) => {
      return request<{ message: string; donor: Donor }>(`/donors/${id}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ availability }),
      });
    },

    /** Real phone/email (signed-in users only; rate-limited on the server). */
    contactInfo: async (id: string) => {
      return request<{ donorId: string; contactName: string; phone: string; email: string }>(`/donors/${id}/contact-info`);
    },

    /** Sends an in-app message to the donor. No SMS or push notification is sent. */
    contact: async (id: string, payload?: { message?: string; urgency?: string }) => {
      return request<{ message: string; delivered?: boolean; donorId: string; contactName: string }>(`/donors/${id}/contact`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
    },

    /** Administrator only: needs at least 5 confirmed donations to verify. */
    verify: async (id: string, verified: boolean) => {
      return request<{ message: string; donor: Donor }>(`/donors/${id}/verify?verified=${verified ? 'true' : 'false'}`, { method: 'PUT' });
    },
  },

  requests: {
    getAll: async (params?: { blood_group?: string; urgency?: string; status?: string; city?: string }) => {
      return request<{ requests: BloodRequest[]; count: number }>(`/requests${qs({ ...params })}`);
    },

    getById: async (id: string) => {
      return request<{ request: BloodRequest }>(`/requests/${id}`);
    },

    /** What a shared link shows. Works without logging in. */
    getShared: async (id: string) => {
      return request<{ request: SharedRequest }>(`/requests/shared/${encodeURIComponent(id)}`);
    },

    create: async (requestData: Partial<BloodRequest>) => {
      return request<{ message: string; request: BloodRequest }>('/requests', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });
    },

    respond: async (id: string, payload?: { donorId?: string; message?: string }) => {
      return request<{ message: string; response: BloodRequestResponse; request: BloodRequest }>(`/requests/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
    },

    book: async (id: string, responseId: string) => {
      return request<{ message: string; response: BloodRequestResponse; request: BloodRequest }>(`/requests/${id}/book`, {
        method: 'POST',
        body: JSON.stringify({ responseId }),
      });
    },

    /** The donor presses "I donated". The requester confirms, or it counts automatically after 24 hours. */
    markDonated: async (id: string) => {
      return request<{ message: string; response: BloodRequestResponse; request: BloodRequest }>(`/requests/${id}/donated`, { method: 'POST' });
    },

    confirmDonation: async (id: string, payload?: { donorId?: string; responseId?: string; units?: number }) => {
      return request<{ message: string; donor: Donor; request: BloodRequest; donation: DonationRecord }>(`/requests/${id}/confirm-donation`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
    },

    getResponses: async (id: string) => {
      return request<{ requestId: string; responses: BloodRequestResponse[]; count: number }>(`/requests/${id}/responses`);
    },

    getMyResponse: async (id: string) => {
      // The server only answers for the signed-in user's own donor profile.
      return request<{ hasResponded: boolean; response: BloodRequestResponse | null }>(`/requests/${id}/my-response`);
    },

    updateStatus: async (id: string, status: string) => {
      return request<{ message: string; request: BloodRequest }>(`/requests/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
  },

  notifications: {
    getAll: async (params?: { unread?: boolean }) => {
      return request<{ notifications: AppNotification[]; unreadCount: number; count: number }>(
        `/notifications${qs({ unread: params?.unread ? 'true' : undefined })}`
      );
    },

    getUnreadCount: async () => {
      return request<{ userId: string; unreadCount: number }>('/notifications/unread-count');
    },

    markAsRead: async (id: string) => {
      return request<{ message: string; notification: AppNotification; unreadCount: number }>(
        `/notifications/${id}/read`,
        { method: 'PUT' }
      );
    },

    markAllAsRead: async () => {
      return request<{ message: string; unreadCount: number }>(
        '/notifications/read-all',
        { method: 'PUT' }
      );
    },

    delete: async (id: string) => {
      return request<{ message: string }>(`/notifications/${id}`, { method: 'DELETE' });
    },
  },

  contact: {
    send: async (payload: { name: string; email: string; message: string }) => {
      return request<{ message: string }>('/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    messages: async () => {
      return request<{ messages: ContactMessageRow[]; count: number }>('/contact/messages');
    },
    markHandled: async (id: string) => {
      return request<{ message: string }>(`/contact/messages/${id}/handled`, { method: 'PUT' });
    },
  },

  centers: {
    getAll: async (params?: { city?: string; emergency?: boolean }) => {
      return request<{ centers: BloodCenter[]; count: number }>(
        `/centers${qs({ city: params?.city, emergency: params?.emergency ? 'true' : undefined })}`
      );
    },

    getById: async (id: string) => {
      return request<{ center: BloodCenter }>(`/centers/${id}`);
    },
  },

  inventory: {
    getAll: async () => {
      return request<{ inventory: InventoryItem[] }>('/inventory');
    },

    update: async (bloodGroup: string, data: Partial<InventoryItem>) => {
      return request<{ message: string; item: InventoryItem }>(`/inventory/${encodeURIComponent(bloodGroup)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    adjust: async (bloodGroup: string, delta: number) => {
      return request<{ message: string; item: InventoryItem }>(`/inventory/${encodeURIComponent(bloodGroup)}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ delta }),
      });
    },

    getDonations: async () => {
      return request<{ donations: DonationRecord[] }>('/inventory/donations');
    },
  },

  admin: {
    users: async (params?: { q?: string; role?: string; limit?: number; offset?: number }) =>
      request<{ users: AdminUser[]; count: number; total: number }>(`/admin/users${qs({ ...params })}`),
    requests: async (params?: { status?: string; limit?: number; offset?: number }) =>
      request<{ requests: AdminRequest[]; count: number; total: number }>(`/admin/requests${qs({ ...params })}`),
    donations: async (params?: { limit?: number; offset?: number }) =>
      request<{ donations: AdminDonation[]; count: number; total: number }>(`/admin/donations${qs({ ...params })}`),
    activity: async (params?: { event?: string; limit?: number; offset?: number }) =>
      request<{ activity: AdminActivity[]; count: number; total: number }>(`/admin/activity${qs({ ...params })}`),
    cancelDonation: async (id: string) =>
      request<{ message: string }>(`/admin/donations/${id}/cancel`, { method: 'POST' }),
    sendReset: async (id: string) =>
      request<{ message: string }>(`/admin/users/${id}/send-reset`, { method: 'POST' }),
  },

  stats: {
    getStats: async () => {
      return request<{
        stats: {
          totalDonors: number;
          verifiedDonors?: number;
          registeredAccounts?: number;
          requesterAccounts?: number;
          unfinishedAccounts?: number;
          awaitingCodeAccounts?: number;
          activeDonors: number;
          activeRequests: number;
          fulfilledRequests: number;
          totalCenters: number;
          totalAvailableUnits: number;
          livesSaved: number;
        };
      }>('/stats');
    },
  },
};
