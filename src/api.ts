// API client for MedLens backend

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Patients
  listPatients: (page = 1, limit = 20) =>
    request(`/patients?page=${page}&limit=${limit}`),

  getPatient: (id: string) =>
    request(`/patients/${id}`),

  createPatient: (data: Record<string, unknown>) =>
    request('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePatient: (id: string, data: Record<string, unknown>) =>
    request(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Reports
  listReports: (patientId: string, page = 1) =>
    request(`/patients/${patientId}/reports?page=${page}`),

  uploadReport: (patientId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${BASE}/patients/${patientId}/reports`, {
      method: 'POST',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    });
  },

  getReportStatus: (patientId: string, reportId: string) =>
    request(`/patients/${patientId}/reports/${reportId}/status`),

  // Lab results
  verifyLabResult: (patientId: string, resultId: string, data: Record<string, unknown>) =>
    request(`/patients/${patientId}/reports/results/${resultId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Summary
  generateSummary: (patientId: string) =>
    request(`/patients/${patientId}/summary`, { method: 'POST' }),

  // Audit log
  getAuditLog: (patientId: string) =>
    request(`/patients/${patientId}/audit`),
};
