import { apiClient } from "./client";

export interface PdfBrandingSettings {
  id: number;
  // Logo
  logo_enabled: boolean;
  logo_placement: "top-left" | "top-right" | "top-center" | "bottom-left" | "bottom-right" | "bottom-center";
  logo_size: "small" | "medium" | "large";
  logo_opacity: number;
  logo_margin: number;
  logo_url: string | null;
  // Watermark
  watermark_enabled: boolean;
  watermark_type: "text" | "image";
  watermark_text: string;
  watermark_image_url: string | null;
  watermark_placement: "center" | "diagonal-center" | "top-center" | "bottom-center" | "tile";
  watermark_opacity: number;
  watermark_rotation: number;
  watermark_size: "small" | "medium" | "large";
  watermark_color: string;
  // Policy & Defaults
  apply_by_default_on_upload: boolean;
  include_in_bulk_by_default: boolean;
  eligible_categories: string[];
  // Metadata
  version: number;
  updated_at: string;
}

export interface PdfBrandingSummary {
  total: number;
  branded: number;
  unbranded: number;
  failed: number;
  excluded: number;
  outdated: number;
  current_version: number;
  eligible_categories: string[];
}

export interface PdfBrandingSettingsResponse {
  settings: PdfBrandingSettings;
  summary: PdfBrandingSummary;
}

export interface PdfBrandingRecordItem {
  id: number;
  material_id: number;
  material_title: string;
  material_category: string;
  exam_name: string | null;
  subject_name: string | null;
  status: "unbranded" | "branded" | "processing" | "failed" | "excluded";
  decision: "default" | "apply" | "skip";
  applied_version: number;
  has_original: boolean;
  last_processed_at: string | null;
  error_message: string;
  page_count: number;
  file_size_bytes: number;
  file_url: string | null;
  is_outdated: boolean;
  created_at: string;
  updated_at: string;
}

export interface PdfDocumentsListResponse {
  count: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  results: PdfBrandingRecordItem[];
  summary: PdfBrandingSummary;
}

export interface BulkPreviewResponse {
  action: string;
  affected_count: number;
  excluded_count: number;
  current_version: number;
  sample_affected: {
    id: number;
    title: string;
    category: string;
    exam: string | null;
    current_status: string;
    applied_version: number;
  }[];
  sample_excluded: {
    id: number;
    title: string;
    category: string;
    reason: string;
  }[];
}

export interface BatchJobResultItem {
  id: number;
  title: string;
  status: string;
  version?: number;
  pages?: number;
  size?: number;
  error?: string;
  reason?: string;
}

export interface BatchJobItem {
  id: number;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  operation: string;
  total_files: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  applied_version: number;
  results: BatchJobResultItem[];
  error_summary: string;
  created_by_username: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export const adminPdfBrandingApi = {
  getSettings: async (): Promise<PdfBrandingSettingsResponse> => {
    return apiClient<PdfBrandingSettingsResponse>("/admin/pdf-branding/settings/");
  },

  updateSettings: async (payload: Partial<PdfBrandingSettings>): Promise<{ message: string; settings: PdfBrandingSettings }> => {
    return apiClient<{ message: string; settings: PdfBrandingSettings }>("/admin/pdf-branding/settings/", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  uploadLogo: async (file: File): Promise<{ message: string; settings: PdfBrandingSettings }> => {
    const form = new FormData();
    form.append("logo", file);
    return apiClient<{ message: string; settings: PdfBrandingSettings }>("/admin/pdf-branding/logo/", {
      method: "POST",
      body: form as any,
    });
  },

  deleteLogo: async (): Promise<{ message: string; settings: PdfBrandingSettings }> => {
    return apiClient<{ message: string; settings: PdfBrandingSettings }>("/admin/pdf-branding/logo/", {
      method: "DELETE",
    });
  },

  uploadWatermarkImage: async (file: File): Promise<{ message: string; settings: PdfBrandingSettings }> => {
    const form = new FormData();
    form.append("watermark_image", file);
    return apiClient<{ message: string; settings: PdfBrandingSettings }>("/admin/pdf-branding/watermark-image/", {
      method: "POST",
      body: form as any,
    });
  },

  deleteWatermarkImage: async (): Promise<{ message: string; settings: PdfBrandingSettings }> => {
    return apiClient<{ message: string; settings: PdfBrandingSettings }>("/admin/pdf-branding/watermark-image/", {
      method: "DELETE",
    });
  },

  getDocuments: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    category?: string;
    search?: string;
  }): Promise<PdfDocumentsListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.page_size) searchParams.set("page_size", String(params.page_size));
    if (params?.status && params.status !== "all") searchParams.set("status", params.status);
    if (params?.category && params.category !== "all") searchParams.set("category", params.category);
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return apiClient<PdfDocumentsListResponse>(`/admin/pdf-branding/documents/${query ? `?${query}` : ""}`);
  },

  getDocumentDetail: async (id: number): Promise<PdfBrandingRecordItem> => {
    return apiClient<PdfBrandingRecordItem>(`/admin/pdf-branding/documents/${id}/`);
  },

  applyDocumentBranding: async (id: number): Promise<{ message: string; record: PdfBrandingRecordItem }> => {
    return apiClient<{ message: string; record: PdfBrandingRecordItem }>(`/admin/pdf-branding/documents/${id}/`, {
      method: "POST",
      body: JSON.stringify({ action: "apply" }),
    });
  },

  reprocessDocument: async (id: number): Promise<{ message: string; record: PdfBrandingRecordItem }> => {
    return apiClient<{ message: string; record: PdfBrandingRecordItem }>(`/admin/pdf-branding/documents/${id}/`, {
      method: "POST",
      body: JSON.stringify({ action: "reprocess" }),
    });
  },

  restoreDocumentOriginal: async (id: number): Promise<{ message: string; record: PdfBrandingRecordItem }> => {
    return apiClient<{ message: string; record: PdfBrandingRecordItem }>(`/admin/pdf-branding/documents/${id}/`, {
      method: "POST",
      body: JSON.stringify({ action: "restore" }),
    });
  },

  updateDocumentDecision: async (id: number, decision: "default" | "apply" | "skip"): Promise<{ message: string; record: PdfBrandingRecordItem }> => {
    return apiClient<{ message: string; record: PdfBrandingRecordItem }>(`/admin/pdf-branding/documents/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    });
  },

  previewBulk: async (payload: { action: string; material_ids?: number[] }): Promise<BulkPreviewResponse> => {
    return apiClient<BulkPreviewResponse>("/admin/pdf-branding/bulk-preview/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  applyBulk: async (payload: { action: string; material_ids?: number[]; confirmed: boolean }): Promise<{ message: string; job: BatchJobItem; is_async: boolean }> => {
    return apiClient<{ message: string; job: BatchJobItem; is_async: boolean }>("/admin/pdf-branding/bulk-apply/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getJob: async (jobId: number): Promise<BatchJobItem> => {
    return apiClient<BatchJobItem>(`/admin/pdf-branding/jobs/${jobId}/`);
  },

  retryJob: async (jobId: number): Promise<{ message: string; job: BatchJobItem }> => {
    return apiClient<{ message: string; job: BatchJobItem }>(`/admin/pdf-branding/jobs/${jobId}/`, {
      method: "POST",
    });
  },

  getJobsList: async (): Promise<BatchJobItem[]> => {
    return apiClient<BatchJobItem[]>("/admin/pdf-branding/jobs/");
  },
};
