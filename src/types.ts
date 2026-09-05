// Shared TypeScript types for frontend

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: string;
  symptoms: string | null;
  conditions: string | null;
  allergies: string | null;
  medications: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  report_count?: number;
  result_count?: number;
}

export interface Report {
  id: string;
  patient_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_path: string;
  upload_date: string;
  extracted_at: string | null;
  status: 'pending' | 'extracted' | 'failed';
  error_message: string | null;
  result_count?: number;
}

export interface LabResult {
  id: string;
  report_id: string;
  patient_id: string;
  test_name: string;
  value: string | null;
  unit: string | null;
  reference_range_low: number | null;
  reference_range_high: number | null;
  reference_range_text: string | null;
  report_date: string | null;
  flag_text: string | null;
  confidence: number | null;
  range_label: 'low' | 'normal' | 'high' | 'unknown' | null;
  source: 'ai_extracted' | 'user_verified';
  verified_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  patient_id: string;
  action: string;
  details: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
