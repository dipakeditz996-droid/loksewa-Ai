"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckSquare, Square, PlayCircle, BookOpen, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ModelExamInstructionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (!agreed) return;
    setStarting(true);
    // Note: We don't call the API here to start the session.
    // We navigate to the session page, and the session page will call the API to start/resume.
    // This ensures the strict timer starts exactly when the UI is ready to display it.
    router.push(`/model-exams/session?exam_id=${resolvedParams.id}`);
  };

  return (
    <div className="max-w-[800px] mx-auto space-y-8">
      
      <Link href={`/student/model-exams/${resolvedParams.id}`} className="inline-flex items-center text-[14px] font-bold text-slate-500 hover:text-[#0B2545] transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Details
      </Link>

      <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 md:p-10 border-b border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-[#0B2545]">Examination Instructions</h1>
            <p className="text-slate-500">Please read carefully before starting.</p>
          </div>
        </div>

        <div className="p-8 md:p-10 space-y-8">
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-[12px] font-bold text-slate-500">1</div>
              <p className="text-[15px] text-slate-700 leading-relaxed">
                Read every question carefully. Select the most appropriate answer from the given options.
              </p>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-[12px] font-bold text-slate-500">2</div>
              <p className="text-[15px] text-slate-700 leading-relaxed">
                You may navigate back and forth between questions using the Question Palette on the right side of the screen.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-[12px] font-bold text-slate-500">3</div>
              <p className="text-[15px] text-slate-700 leading-relaxed">
                You can <strong>Mark for Review</strong> any question if you want to revisit it later before submission.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-[12px] font-bold text-slate-500">4</div>
              <p className="text-[15px] text-slate-700 leading-relaxed">
                The examination has a <strong>fixed duration</strong>. A timer will be constantly visible at the top of your screen.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-[12px] font-bold text-slate-500">5</div>
              <p className="text-[15px] text-slate-700 leading-relaxed">
                <strong>Auto-Submission:</strong> The exam will automatically submit when the timer reaches zero, capturing whatever answers you have selected up to that point.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-[12px] font-bold text-slate-500">6</div>
              <p className="text-[15px] text-slate-700 leading-relaxed">
                <strong>Negative Marking:</strong> Be aware that incorrect answers will result in a deduction of marks according to the exam rules.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[12px] border border-slate-200 mt-8">
            <button 
              onClick={() => setAgreed(!agreed)}
              className="flex items-center gap-3 text-left group w-full"
            >
              <div className="shrink-0 text-[#0B2545] transition-transform group-hover:scale-110">
                {agreed ? (
                  <CheckSquare className="w-6 h-6 text-green-600" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <span className={`text-[15px] font-medium select-none ${agreed ? 'text-[#0B2545]' : 'text-slate-600'}`}>
                I have read and understood all the instructions mentioned above. I am ready to begin the examination.
              </span>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <Button 
              onClick={handleStart}
              disabled={!agreed || starting}
              className={`h-14 px-10 font-bold text-[16px] ${
                agreed 
                  ? "bg-[#D4A72C] hover:bg-[#b58e23] text-[#0A1118]" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              {starting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-[#0A1118] border-t-transparent rounded-full animate-spin"></div>
                  Starting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" /> Start Examination
                </div>
              )}
            </Button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
