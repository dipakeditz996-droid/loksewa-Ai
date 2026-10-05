'use client';

import { useQuery } from '@tanstack/react-query';
import { Flag, Loader2, AlertTriangle, CheckCircle2, Clock, XCircle, Info } from 'lucide-react';
import { studentReportsApi, STATUS_LABELS, STATUS_COLORS, ISSUE_TYPE_LABELS, QuestionIssueReport } from '@/lib/api/question-reports';
import { cn } from '@/lib/utils';

export default function StudentReportsPage() {
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['student-question-reports'],
    queryFn: () => studentReportsApi.list(),
  });

  return (
    <div className="min-h-screen bg-[#0f1117] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">My Question Reports</h1>
              <p className="text-white/40 text-sm">Track issues you have reported</p>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">Failed to load reports. Please refresh.</p>
          </div>
        )}

        {!isLoading && !error && reports?.length === 0 && (
          <div className="text-center py-20 text-white/30">
            <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">You haven't reported any questions yet.</p>
            <p className="text-xs mt-1 text-white/20">Use the "Report a problem" button on any question during an exam or practice session.</p>
          </div>
        )}

        {!isLoading && !error && reports && reports.length > 0 && (
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: QuestionIssueReport }) {
  const statusColor = STATUS_COLORS[report.status] ?? 'bg-white/5 text-white/50 border-white/10';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/30 text-[10px] font-mono">{report.question_id_label}</span>
            <span className="text-white/20 text-xs">·</span>
            <span className="text-white/50 text-xs">{ISSUE_TYPE_LABELS[report.issue_type]}</span>
          </div>
          <p className="text-white/70 text-sm line-clamp-2">{report.question_text}</p>
        </div>
        <span className={cn(
          'shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border',
          statusColor
        )}>
          {STATUS_LABELS[report.status]}
        </span>
      </div>

      {/* Description */}
      <p className="text-white/50 text-xs leading-relaxed border-l-2 border-white/10 pl-3">
        {report.description}
      </p>

      {/* Status hint */}
      {report.status === 'NEEDS_INFORMATION' && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <p className="text-purple-300 text-xs">Our admin team needs more information — check your notifications.</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 text-white/25 text-[10px]">
        <Clock className="w-3 h-3" />
        <span>Submitted {new Date(report.created_at).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        {report.has_evidence && (
          <>
            <span>·</span>
            <span>Evidence attached</span>
          </>
        )}
      </div>
    </div>
  );
}
