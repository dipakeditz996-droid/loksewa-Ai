'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionSetForm } from '@/components/admin/question-sets/QuestionSetForm';
import { adminQuestionSetApi, QuestionSet } from '@/lib/api/admin-question-sets';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function CreateQuestionSetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Partial<QuestionSet>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
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
    if (!data.time_limit || data.time_limit < 1) newErrors.time_limit = 'Time limit must be > 0';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (redirectNext: boolean) => {
    if (!validate()) {
      toast.error('Please fill all required fields correctly.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminQuestionSetApi.createQuestionSet(data);
      toast.success('Question Set created successfully');
      
      if (redirectNext) {
        router.push(`/admin-dashboard/academic/question-sets/${res.id}/edit`);
      } else {
        router.push('/admin-dashboard/academic/question-sets');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to create Question Set');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1200px] mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin-dashboard/academic/question-sets" className="hover:text-[#0B2545] transition-colors">Question Sets</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Create New</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Question Set</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Step 1: Configure basic information and exam settings.
          </p>
        </div>
      </div>

      {/* Form Component */}
      <QuestionSetForm 
        onChange={setData} 
        errors={errors} 
      />
      
      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white border-t border-gray-200 shadow-lg flex justify-end gap-3 z-40">
        <Link
          href="/admin-dashboard/academic/question-sets"
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={() => handleSave(false)}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-70 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={loading}
          className="px-6 py-2 bg-[#0B2545] text-white rounded-lg font-medium hover:bg-[#163E6C] transition-colors disabled:opacity-70 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save & Add Questions
        </button>
      </div>
    </div>
  );
}
