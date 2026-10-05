import { apiClient } from './client';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export type IssueType =
  | 'WRONG_QUESTION'
  | 'WRONG_ANSWER'
  | 'WRONG_EXPLANATION'
  | 'TYPO'
  | 'AMBIGUOUS'
  | 'DUPLICATE'
  | 'WRONG_SUBJECT_TOPIC'
  | 'OTHER';

export type ReportStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'REJECTED'
  | 'NEEDS_INFORMATION';

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  WRONG_QUESTION:      'Wrong Question',
  WRONG_ANSWER:        'Wrong Answer',
  WRONG_EXPLANATION:   'Wrong Explanation',
  TYPO:                'Typo / Spelling Mistake',
  AMBIGUOUS:           'Confusing / Ambiguous',
  DUPLICATE:           'Duplicate Question',
  WRONG_SUBJECT_TOPIC: 'Wrong Subject / Topic',
  OTHER:               'Other',
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING:           'Pending',
  UNDER_REVIEW:      'Under Review',
  RESOLVED:          'Resolved',
  REJECTED:          'Rejected',
  NEEDS_INFORMATION: 'Needs Information',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
  PENDING:           'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  UNDER_REVIEW:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  RESOLVED:          'bg-green-500/20 text-green-300 border-green-500/30',
  REJECTED:          'bg-red-500/20 text-red-300 border-red-500/30',
  NEEDS_INFORMATION: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

// ─────────────────────────────────────────────────────────────────────────────
// Student-facing types
// ─────────────────────────────────────────────────────────────────────────────

export interface QuestionIssueReport {
  id: number;
  question: number;
  question_id_label: string;
  question_text: string;
  issue_type: IssueType;
  issue_type_display: string;
  description: string;
  suggested_correction: string;
  has_evidence: boolean;
  status: ReportStatus;
  status_display: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReportPayload {
  question: number;
  issue_type: IssueType;
  description: string;
  suggested_correction?: string;
  evidence_file?: File;
  examination_attempt_id?: number | null;
  practice_session_id?: number | null;
  question_attempt_id?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin-facing types
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminQuestionReport {
  id: number;
  question: number;
  question_id_label: string;
  question_text: string;
  issue_type: IssueType;
  issue_type_display: string;
  status: ReportStatus;
  status_display: string;
  student_name: string;
  student_email: string;
  has_evidence: boolean;
  reports_for_question: number | null;
  created_at: string;
}

export interface AdminQuestionReportDetail extends AdminQuestionReport {
  question_detail: {
    id: number;
    question_id: string;
    text: string;
    question_type: string;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
    correct_option: string | null;
    explanation: string;
    subject_name: string | null;
    topic_name: string | null;
  };
  description: string;
  suggested_correction: string;
  evidence_url: string | null;
  admin_note: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  examination_title: string | null;
  attempt_info: {
    attempt_id: number;
    started_at: string;
    status: string;
  } | null;
  updated_at: string;
}

export interface AdminReportPatchPayload {
  status: ReportStatus;
  admin_note?: string;
}

export interface AdminReportListResponse {
  count: number;
  page: number;
  page_size: number;
  results: AdminQuestionReport[];
}

export interface AdminReportSummary {
  PENDING?: number;
  UNDER_REVIEW?: number;
  RESOLVED?: number;
  REJECTED?: number;
  NEEDS_INFORMATION?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Student API
// ─────────────────────────────────────────────────────────────────────────────

export const studentReportsApi = {
  /** Submit a new issue report. Supports optional evidence file upload. */
  create: async (payload: CreateReportPayload): Promise<QuestionIssueReport> => {
    const { evidence_file, ...rest } = payload;

    if (evidence_file) {
      // Use FormData when there's a file.
      const form = new FormData();
      Object.entries(rest).forEach(([k, v]) => {
        if (v != null) form.append(k, String(v));
      });
      form.append('evidence_file', evidence_file);
      return apiClient<QuestionIssueReport>('/student/question-reports/', {
        method: 'POST',
        body: form,
      });
    }

    return apiClient<QuestionIssueReport>('/student/question-reports/', {
      method: 'POST',
      body: JSON.stringify(rest),
    });
  },

  list: (): Promise<QuestionIssueReport[]> =>
    apiClient<QuestionIssueReport[]>('/student/question-reports/'),

  retrieve: (id: number): Promise<QuestionIssueReport> =>
    apiClient<QuestionIssueReport>(`/student/question-reports/${id}/`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin API
// ─────────────────────────────────────────────────────────────────────────────

export const adminReportsApi = {
  list: (params?: {
    status?: ReportStatus;
    issue_type?: IssueType;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<AdminReportListResponse> => {
    const qs = new URLSearchParams();
    if (params?.status)     qs.set('status', params.status);
    if (params?.issue_type) qs.set('issue_type', params.issue_type);
    if (params?.search)     qs.set('search', params.search);
    if (params?.page)       qs.set('page', String(params.page));
    if (params?.page_size)  qs.set('page_size', String(params.page_size));
    const query = qs.toString();
    return apiClient<AdminReportListResponse>(`/admin-api/question-reports/${query ? `?${query}` : ''}`);
  },

  retrieve: (id: number): Promise<AdminQuestionReportDetail> =>
    apiClient<AdminQuestionReportDetail>(`/admin-api/question-reports/${id}/`),

  patch: (id: number, payload: AdminReportPatchPayload): Promise<AdminQuestionReportDetail> =>
    apiClient<AdminQuestionReportDetail>(`/admin-api/question-reports/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  summary: (): Promise<AdminReportSummary> =>
    apiClient<AdminReportSummary>('/admin-api/question-reports/summary/'),
};
