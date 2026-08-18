'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminQuestionApi, AdminQuestion } from '@/lib/api/admin-questions';
import { Save, FileText, Wand2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AcademicDependentSelect } from '@/components/admin/syllabus/AcademicDependentSelect';

export function SingleQuestionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [qType, setQType] = useState<'mcq' | 'subjective' | 'true_false'>('mcq');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [text, setText] = useState('');
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [expectedTime, setExpectedTime] = useState(1);
  const [explanation, setExplanation] = useState('');
  
  // AI Generation
  const [aiGenerate, setAiGenerate] = useState(false);
  
  // MCQ specifics
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [correctOption, setCorrectOption] = useState<'A'|'B'|'C'|'D'|''>('');
  
  // Subjective specifics
  const [modelAnswer, setModelAnswer] = useState('');

  // Syllabus Cascading
  const [selCategory, setSelCategory] = useState('');
  const [selPosition, setSelPosition] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selChapter, setSelChapter] = useState('');
  const [selTopic, setSelTopic] = useState('');

  const handleAcademicChange = (field: string, value: any) => {
    if (field === 'category') {
      setSelCategory(value || '');
      setSelPosition('');
      setSelSubject('');
      setSelChapter('');
      setSelTopic('');
    } else if (field === 'position' || field === 'exam') {
      setSelPosition(value || '');
      setSelSubject('');
      setSelChapter('');
      setSelTopic('');
    } else if (field === 'subject') {
      setSelSubject(value || '');
      setSelChapter('');
      setSelTopic('');
    } else if (field === 'chapter' || field === 'unit') {
      setSelChapter(value || '');
      setSelTopic('');
    } else if (field === 'topic') {
      setSelTopic(value || '');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selTopic) {
      toast.error('Please select a specific topic in the syllabus hierarchy.');
      return;
    }
    
    if (qType === 'mcq' && !aiGenerate && (!correctOption || !options.A || !options.B || !options.C || !options.D)) {
      toast.error('MCQ requires 4 options and a correct option.');
      return;
    }
    
    if (qType === 'subjective' && !modelAnswer) {
      toast.error('Subjective questions require a model answer.');
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
        if (!aiGenerate) {
          payload.option_a = options.A;
          payload.option_b = options.B;
          payload.option_c = options.C;
          payload.option_d = options.D;
          payload.correct_option = correctOption as 'A'|'B'|'C'|'D';
        } else {
          payload.ai_generate_options = true;
        }
      } else if (qType === 'subjective') {
        payload.model_answer = modelAnswer;
      } else if (qType === 'true_false') {
        payload.option_a = 'True';
        payload.option_b = 'False';
        payload.correct_option = correctOption as 'A'|'B';
      }

      await adminQuestionApi.createQuestion(payload);
      toast.success('Question created successfully!');
      router.push('/admin-dashboard/academic/questions');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Core Settings */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-navy-600" />
          Core Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
            <select value={qType} onChange={(e: any) => { setQType(e.target.value); setCorrectOption(''); }} className="w-full border border-gray-200 rounded-lg px-3 py-2">
              <option value="mcq">Multiple Choice</option>
              <option value="true_false">True / False</option>
              <option value="subjective">Subjective</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select value={status} onChange={(e: any) => setStatus(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marks</label>
            <input type="number" step="0.5" value={marks} onChange={e => setMarks(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Negative Marks</label>
            <input type="number" step="0.1" value={negativeMarks} onChange={e => setNegativeMarks(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expected Time (min)</label>
            <input type="number" value={expectedTime} onChange={e => setExpectedTime(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2" required />
          </div>
        </div>
      </div>

      {/* Syllabus Selection */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Syllabus Mapping
        </h2>
        <p className="text-sm text-gray-500 mb-4">You must drill down to a specific Topic to save the question.</p>
        
        <AcademicDependentSelect
          category={selCategory}
          position={selPosition}
          subject={selSubject}
          chapter={selChapter}
          topic={selTopic}
          onChange={handleAcademicChange}
          maxLevel="topic"
          layout="grid"
        />
      </div>

      {/* Question Text */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <label className="block text-sm font-medium text-gray-700">Question Content</label>
        <textarea 
          value={text} 
          onChange={e => setText(e.target.value)} 
          className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[120px]" 
          placeholder="Type your question here..."
          required
        />
      </div>

      {/* Options / Model Answer */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        {qType === 'mcq' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Options</h2>
              <label className="flex items-center gap-2 cursor-pointer bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200">
                <input 
                  type="checkbox" 
                  checked={aiGenerate}
                  onChange={(e) => setAiGenerate(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium flex items-center gap-1"><Wand2 className="w-3.5 h-3.5" /> Auto-generate Options with AI</span>
              </label>
            </div>
            <div className="space-y-4">
              {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <div key={opt} className="flex items-center gap-4">
                  <input 
                    type="radio" 
                    name="correct" 
                    checked={correctOption === opt}
                    onChange={() => setCorrectOption(opt)}
                    disabled={aiGenerate}
                    className="w-5 h-5 text-navy-600 border-gray-300 focus:ring-navy-500 disabled:opacity-50"
                  />
                  <span className="font-bold text-gray-700 w-6">{opt}.</span>
                  <input 
                    type="text" 
                    value={options[opt]}
                    onChange={e => setOptions({...options, [opt]: e.target.value})}
                    disabled={aiGenerate}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 disabled:opacity-50 disabled:bg-gray-50"
                    placeholder={aiGenerate ? `AI will generate Option ${opt}` : `Option ${opt}`}
                    required={qType === 'mcq' && !aiGenerate}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {qType === 'true_false' && (
          <>
            <h2 className="text-lg font-semibold">True / False Selection</h2>
            <div className="flex gap-6 mt-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="tf_correct" checked={correctOption === 'A'} onChange={() => setCorrectOption('A')} className="w-5 h-5 text-navy-600" />
                True
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="tf_correct" checked={correctOption === 'B'} onChange={() => setCorrectOption('B')} className="w-5 h-5 text-navy-600" />
                False
              </label>
            </div>
          </>
        )}

        {qType === 'subjective' && (
          <>
            <h2 className="text-lg font-semibold">Model Answer</h2>
            <p className="text-sm text-gray-500">Provide the reference answer or rubric for evaluators.</p>
            <textarea 
              value={modelAnswer} 
              onChange={e => setModelAnswer(e.target.value)} 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[150px]" 
              placeholder="Key points to evaluate..."
              required={qType === 'subjective'}
            />
          </>
        )}

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Explanation (Optional)</h2>
          <textarea 
            value={explanation} 
            onChange={e => setExplanation(e.target.value)} 
            className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[100px]" 
            placeholder="Provide a detailed explanation for the correct answer..."
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 pb-12">
        <button 
          type="submit" 
          disabled={loading}
          className="bg-[#0B2545] hover:bg-[#163E6C] text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-70"
        >
          {loading ? 'Saving...' : (
            <>
              <Save className="w-5 h-5" />
              Save Question
            </>
          )}
        </button>
      </div>
    </form>
  );
}
