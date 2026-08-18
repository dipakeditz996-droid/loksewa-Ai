'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminQuestionApi, AdminQuestion } from '@/lib/api/admin-questions';
import { adminSyllabusApi } from '@/lib/api/admin-syllabus';
import Link from 'next/link';
import { ArrowLeft, Save, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function EditQuestionPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [question, setQuestion] = useState<AdminQuestion | null>(null);
  
  // AI State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiOptions, setAiOptions] = useState<{option_a:string, option_b:string, option_c:string, option_d:string, correct_option:string} | null>(null);
  
  // Form State
  const [qType, setQType] = useState<'mcq' | 'subjective' | 'true_false' | 'short_answer' | 'long_answer'>('mcq');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [text, setText] = useState('');
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [expectedTime, setExpectedTime] = useState(1);
  const [explanation, setExplanation] = useState('');
  
  // MCQ specifics
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [correctOption, setCorrectOption] = useState<'A'|'B'|'C'|'D'|''>('');
  
  // Subjective specifics
  const [modelAnswer, setModelAnswer] = useState('');

  // Syllabus Cascading
  const [categories, setCategories] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  
  const [selCategory, setSelCategory] = useState('');
  const [selPosition, setSelPosition] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selChapter, setSelChapter] = useState('');
  const [selTopic, setSelTopic] = useState('');

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const catRes = await adminSyllabusApi.getCategories();
        setCategories(catRes);

        const q = await adminQuestionApi.getQuestion(Number(id));
        setQuestion(q);
        setQType(q.question_type);
        setStatus(q.status);
        setDifficulty(q.difficulty);
        setText(q.text);
        setMarks(q.marks);
        setNegativeMarks(q.negative_marks);
        setExpectedTime(q.expected_time_minutes);
        setExplanation(q.explanation || '');

        if (q.question_type === 'mcq') {
          setOptions({ A: q.option_a || '', B: q.option_b || '', C: q.option_c || '', D: q.option_d || '' });
          setCorrectOption(q.correct_option as any || '');
        } else if (q.question_type === 'true_false') {
          setCorrectOption(q.correct_option as any || '');
        } else {
          setModelAnswer(q.model_answer || '');
        }

        // We could theoretically back-resolve the topic -> chapter -> subject -> position -> category
        // But for editing, we just show the current topic context or require re-selection if they want to change it.
        // For simplicity, we just set the final topic if they don't change anything it will be sent as-is.
        setSelTopic(String(q.topic));
        
      } catch (err) {
        toast.error('Failed to load question details');
      } finally {
        setFetching(false);
      }
    };
    init();
  }, [id]);

  // Cascading logic (only triggers if user interacts)
  useEffect(() => {
    if (selCategory) {
      adminSyllabusApi.getPositions(Number(selCategory)).then(res => setPositions(res));
    }
  }, [selCategory]);

  useEffect(() => {
    if (selPosition) {
      adminSyllabusApi.getSubjects(Number(selPosition)).then(res => setSubjects(res));
    }
  }, [selPosition]);

  useEffect(() => {
    if (selSubject) {
      adminSyllabusApi.getChapters(Number(selSubject)).then(res => setChapters(res));
    }
  }, [selSubject]);

  useEffect(() => {
    if (selChapter) {
      adminSyllabusApi.getTopics(Number(selChapter)).then(res => setTopics(res));
    }
  }, [selChapter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (qType === 'mcq' && (!correctOption || !options.A || !options.B || !options.C || !options.D)) {
      toast.error('MCQ requires 4 options and a correct option.');
      return;
    }
    
    setLoading(true);
    try {
      const payload: Partial<AdminQuestion> = {
        question_type: qType,
        status,
        difficulty,
        topic: Number(selTopic),
        text,
        marks: Number(marks),
        negative_marks: Number(negativeMarks),
        expected_time_minutes: Number(expectedTime),
        explanation
      };

      if (qType === 'mcq') {
        payload.option_a = options.A;
        payload.option_b = options.B;
        payload.option_c = options.C;
        payload.option_d = options.D;
        payload.correct_option = correctOption as 'A'|'B'|'C'|'D';
      } else if (qType === 'subjective' || qType.includes('answer')) {
        payload.model_answer = modelAnswer;
      }

      await adminQuestionApi.updateQuestion(Number(id), payload);
      toast.success('Question updated successfully!');
      router.push('/admin-dashboard/academic/questions');
    } catch (error: any) {
      toast.error('Failed to update question');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    setAiGenerating(true);
    try {
      const res = await adminQuestionApi.generateOptions(Number(id));
      setAiOptions(res);
    } catch (error: any) {
      toast.error('Failed to generate options');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApproveAI = async () => {
    if (!aiOptions) return;
    setLoading(true);
    try {
      await adminQuestionApi.approveOptions(Number(id), aiOptions);
      toast.success('Options approved and applied');
      setIsAiModalOpen(false);
      // Reload question
      const q = await adminQuestionApi.getQuestion(Number(id));
      setQuestion(q);
      setOptions({ A: q.option_a || '', B: q.option_b || '', C: q.option_c || '', D: q.option_d || '' });
      setCorrectOption(q.correct_option as any || '');
    } catch (error: any) {
      toast.error('Failed to approve options');
    } finally {
      setLoading(false);
    }
  };

  if (fetching || !question) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin-dashboard/academic/questions"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
            <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {question.question_id || `Q-${question.id.toString().padStart(6, '0')}`}
            </span>
          </div>
          <p className="text-gray-500 mt-1">Modify existing question details and options.</p>
        </div>
      </div>
      
      {question.ai_status === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">AI Options Pending</h3>
              <p className="text-sm text-amber-700 mt-1">
                This question is waiting for its options to be auto-generated by AI.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Review AI Options
          </button>
        </div>
      )}
      
      {question.usage_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">High Impact Warning</h3>
            <p className="text-sm text-amber-700 mt-1">
              This question is currently used in <strong>{question.usage_count} question sets or exams</strong>. 
              Any modifications made here will automatically propagate and affect those existing sets.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Settings */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
              <select value={qType} onChange={(e: any) => setQType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50" disabled>
                <option value={qType}>{qType.replace('_', ' ').toUpperCase()}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select value={status} onChange={(e: any) => setStatus(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <select value={difficulty} onChange={(e: any) => setDifficulty(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Question Text */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <label className="block text-sm font-medium text-gray-700">Question Content</label>
          <textarea 
            value={text} 
            onChange={e => setText(e.target.value)} 
            className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[120px]" 
            required
          />
        </div>

        {/* Options / Model Answer */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
          {qType === 'mcq' && (
            <div className="space-y-4">
              {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <div key={opt} className="flex items-center gap-4">
                  <input type="radio" checked={correctOption === opt} onChange={() => setCorrectOption(opt)} className="w-5 h-5 text-navy-600 border-gray-300 focus:ring-navy-500" />
                  <span className="font-bold text-gray-700 w-6">{opt}.</span>
                  <input type="text" value={options[opt]} onChange={e => setOptions({...options, [opt]: e.target.value})} className="flex-1 border border-gray-200 rounded-lg px-3 py-2" required />
                </div>
              ))}
            </div>
          )}

          {qType !== 'mcq' && qType !== 'true_false' && (
            <>
              <h2 className="text-lg font-semibold">Model Answer</h2>
              <textarea value={modelAnswer} onChange={e => setModelAnswer(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[150px]" required />
            </>
          )}

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Explanation</h2>
            <textarea value={explanation} onChange={e => setExplanation(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[100px]" />
          </div>
        </div>

        <div className="flex justify-end pt-4 pb-12">
          <button type="submit" disabled={loading} className="bg-navy-600 hover:bg-navy-700 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors">
            {loading ? 'Saving...' : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
        </div>
      </form>
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">AI Options Generation</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="font-medium text-gray-900 mb-2">Question:</p>
              <p className="text-gray-700">{question.text}</p>
            </div>
            
            {!aiOptions ? (
              <div className="text-center py-12">
                {aiGenerating ? (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-gray-600">Generating options using Gemini AI...</p>
                  </div>
                ) : (
                  <button 
                    onClick={handleGenerateAI}
                    className="bg-navy-600 hover:bg-navy-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                  >
                    Generate Options Now
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="font-medium text-gray-900">Suggested Options:</p>
                <div className="space-y-2">
                  <div className={`p-3 rounded-lg border ${aiOptions.correct_option === 'A' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <span className="font-bold mr-2 text-gray-600">A.</span> {aiOptions.option_a}
                    {aiOptions.correct_option === 'A' && <span className="float-right text-green-700 font-medium text-sm">Correct</span>}
                  </div>
                  <div className={`p-3 rounded-lg border ${aiOptions.correct_option === 'B' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <span className="font-bold mr-2 text-gray-600">B.</span> {aiOptions.option_b}
                    {aiOptions.correct_option === 'B' && <span className="float-right text-green-700 font-medium text-sm">Correct</span>}
                  </div>
                  <div className={`p-3 rounded-lg border ${aiOptions.correct_option === 'C' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <span className="font-bold mr-2 text-gray-600">C.</span> {aiOptions.option_c}
                    {aiOptions.correct_option === 'C' && <span className="float-right text-green-700 font-medium text-sm">Correct</span>}
                  </div>
                  <div className={`p-3 rounded-lg border ${aiOptions.correct_option === 'D' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <span className="font-bold mr-2 text-gray-600">D.</span> {aiOptions.option_d}
                    {aiOptions.correct_option === 'D' && <span className="float-right text-green-700 font-medium text-sm">Correct</span>}
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleGenerateAI}
                    disabled={aiGenerating}
                    className="px-4 py-2 font-medium text-navy-600 bg-navy-50 hover:bg-navy-100 rounded-lg transition-colors"
                  >
                    Regenerate
                  </button>
                  <button 
                    onClick={handleApproveAI}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Approve & Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
