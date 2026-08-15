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

export async function getHealthStatus(): Promise<HealthResponse> {
  const response = await fetch(`${BASE_URL}/health`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status}`);
  }

  return response.json();
}
