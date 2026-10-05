'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flag, Search, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  CheckCircle2, Eye, Clock, User, BookOpen, X, ChevronDown,
} from 'lucide-react';
import {
  adminReportsApi,
  AdminQuestionReport,
  AdminQuestionReportDetail,
  IssueType,
  ReportStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  ISSUE_TYPE_LABELS,
} from '@/lib/api/question-reports';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ALL_STATUSES: ReportStatus[] = [
  'PENDING', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'RESOLVED', 'REJECTED',
];

const ALL_ISSUE_TYPES: IssueType[] = [
  'WRONG_QUESTION', 'WRONG_ANSWER', 'WRONG_EXPLANATION', 'TYPO',
  'AMBIGUOUS', 'DUPLICATE', 'WRONG_SUBJECT_TOPIC', 'OTHER',
];

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminQuestionReportsPage() {
  const qc = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('');
  const [issueTypeFilter, setIssueTypeFilter] = useState<IssueType | ''>('');
  const [page, setPage] = useState(1);

  // Detail drawer
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const queryParams = {
    search: search || undefined,
    status: (statusFilter || undefined) as ReportStatus | undefined,
    issue_type: (issueTypeFilter || undefined) as IssueType | undefined,
    page,
    page_size: PAGE_SIZE,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-question-reports', queryParams],
    queryFn: () => adminReportsApi.list(queryParams),
  });

  const { data: summary } = useQuery({
    queryKey: ['admin-question-reports-summary'],
    queryFn: () => adminReportsApi.summary(),
    refetchInterval: 60_000,
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Page header */}
      <div className="border-b border-white/8 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-white text-lg font-bold">Question Reports</h1>
              <p className="text-white/40 text-xs">Student-flagged question issues</p>
            </div>
          </div>

          {/* Summary badges */}
          <div className="hidden md:flex items-center gap-2">
            {summary?.PENDING ? (
              <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-semibold">
                {summary.PENDING} Pending
              </span>
            ) : null}
            {summary?.UNDER_REVIEW ? (
              <span className="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold">
                {summary.UNDER_REVIEW} Under Review
              </span>
            ) : null}
            {summary?.NEEDS_INFORMATION ? (
              <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                {summary.NEEDS_INFORMATION} Needs Info
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-white/6 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by question text, student name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/80 placeholder-white/30 text-sm focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Status filter */}
        <CustomDropdown
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v as ReportStatus | ''); setPage(1); }}
          options={[{ value: '', label: 'All Statuses' }, ...ALL_STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] }))]}
          placeholder="All Statuses"
        />

        {/* Issue type filter */}
        <CustomDropdown
          value={issueTypeFilter}
          onChange={(v) => { setIssueTypeFilter(v as IssueType | ''); setPage(1); }}
          options={[{ value: '', label: 'All Issue Types' }, ...ALL_ISSUE_TYPES.map(t => ({ value: t, label: ISSUE_TYPE_LABELS[t] }))]}
          placeholder="All Issue Types"
        />
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">Failed to load reports.</p>
          </div>
        )}
        {!isLoading && !error && data && (
          <>
            <div className="text-white/30 text-xs mb-3">{data.count} report{data.count !== 1 ? 's' : ''} found</div>
            <div className="space-y-2">
              {data.results.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onSelect={() => setSelectedId(report.id)}
                />
              ))}
              {data.results.length === 0 && (
                <p className="text-center py-12 text-white/20 text-sm">No reports match the current filters.</p>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white/40 text-sm">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail drawer */}
      {selectedId !== null && (
        <ReportDetailDrawer
          reportId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ['admin-question-reports'] })}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Row
// ─────────────────────────────────────────────────────────────────────────────

function ReportRow({ report, onSelect }: { report: AdminQuestionReport; onSelect: () => void }) {
  const statusColor = STATUS_COLORS[report.status] ?? 'bg-white/5 text-white/50 border-white/10';
  return (
    <button
      onClick={onSelect}
      className="w-full text-left flex items-center gap-4 p-4 rounded-xl bg-white/3 border border-white/8 hover:bg-white/6 hover:border-white/12 transition-all group"
    >
      {/* Status pill */}
      <span className={cn('shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border', statusColor)}>
        {STATUS_LABELS[report.status]}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white/30 font-mono text-[10px]">{report.question_id_label}</span>
          <span className="text-white/20 text-[10px]">·</span>
          <span className="text-white/50 text-[10px]">{ISSUE_TYPE_LABELS[report.issue_type]}</span>
        </div>
        <p className="text-white/70 text-sm truncate">{report.question_text}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <User className="w-3 h-3 text-white/20" />
          <span className="text-white/30 text-[10px]">{report.student_name}</span>
          {report.reports_for_question && report.reports_for_question > 1 && (
            <span className="text-orange-400/60 text-[10px]">
              ({report.reports_for_question} total for this question)
            </span>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-1 text-white/25 text-[10px]">
          <Clock className="w-3 h-3" />
          <span>{new Date(report.created_at).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}</span>
        </div>
        {report.has_evidence && (
          <span className="text-blue-400/50 text-[10px]">Evidence</span>
        )}
      </div>

      <Eye className="w-4 h-4 text-white/20 group-hover:text-white/50 shrink-0 transition-colors" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────

function ReportDetailDrawer({
  reportId,
  onClose,
  onUpdated,
}: {
  reportId: number;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [adminNote, setAdminNote] = useState('');
  const [newStatus, setNewStatus] = useState<ReportStatus | ''>('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['admin-question-report-detail', reportId],
    queryFn: () => adminReportsApi.retrieve(reportId),
  });

  const mutation = useMutation({
    mutationFn: (payload: { status: ReportStatus; admin_note?: string }) =>
      adminReportsApi.patch(reportId, payload),
    onSuccess: () => {
      toast.success('Report updated.');
      onUpdated();
      onClose();
    },
    onError: () => toast.error('Failed to update report.'),
  });

  const handleSave = () => {
    if (!newStatus) { toast.error('Please select a new status.'); return; }
    mutation.mutate({ status: newStatus, admin_note: adminNote || undefined });
  };

  // Sync initial values when report loads.
  React.useEffect(() => {
    if (report) {
      setNewStatus(report.status);
      setAdminNote(report.admin_note || '');
    }
  }, [report]);

  const statusColor = report ? (STATUS_COLORS[report.status] ?? '') : '';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-xl z-50 bg-[#161b27] border-l border-white/10 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-400" /> Report #{reportId}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        ) : report ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">
              {/* Status + type */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', statusColor)}>
                  {STATUS_LABELS[report.status]}
                </span>
                <span className="text-white/50 text-xs">{ISSUE_TYPE_LABELS[report.issue_type]}</span>
              </div>

              {/* Student */}
              <Section title="Reported by">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-white/30" />
                  <span className="text-white/70 text-sm">{report.student_name}</span>
                  <span className="text-white/30 text-xs">({report.student_email})</span>
                </div>
              </Section>

              {/* Question */}
              {report.question_detail && (
                <Section title="Question">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-white/30 font-mono text-xs">{report.question_detail.question_id}</span>
                      {report.question_detail.subject_name && (
                        <span className="text-white/30 text-xs">· {report.question_detail.subject_name}</span>
                      )}
                    </div>
                    <p className="text-white/75 text-sm leading-relaxed">{report.question_detail.text}</p>
                    {['a', 'b', 'c', 'd'].map((opt) => {
                      const key = `option_${opt}` as keyof typeof report.question_detail;
                      const val = report.question_detail[key] as string | null;
                      if (!val) return null;
                      const isCorrect = report.question_detail.correct_option?.toLowerCase() === opt;
                      return (
                        <div key={opt} className={cn('text-xs px-2.5 py-1.5 rounded-lg border', isCorrect ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-white/3 border-white/8 text-white/50')}>
                          <span className="font-semibold mr-1">{opt.toUpperCase()}.</span> {val}
                          {isCorrect && <span className="ml-2 text-[10px] font-bold">✓ Marked Correct</span>}
                        </div>
                      );
                    })}
                    {report.question_detail.explanation && (
                      <div className="text-xs text-white/40 border-l-2 border-white/10 pl-3 mt-2">
                        <span className="font-semibold text-white/30">Explanation: </span>
                        {report.question_detail.explanation}
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Student description */}
              <Section title="Student's Description">
                <p className="text-white/65 text-sm leading-relaxed whitespace-pre-wrap">{report.description}</p>
              </Section>

              {report.suggested_correction && (
                <Section title="Suggested Correction">
                  <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap border-l-2 border-white/10 pl-3">{report.suggested_correction}</p>
                </Section>
              )}

              {report.evidence_url && (
                <Section title="Evidence">
                  <a
                    href={report.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs underline"
                  >
                    View evidence file ↗
                  </a>
                </Section>
              )}

              {report.examination_title && (
                <Section title="Context">
                  <p className="text-white/50 text-xs">Exam: {report.examination_title}</p>
                  {report.attempt_info && (
                    <p className="text-white/35 text-[10px] mt-0.5">
                      Attempt #{report.attempt_info.attempt_id} · {report.attempt_info.status}
                    </p>
                  )}
                </Section>
              )}

              {/* Admin action */}
              <Section title="Admin Action">
                <div className="space-y-3">
                  <CustomDropdown
                    value={newStatus}
                    onChange={(v) => setNewStatus(v as ReportStatus)}
                    options={[
                      { value: '', label: '— Select new status —' },
                      { value: 'UNDER_REVIEW', label: 'Under Review' },
                      { value: 'RESOLVED', label: 'Resolved (issue confirmed & fixed or noted)' },
                      { value: 'REJECTED', label: 'Rejected (question is correct)' },
                      { value: 'NEEDS_INFORMATION', label: 'Needs Information from student' },
                    ]}
                    placeholder="— Select new status —"
                  />
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Internal note (not shown to student)…"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/70 placeholder-white/25 text-sm resize-none focus:outline-none focus:border-white/20"
                  />
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-amber-300/70 text-[10px] leading-relaxed">
                      Resolving a report does <strong>not</strong> automatically update the question. Make any necessary corrections in the Question Bank separately.
                    </p>
                  </div>
                </div>
              </Section>

              {report.reviewed_by_name && (
                <p className="text-white/25 text-[10px]">
                  Last reviewed by {report.reviewed_by_name}
                  {report.reviewed_at ? ` on ${new Date(report.reviewed_at).toLocaleString()}` : ''}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-white/50 hover:text-white/70 text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending || !newStatus}
            className="px-5 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Save Decision
          </button>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold mb-2">{title}</p>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Dropdown — fixes invisible option text on dark-themed Windows browsers
// ─────────────────────────────────────────────────────────────────────────────

function CustomDropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label ?? placeholder;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm px-3 py-2 focus:outline-none hover:bg-white/8 hover:border-white/20 transition-colors min-w-[140px]"
      >
        <span className="flex-1 text-left truncate">{selectedLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-full bg-[#1c2133] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                opt.value === value
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
