"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ArrowLeft, Target, Clock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subjectiveApi, SubjectiveQuestion } from "@/lib/api/subjective";

export default function SubjectiveTopicPracticePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<SubjectiveQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadQuestions() {
      try {
        // Just loading all active questions for now
        // A full implementation might have dropdowns to filter by subject/topic
        const data = await subjectiveApi.getQuestions();
        setQuestions(data);
      } catch (error) {
        console.error("Failed to load subjective questions", error);
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, []);

  const handleStart = async (questionId: number) => {
    setStartingId(questionId);
    try {
      const attempt = await subjectiveApi.startAttempt({
        mode: 'topic',
        question_ids: [questionId]
      });
      router.push(`/subjective/answer?attempt_id=${attempt.id}`);
    } catch (e) {
      console.error("Failed to start topic practice", e);
      alert("Failed to start practice. Please try again.");
      setStartingId(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 p-4 md:p-8">
      
      <Link href="/student/subjective" className="inline-flex items-center text-[14px] font-bold text-slate-500 hover:text-[#0B2545] transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Subjective Practice
      </Link>

      <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 md:p-10 border-b border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-[#0B2545]">Topic-wise Subjective Practice</h1>
            <p className="text-slate-500">Practice individual descriptive questions to strengthen specific topics.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-[18px] font-bold text-[#0B2545] mb-2">No Questions Available</h3>
          <p className="text-slate-500">Check back later for new descriptive questions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-colors flex flex-col md:flex-row gap-6">
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">{q.subject_name}</span>
                  {q.topic_name && (
                    <>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">{q.topic_name}</span>
                    </>
                  )}
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    q.difficulty === 'hard' ? 'bg-red-50 text-red-600 border-red-200' :
                    q.difficulty === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                    'bg-green-50 text-green-600 border-green-200'
                  }`}>
                    {q.difficulty}
                  </span>
                </div>
                
                <h3 className="text-[16px] md:text-[18px] font-semibold text-[#0B2545] leading-relaxed mb-4">
                  {index + 1}. {q.text}
                </h3>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span className="text-[14px] font-bold">{q.marks} Marks</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-[14px] font-bold">{q.suggested_time_minutes} Mins Suggested</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center md:border-l border-slate-100 md:pl-6">
                <Button 
                  onClick={() => handleStart(q.id)}
                  disabled={startingId === q.id}
                  className="w-full md:w-auto h-12 px-8 bg-[#0B2545] hover:bg-[#1a365d] text-white font-bold"
                >
                  {startingId === q.id ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Preparing...
                    </div>
                  ) : (
                    <><PlayCircle className="w-4 h-4 mr-2" /> Start Answer</>
                  )}
                </Button>
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
