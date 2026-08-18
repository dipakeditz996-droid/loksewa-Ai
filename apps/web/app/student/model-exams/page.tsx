"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Clock, Target, AlertTriangle, ChevronRight, PlayCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { modelExamApi, ModelExam } from "@/lib/api/modelExam";

export default function ModelExamListPage() {
  const [exams, setExams] = useState<ModelExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExams() {
      try {
        const data = await modelExamApi.getExams();
        setExams(data);
      } catch (error) {
        console.error("Failed to load model exams", error);
      } finally {
        setLoading(false);
      }
    }
    loadExams();
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      {/* HEADER */}
      <div className="bg-[#0B2545] rounded-[20px] p-8 md:p-12 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-[13px] font-bold tracking-wide uppercase mb-6 border border-white/20">
            <Target className="w-4 h-4" />
            Model Exams
          </div>
          <h1 className="text-[32px] md:text-[42px] font-bold tracking-tight mb-4 leading-tight">
            Test your preparation under real examination conditions.
          </h1>
          <p className="text-[16px] md:text-[18px] text-white/70 leading-relaxed mb-8">
            Experience the pressure of actual Loksewa exams. Fixed duration, strict rules, and negative marking applied.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-[#0B2545]">Available Examinations</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-[18px] font-bold text-[#0B2545] mb-2">No Model Exams Available</h3>
          <p className="text-slate-500">Check back later for new mock tests.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white rounded-[16px] border border-slate-200 p-6 flex flex-col hover:border-slate-300 transition-colors shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Model Examination
                  </div>
                  <h3 className="text-[20px] font-bold text-[#0B2545] leading-snug">
                    {exam.title}
                  </h3>
                </div>
                <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[12px] font-bold uppercase tracking-wider border border-green-200">
                  Available
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 mt-4">
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-[12px]">
                  <BookOpen className="w-5 h-5 text-[#0B2545]" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Questions</div>
                    <div className="text-[14px] font-bold text-[#0B2545]">{exam.total_questions}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-[12px]">
                  <Target className="w-5 h-5 text-[#0B2545]" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Marks</div>
                    <div className="text-[14px] font-bold text-[#0B2545]">{exam.total_marks}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-[12px]">
                  <Clock className="w-5 h-5 text-[#0B2545]" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Duration</div>
                    <div className="text-[14px] font-bold text-[#0B2545]">{exam.duration_minutes} Mins</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-[12px]">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Negative</div>
                    <div className="text-[14px] font-bold text-[#0B2545]">{exam.negative_marking} per wrong</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto pt-6 border-t border-slate-100 flex gap-3">
                <Link href={`/student/model-exams/${exam.id}`} className="flex-1">
                  <Button className="w-full h-12 bg-[#0B2545] hover:bg-[#1a365d] text-white font-bold text-[15px]">
                    <PlayCircle className="w-4 h-4 mr-2" /> Start Exam
                  </Button>
                </Link>
                <Link href={`/student/model-exams/${exam.id}`}>
                  <Button variant="outline" className="h-12 px-6 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold">
                    Details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
