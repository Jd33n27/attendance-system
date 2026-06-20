// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://attendance-system-0gnm.onrender.com';

export interface User {
  id: string;
  name: string;
  department: string;
  qr_key: string;
  created_at: string;
}

export interface DailyQR {
  id: string;
  qr_code_string: string;
  date: string;
  image_url: string;
  active: boolean;
  created_at: string;
}

export interface AttendanceLog {
  id: string;
  user_id: string;
  clock_in: string | null;
  clock_out: string | null;
  date: string;
  created_at: string;
  duration_hours?: number;
}

export interface ScanResponse {
  status: string;
  message: string;
  clock_time: string;
  action: 'in' | 'out';
}

export interface AdminLogItem {
  id: string;
  user_id: string;
  user_name: string;
  department: string;
  clock_in: string | null;
  clock_out: string | null;
  date: string;
  created_at: string;
  duration_hours?: number;
}

export interface AdminUserItem extends User {
  active: boolean;
  total_attendance: number;
}

/**
 * Standard fetch wrapper that handles error responses and formats JSON output
 */
async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  
  // Build headers
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle empty or error bodies
  if (!response.ok) {
    let errorMsg = `HTTP error! Status: ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.message) {
        errorMsg = errorJson.message;
      }
    } catch {
      // Body is not JSON, default to status code message
    }
    throw new Error(errorMsg);
  }

  // Handle empty 204 or standard text response
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * API call functions
 */
export const client = {
  // Register a new user
  register: (name: string, department: string): Promise<User> => {
    return fetchAPI<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, department }),
    });
  },

  // Generate daily QR code (Admin only, requires bearer token)
  generateDailyQR: (adminToken: string): Promise<DailyQR> => {
    const headers: Record<string, string> = {};
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    return fetchAPI<DailyQR>('/api/qr/generate', {
      method: 'POST',
      headers,
    });
  },

  // Get active daily QR code details
  getActiveQR: (): Promise<DailyQR> => {
    return fetchAPI<DailyQR>('/api/qr/active', {
      method: 'GET',
    });
  },

  // Record clock-in or clock-out scans
  scanQR: (qrString: string, userId: string, action: 'in' | 'out'): Promise<ScanResponse> => {
    return fetchAPI<ScanResponse>('/api/attendance/scan', {
      method: 'POST',
      body: JSON.stringify({
        qr_string: qrString,
        user_id: userId,
        action,
      }),
    });
  },

  // Get user attendance history logs
  getLogs: (userId: string): Promise<{ user_id: string; logs: AttendanceLog[] }> => {
    return fetchAPI<{ user_id: string; logs: AttendanceLog[] }>(`/api/attendance/logs/${userId}`, {
      method: 'GET',
    });
  },

  // Get all attendance logs for admin dashboard
  getAdminLogs: (adminToken: string, filters: Record<string, string> = {}): Promise<AdminLogItem[]> => {
    const headers: Record<string, string> = {};
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    
    // Construct query parameters
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<AdminLogItem[]>(`/api/admin/logs${queryString}`, {
      method: 'GET',
      headers,
    });
  },

  // Get all registered users for admin dashboard
  getAdminUsers: (adminToken: string): Promise<AdminUserItem[]> => {
    const headers: Record<string, string> = {};
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    return fetchAPI<AdminUserItem[]>('/api/admin/users', {
      method: 'GET',
      headers,
    });
  },

  // Toggle user active status
  toggleUserActive: (adminToken: string, userId: string, active: boolean): Promise<{ status: string; message: string }> => {
    const headers: Record<string, string> = {};
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    return fetchAPI<{ status: string; message: string }>(`/api/admin/users/${userId}/toggle-active`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ active }),
    });
  },

  // Verify admin token
  verifyAdminToken: (adminToken: string): Promise<{ status: string; message: string }> => {
    const headers: Record<string, string> = {};
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    return fetchAPI<{ status: string; message: string }>('/api/admin/verify', {
      method: 'POST',
      headers,
    });
  },

  // Login user via their QR Key card
  login: (qrKey: string): Promise<User> => {
    return fetchAPI<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ qr_key: qrKey }),
    });
  },
};

