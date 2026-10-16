export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Folder {
  id: string;
  owner_id: string;
  parent_folder_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  owner_id: string;
  folder_id: string | null;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  size: number;
  content_hash: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
}

export interface FileDownloadInfo {
  file_id: string;
  filename: string;
  mime_type: string;
  size: number;
  download_url: string | null;
  direct_stream_available: boolean;
}

export interface ShareRecord {
  id: string;
  file_id: string;
  owner_id: string;
  shared_with_user_id: string;
  permission: 'read' | 'write';
  created_at: string;
  revoked_at: string | null;
}

export interface SharedWithMeItem {
  share_id: string;
  permission: 'read' | 'write';
  created_at: string;
  file: FileRecord;
  owner: User;
}

export interface StorageCategoryBreakdown {
  images: number;
  documents: number;
  media: number;
  archives: number;
  code: number;
  other: number;
}

export interface StorageStats {
  total_files: number;
  total_folders: number;
  total_bytes_used: number;
  categories: StorageCategoryBreakdown;
}

export interface ActivityLogItem {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ActivityListResponse {
  items: ActivityLogItem[];
  total: number;
  limit: number;
  offset: number;
}


export interface StorageQuotaStats {
  total_quota_bytes: number;
  total_bytes_used: number;
  remaining_bytes: number;
  percent_used: number;
}

export interface CategoryDetail {
  bytes: number;
  count: number;
  percent_of_used: number;
}

export interface AccessAgingCategory {
  key: string;
  label: string;
  description: string;
  bytes: number;
  count: number;
  percent_of_used: number;
}

export interface DashboardSummary {
  quota: StorageQuotaStats;
  total_files: number;
  total_folders: number;
  total_shares_given: number;
  total_shares_received: number;
  categories: Record<string, CategoryDetail>;
  access_aging: AccessAgingCategory[];
  recent_activities: ActivityLogItem[];
}


export interface ServicesStatus {
  backend: string;
  database: string;
  s3: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  services: ServicesStatus;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        if (typeof errorJson.detail === 'string') {
          errorDetail = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          errorDetail = errorJson.detail.map((e: { msg?: string }) => e.msg || '').join(', ');
        }
      }
    } catch {
      // Non-json response error
    }
    throw new Error(errorDetail);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

// ---------------- AUTH API ----------------
export async function registerUser(email: string, password: string, fullName: string): Promise<User> {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  return handleResponse<User>(response);
}

export async function loginUser(email: string, password: string): Promise<{ access_token: string; token_type: string; user: User }> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ access_token: string; token_type: string; user: User }>(response);
}

export async function getMe(): Promise<User> {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<User>(response);
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {
    // Ignore network error on logout
  }
}

// ---------------- HEALTH API ----------------
export async function getHealthStatus(): Promise<HealthResponse> {
  const response = await fetch(`${BASE_URL}/health`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  return handleResponse<HealthResponse>(response);
}

// ---------------- FOLDERS API ----------------
export async function listFolders(parentFolderId?: string | null, allFolders: boolean = false): Promise<Folder[]> {
  const params = new URLSearchParams();
  if (parentFolderId) params.append('parent_folder_id', parentFolderId);
  if (allFolders) params.append('all_folders', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${BASE_URL}/folders/${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<Folder[]>(response);
}

export async function createFolder(name: string, parentFolderId?: string | null): Promise<Folder> {
  const response = await fetch(`${BASE_URL}/folders/`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent_folder_id: parentFolderId || null }),
  });
  return handleResponse<Folder>(response);
}

export async function renameFolder(folderId: string, name: string): Promise<Folder> {
  const response = await fetch(`${BASE_URL}/folders/${folderId}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse<Folder>(response);
}

export async function deleteFolder(folderId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/folders/${folderId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<void>(response);
}

// ---------------- FILES API ----------------
export async function listFiles(folderId?: string | null, searchQuery?: string): Promise<FileRecord[]> {
  const params = new URLSearchParams();
  if (folderId) params.append('folder_id', folderId);
  if (searchQuery) params.append('q', searchQuery);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${BASE_URL}/files/${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<FileRecord[]>(response);
}

export async function uploadFile(file: File, folderId?: string | null): Promise<FileRecord> {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) {
    formData.append('folder_id', folderId);
  }
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}/files/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return handleResponse<FileRecord>(response);
}

export async function getFileMetadata(fileId: string): Promise<FileRecord> {
  const response = await fetch(`${BASE_URL}/files/${fileId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<FileRecord>(response);
}

export async function getFileDownloadLink(fileId: string): Promise<FileDownloadInfo> {
  const response = await fetch(`${BASE_URL}/files/${fileId}/download`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<FileDownloadInfo>(response);
}

export async function downloadFileStream(fileId: string, filename: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/files/${fileId}/stream`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to download file: HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function renameFile(fileId: string, newFilename: string): Promise<FileRecord> {
  const response = await fetch(`${BASE_URL}/files/${fileId}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ original_filename: newFilename }),
  });
  return handleResponse<FileRecord>(response);
}

export async function moveFile(fileId: string, newFolderId: string | null): Promise<FileRecord> {
  const response = await fetch(`${BASE_URL}/files/${fileId}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder_id: newFolderId }),
  });
  return handleResponse<FileRecord>(response);
}

export async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<void>(response);
}

export async function getStorageStats(): Promise<StorageStats> {
  const response = await fetch(`${BASE_URL}/files/stats/summary`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<StorageStats>(response);
}

// ---------------- SHARING API ----------------
export async function shareFile(fileId: string, recipientEmail: string, permission: 'read' | 'write' = 'read'): Promise<ShareRecord> {
  const response = await fetch(`${BASE_URL}/shares/`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_id: fileId,
      recipient_email: recipientEmail,
      permission,
    }),
  });
  return handleResponse<ShareRecord>(response);
}

export async function listSharedWithMe(): Promise<SharedWithMeItem[]> {
  const response = await fetch(`${BASE_URL}/shares/shared-with-me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<SharedWithMeItem[]>(response);
}

export async function listFileShares(fileId: string): Promise<ShareRecord[]> {
  const response = await fetch(`${BASE_URL}/shares/file/${fileId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<ShareRecord[]>(response);
}

export async function revokeShare(shareId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/shares/${shareId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<void>(response);
}

// ---------------- DASHBOARD & ACTIVITY API ----------------
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${BASE_URL}/dashboard/summary`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<DashboardSummary>(response);
}

export async function getActivityLogs(
  limit: number = 50,
  offset: number = 0,
  action?: string,
  resourceType?: string,
): Promise<ActivityListResponse> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  if (action) params.append('action', action);
  if (resourceType) params.append('resource_type', resourceType);

  const response = await fetch(`${BASE_URL}/activity/?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<ActivityListResponse>(response);
}

