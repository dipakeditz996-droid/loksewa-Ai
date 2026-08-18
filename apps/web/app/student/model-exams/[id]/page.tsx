"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Target, Clock, AlertTriangle, ArrowRight, ArrowLeft,
  CheckCircle2, FileText, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { modelExamApi, ModelExam } from "@/lib/api/modelExam";

export default function ModelExamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [exam, setExam] = useState<ModelExam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExam() {
      try {
        const id = parseInt(resolvedParams.id, 10);
        const data = await modelExamApi.getExam(id);
        setExam(data);
      } catch (error) {
        console.error("Failed to load exam details", error);
        router.push("/student/model-exams");
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [resolvedParams.id, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="max-w-[800px] mx-auto space-y-8">
      
      <Link href="/student/model-exams" className="inline-flex items-center text-[14px] font-bold text-slate-500 hover:text-[#0B2545] transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Model Exams
      </Link>

      <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 overflow-hidden">
        {/* HEADER */}
        <div className="bg-[#0B2545] p-8 md:p-10 text-white relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-[12px] font-bold tracking-wide uppercase mb-4 border border-white/20">
            <Target className="w-3.5 h-3.5" />
            Model Examination
          </div>
          <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight mb-4 leading-tight">
            {exam.title}
          </h1>
          <p className="text-[15px] md:text-[16px] text-white/70 leading-relaxed max-w-[600px]">
            {exam.description || "This is a full model examination designed to simulate the actual test environment."}
          </p>
        </div>

        {/* DETAILS */}
        <div className="p-8 md:p-10 space-y-10">
          
          <div>
            <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-4">Examination Rules & Format</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-[12px] border border-slate-100">
                <div className="text-[12px] font-bold text-slate-500 uppercase mb-1">Total Questions</div>
                <div className="text-[24px] font-bold text-[#0B2545]">{exam.total_questions}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-[12px] border border-slate-100">
                <div className="text-[12px] font-bold text-slate-500 uppercase mb-1">Total Marks</div>
                <div className="text-[24px] font-bold text-[#0B2545]">{exam.total_marks}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-[12px] border border-slate-100">
                <div className="text-[12px] font-bold text-slate-500 uppercase mb-1">Duration</div>
                <div className="text-[24px] font-bold text-[#0B2545]">{exam.duration_minutes}m</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-[12px] border border-slate-100">
                <div className="text-[12px] font-bold text-slate-500 uppercase mb-1">Pass Marks</div>
                <div className="text-[24px] font-bold text-[#0B2545]">{exam.passing_marks || "N/A"}</div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-[12px] p-5 flex gap-4">
            <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0" />
            <div>
              <h4 className="text-[15px] font-bold text-orange-800 mb-1">Negative Marking Applies</h4>
              <p className="text-[14px] text-orange-700 leading-relaxed">
                For every incorrect answer, <strong>{exam.negative_marking} marks</strong> will be deducted from your total score. Unanswered questions do not attract negative marks.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-5 flex gap-4">
            <Info className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <h4 className="text-[15px] font-bold text-blue-900 mb-1">Strict Timer</h4>
              <p className="text-[14px] text-blue-800 leading-relaxed">
                Once the examination starts, the timer cannot be paused. If your internet disconnects, the timer will continue running on the server. The exam will automatically submit when the duration expires.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <Link href={`/student/model-exams/${exam.id}/instructions`}>
              <Button className="h-14 px-8 bg-[#D4A72C] hover:bg-[#b58e23] text-[#0A1118] font-bold text-[16px]">
                Continue to Instructions <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
}
