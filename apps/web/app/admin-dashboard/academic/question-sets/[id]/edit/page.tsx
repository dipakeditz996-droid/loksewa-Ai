'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { QuestionSetForm } from '@/components/admin/question-sets/QuestionSetForm';
import { QuestionSelector } from '@/components/admin/question-sets/QuestionSelector';
import { AiSetGenerator } from '@/components/admin/question-sets/AiSetGenerator';
import { QuestionOrder } from '@/components/admin/question-sets/QuestionOrder';
import { adminQuestionSetApi, QuestionSet, QuestionSetQuestion } from '@/lib/api/admin-question-sets';
import { Save, Loader2, Sparkles, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function EditQuestionSetPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<QuestionSet | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [showAiModal, setShowAiModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminQuestionSetApi.getQuestionSet(id);
      setData(res);
    } catch (e: any) {
      toast.error('Failed to load question set');
      router.push('/admin-dashboard/academic/question-sets');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInfo = async () => {
    if (!data) return;
    
    const newErrors: Record<string, string> = {};
    if (!data.name) newErrors.name = 'Name is required';
    if (!data.category) newErrors.category = 'Category is required';
    if (!data.exam) newErrors.exam = 'Position is required';
    
    const type = data.set_type || 'custom';
    if (['subject', 'chapter', 'topic'].includes(type) && !data.subject) {
      newErrors.subject = 'Subject is required for this set type';
    }
    if (['chapter', 'topic'].includes(type) && !data.unit) {
      newErrors.unit = 'Chapter is required for this set type';
    }
    if (type === 'topic' && !data.topic) {
      newErrors.topic = 'Topic is required for this set type';
    }
    
    if (type === 'full_mock') {
      const dist = data.subject_distribution || {};
      const totalDist = Object.values(dist).reduce((a, b) => a + (Number(b) || 0), 0);
      if (totalDist !== (data.total_questions || 0)) {
        newErrors.subject_distribution = `Distribution sum (${totalDist}) must match Total Questions (${data.total_questions || 0})`;
      }
    }

    if (!data.total_questions || data.total_questions < 1) newErrors.total_questions = 'Total questions must be > 0';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix validation errors');
      return;
    }

    setSaving(true);
    try {
      await adminQuestionSetApi.updateQuestionSet(id, {
        name: data.name,
        description: data.description,
        set_type: data.set_type,
        category: data.category,
        exam: data.exam,
        subject: data.subject,
        unit: data.unit,
        topic: data.topic,
        subject_distribution: data.subject_distribution,
        total_questions: data.total_questions,
        time_limit: data.time_limit,
        passing_marks: data.passing_marks,
        total_marks: data.total_marks,
        marks_per_question: data.marks_per_question,
        negative_marking: data.negative_marking,
        negative_marking_value: data.negative_marking_value,
        randomize_questions: data.randomize_questions,
        randomize_options: data.randomize_options,
        status: data.status,
        difficulty_distribution: data.difficulty_distribution
      });
      toast.success('Configuration saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestions = async (ids: number[]) => {
    try {
      await adminQuestionSetApi.addQuestions(id, ids);
      toast.success(`Added ${ids.length} questions`);
      setShowAiModal(false);
      setShowManualModal(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add questions');
    }
  };

  const handleRemoveQuestion = async (qId: number) => {
    try {
      await adminQuestionSetApi.removeQuestions(id, [qId]);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove question');
    }
  };

  const handleReorder = async (newOrderList: QuestionSetQuestion[]) => {
    // Optimistic update UI
    if (data) setData({ ...data, questions_list: newOrderList });
    
    // Save to backend
    const orderData = newOrderList.map((q, idx) => ({ question_id: q.question, order: idx + 1 }));
    try {
      await adminQuestionSetApi.reorderQuestions(id, orderData);
    } catch (e: any) {
      toast.error('Failed to save new order');
      fetchData(); // Revert on failure
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
      </div>
    );
  }

  if (!data) return null;

  const currentQCount = data.questions_list?.length || 0;
  const missingCount = data.total_questions - currentQCount;

  return (
    <div className="p-5 md:p-6 space-y-8 max-w-[1200px] mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin-dashboard/academic/question-sets" className="hover:text-[#0B2545] transition-colors">Question Sets</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Edit Set</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Configure settings and manage questions.
          </p>
        </div>
        
        <div className="flex gap-2">
           <button
            onClick={fetchData}
            className="p-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Config (Section A & B) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="sticky top-6 space-y-6">
             <QuestionSetForm 
              initialData={data}
              onChange={(newData) => setData({ ...data, ...newData } as QuestionSet)}
              errors={errors}
            />
            <div className="flex justify-end">
              <button
                onClick={handleUpdateInfo}
                disabled={saving}
                className="px-6 py-2 bg-[#0B2545] text-white rounded-lg font-medium hover:bg-[#163E6C] transition-colors disabled:opacity-70 flex items-center gap-2 w-full justify-center"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Configuration
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Questions (Section C) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Section C — Selected Questions</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm font-medium ${currentQCount === data.total_questions ? 'text-green-600' : 'text-amber-600'}`}>
                    {currentQCount} / {data.total_questions} Questions added
                  </span>
                  {missingCount > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      Needs {missingCount} more
                    </span>
                  )}
                  {missingCount < 0 && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Remove {Math.abs(missingCount)} questions
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowManualModal(true)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Add Manual
                </button>
                <button
                  onClick={() => setShowAiModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" /> AI Generate
                </button>
              </div>
            </div>

            <QuestionOrder 
              questions={data.questions_list || []} 
              onReorder={handleReorder}
              onRemove={handleRemoveQuestion}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <AiSetGenerator 
            questionSetId={data.id}
            distribution={data.difficulty_distribution}
            onAccept={handleAddQuestions}
            onCancel={() => setShowAiModal(false)}
          />
        </div>
      )}

      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold text-lg">Add from Master Question Bank</h2>
              <button onClick={() => setShowManualModal(false)} className="text-gray-500 hover:text-gray-700 font-bold">×</button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <QuestionSelector 
                onAdd={handleAddQuestions} 
                existingIds={(data.questions_list || []).map(q => q.question)} 
                subjectId={data.subject}
                unitId={data.unit}
                topicId={data.topic}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
