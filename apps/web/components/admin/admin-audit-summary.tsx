import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export function AdminAuditSummary() {
  const totalTasks = 36;
  const completedTasks = 32;
  const remainingTasks = totalTasks - completedTasks;
  const percentage = Math.round((completedTasks / totalTasks) * 100);

  return (
    <Card className="col-span-full border-[#1a4a7e]/20 bg-gradient-to-r from-[#0B2545] to-[#163E6B] text-white">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#D4A72C]" />
              Phase 4 Implementation Audit
            </CardTitle>
            <p className="text-white/70 text-sm mt-1">
              Production readiness overview for the LoksewaAI Admin Portal.
            </p>
          </div>
          <Badge className="bg-[#D4A72C] text-[#0B2545] hover:bg-[#D4A72C]/90 font-bold px-3 py-1 text-sm">
            {percentage}% Completed
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Progress value={percentage} className="h-3 bg-white/20" />
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
              <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Total Features</p>
              <p className="text-3xl font-black">{totalTasks}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
              <p className="text-emerald-400/80 text-xs font-bold uppercase tracking-wider mb-1">Completed</p>
              <p className="text-3xl font-black text-emerald-400">{completedTasks}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center text-center">
              <p className="text-amber-400/80 text-xs font-bold uppercase tracking-wider mb-1">Remaining</p>
              <p className="text-3xl font-black text-amber-400">{remainingTasks}</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10 mt-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#D4A72C]" />
              Remaining Action Items
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Circle className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white/80">
                  <strong className="text-white">Automated Celery/Cron Background Workers</strong>: 
                  Setup periodic tasks for auto-publishing scheduled exams and dispatching scheduled notifications.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Circle className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white/80">
                  <strong className="text-white">External Gateway Webhooks</strong>: 
                  Finalize instant webhook triggers for successful Khalti / eSewa payments.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Circle className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white/80">
                  <strong className="text-white">Bulk Data Export Queue</strong>: 
                  Offload massive CSV analytics exports to background processing with email delivery.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Circle className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white/80">
                  <strong className="text-white">Production Error Telemetry (Sentry)</strong>: 
                  Integrate Sentry into Django & Next.js for unhandled exception monitoring.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
