"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Share2,
  Download,
  FileBadge,
  Trophy,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { studentResultService } from "@/lib/api/student-results";
import {
  StudentResult,
  SubjectPerformance,
  TopicPerformance,
  QuestionReview,
} from "@/lib/mock/student-results";

export default function FullResultPage() {
  const params = useParams();
  const resultId = params.resultId as string;

  const [result, setResult] = useState<StudentResult | null>(null);
  const [subjects, setSubjects] = useState<SubjectPerformance[]>([]);
  const [topics, setTopics] = useState<TopicPerformance[]>([]);
  const [reviews, setReviews] = useState<QuestionReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resultData, subjectsData, topicsData, reviewsData] = await Promise.all([
          studentResultService.getStudentResult(resultId),
          studentResultService.getSubjectPerformance(),
          studentResultService.getTopicPerformance(),
          studentResultService.getQuestionReviews(resultId),
        ]);
        if (resultData) setResult(resultData);
        setSubjects(subjectsData);
        setTopics(topicsData);
        setReviews(reviewsData);
      } catch (error) {
        console.error("Failed to load result details", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [resultId]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B2545] border-t-[#D4A72C]"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Result not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/student/results">Back to Results</Link>
        </Button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const totalCorrect = subjects.reduce((sum, s) => sum + s.correct, 0);
  const totalIncorrect = subjects.reduce((sum, s) => sum + s.incorrect, 0);
  const totalUnanswered = subjects.reduce((sum, s) => sum + (s.questions - s.correct - s.incorrect), 0);
  const avgTimePerQuestion = result.timeTaken / (totalCorrect + totalIncorrect + totalUnanswered);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      {/* Top Nav */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/student/results" className="inline-flex items-center text-sm text-slate-500 hover:text-[#0B2545] mb-2 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Results
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2545]">{result.examName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button className="bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0B2545] font-semibold" size="sm">
            <FileBadge className="w-4 h-4 mr-2" /> Certificate
          </Button>
        </div>
      </div>

      {/* Premium Result Summary Card */}
      <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6B] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-[#1a4a7e]">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Award className="w-64 h-64 -mt-10 -mr-10" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left flex-1">
            <p className="text-[#D4A72C] font-semibold tracking-wider text-sm uppercase mb-2">Final Score</p>
            <div className="flex items-end justify-center md:justify-start gap-2 mb-2">
              <span className="text-6xl font-black">{result.score}</span>
              <span className="text-xl text-white/60 mb-2">/ {result.totalMarks}</span>
            </div>
            <p className="text-white/80 font-medium">You scored {result.percentage}% on this exam.</p>
          </div>
          
          <div className="flex-1 w-full flex flex-col gap-4">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 flex justify-between items-center">
              <div>
                <p className="text-white/60 text-xs uppercase font-semibold mb-1">Global Rank</p>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#D4A72C]" />
                  <span className="text-2xl font-bold">#{result.rank}</span>
                  <span className="text-xs text-white/50 ml-1">of {result.totalParticipants}</span>
                </div>
              </div>
              <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0" asChild>
                <Link href={`/student/leaderboard?exam=${result.examId}`}>
                  <Trophy className="w-4 h-4 mr-1.5" /> View Leaderboard
                </Link>
              </Button>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 flex-1">
                <p className="text-white/60 text-xs uppercase font-semibold mb-1">Percentile</p>
                <span className="text-xl font-bold text-emerald-400">{result.percentile}%</span>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 flex-1">
                <p className="text-white/60 text-xs uppercase font-semibold mb-1">Time Taken</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-white/80" />
                  <span className="text-xl font-bold">{formatTime(result.timeTaken)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Breakdown */}
      <div>
        <h2 className="text-xl font-bold text-[#0B2545] mb-4">Performance Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center">
            <CheckCircle2 className="w-6 h-6 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-[#0B2545]">{totalCorrect}</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Correct</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center">
            <XCircle className="w-6 h-6 text-red-500 mb-2" />
            <p className="text-2xl font-bold text-[#0B2545]">{totalIncorrect}</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Incorrect</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center">
            <HelpCircle className="w-6 h-6 text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-[#0B2545]">{totalUnanswered}</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Unanswered</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center">
            <Award className="w-6 h-6 text-[#D4A72C] mb-2" />
            <p className="text-2xl font-bold text-[#0B2545]">{result.percentage}%</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Accuracy</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center">
            <Clock className="w-6 h-6 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-[#0B2545]">{Math.round(avgTimePerQuestion)}s</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Avg Time/Q</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Subject-wise Performance */}
        <div>
          <h2 className="text-xl font-bold text-[#0B2545] mb-4">Subject-wise Performance</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3 text-center">Correct</th>
                  <th className="px-4 py-3 text-center">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {subjects.map((subj, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-[#0B2545]">{subj.subject}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600 font-medium">{subj.correct}</span>
                      <span className="text-slate-400 text-xs">/{subj.questions}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className="bg-[#D4A72C] h-1.5 rounded-full" style={{ width: `${subj.accuracy}%` }} />
                        </div>
                        <span className="text-xs font-semibold w-8 text-right">{subj.accuracy}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chapter/Topic Performance */}
        <div>
          <h2 className="text-xl font-bold text-[#0B2545] mb-4">Topic Analysis</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topics.map((topic, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-[#0B2545]">{topic.topic}</td>
                    <td className="px-4 py-3">
                      {topic.performance === "Strong" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">STRONG</span>
                      )}
                      {topic.performance === "Average" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">AVERAGE</span>
                      )}
                      {topic.performance === "Needs Improvement" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">NEEDS WORK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Question Review */}
      <div>
        <h2 className="text-xl font-bold text-[#0B2545] mb-4">Review Answers</h2>
        <div className="space-y-4">
          {reviews.map((review, idx) => (
            <div key={review.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex gap-4 items-start mb-4">
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#0B2545] leading-relaxed mb-4">
                    {review.questionText}
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Answer</p>
                      <div className="flex items-center gap-2">
                        {review.status === "Correct" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {review.status === "Incorrect" && <XCircle className="w-4 h-4 text-red-500" />}
                        {review.status === "Unanswered" && <HelpCircle className="w-4 h-4 text-slate-400" />}
                        <span className={
                          review.status === "Correct" ? "text-green-700 font-medium" : 
                          review.status === "Incorrect" ? "text-red-700 font-medium" : "text-slate-500 italic"
                        }>
                          {review.studentAnswer || "Not answered"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Correct Answer</p>
                      <span className="text-green-800 font-medium">
                        {review.correctAnswer}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" /> Explanation
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {review.explanation}
                    </p>
                  </div>
                </div>
                
                <div className="shrink-0 text-right hidden sm:block">
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                    review.status === "Correct" ? "bg-green-100 text-green-700" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {review.marks} / {review.maxMarks} marks
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
