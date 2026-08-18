"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Clock, PlayCircle, Target, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subjectiveApi, SubjectivePracticeSet } from "@/lib/api/subjective";

export default function SubjectivePracticeSetsPage() {
  const router = useRouter();
  const [sets, setSets] = useState<SubjectivePracticeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadSets() {
      try {
        const data = await subjectiveApi.getPracticeSets();
        setSets(data);
      } catch (error) {
        console.error("Failed to load subjective practice sets", error);
      } finally {
        setLoading(false);
      }
    }
    loadSets();
  }, []);

  const handleStart = async (setId: number) => {
    setStartingId(setId);
    try {
      const attempt = await subjectiveApi.startAttempt({
        mode: 'practice',
        practice_set_id: setId
      });
      router.push(`/subjective/answer?attempt_id=${attempt.id}`);
    } catch (e) {
      console.error("Failed to start subjective practice", e);
      alert("Failed to start practice set. Please try again.");
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
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-[#0B2545]">Subjective Practice Sets</h1>
            <p className="text-slate-500">Select a curated set of questions to practice your writing skills.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : sets.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-[18px] font-bold text-[#0B2545] mb-2">No Practice Sets Available</h3>
          <p className="text-slate-500">Check back later for new descriptive question sets.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {sets.map(set => (
            <div key={set.id} className="bg-white rounded-[16px] border border-slate-200 p-6 flex flex-col hover:border-slate-300 transition-colors shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {set.subject_name}
                  </div>
                  <h3 className="text-[20px] font-bold text-[#0B2545] leading-snug">
                    {set.title}
                  </h3>
                </div>
              </div>
              
              {set.topic_name && (
                <div className="text-[14px] text-slate-600 mb-4 bg-slate-50 p-2 rounded inline-block w-fit">
                  Topic: <strong>{set.topic_name}</strong>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6 mt-2">
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-[12px]">
                  <Target className="w-5 h-5 text-[#0B2545]" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Questions</div>
                    <div className="text-[14px] font-bold text-[#0B2545]">{set.question_count}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-[12px]">
                  <Clock className="w-5 h-5 text-[#0B2545]" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Est. Time</div>
                    <div className="text-[14px] font-bold text-[#0B2545]">{set.estimated_time_minutes} Mins</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto pt-6 border-t border-slate-100 flex">
                <Button 
                  onClick={() => handleStart(set.id)}
                  disabled={startingId === set.id}
                  className="w-full h-12 bg-[#0B2545] hover:bg-[#1a365d] text-white font-bold text-[15px]"
                >
                  {startingId === set.id ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Preparing...
                    </div>
                  ) : (
                    <><PlayCircle className="w-4 h-4 mr-2" /> Start Practice</>
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
