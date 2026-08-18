import { useEffect, useState } from 'react';
import { adminExamApi } from '@/lib/api/admin-exams';
import { Loader2, X, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ExamPreviewModalProps {
  examId: number;
  onClose: () => void;
}

export function ExamPreviewModal({ examId, onClose }: ExamPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchPreview();
  }, [examId]);

  const fetchPreview = async () => {
    try {
      const res = await adminExamApi.getPreview(examId);
      setData(res);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load preview');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Generating Preview...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col h-screen overflow-hidden">
      {/* Fake Student Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{data.title}</h1>
          <div className="flex gap-4 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {data.total_questions} Questions</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {data.time_limit} Minutes</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-red-600 font-mono font-bold text-lg bg-red-50 px-3 py-1 rounded border border-red-100 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {data.time_limit}:00
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white rounded font-medium hover:bg-gray-700"
          >
            Exit Preview
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-6 border border-yellow-200">
          <strong>Instructions:</strong> {data.instructions || 'No special instructions provided.'}
        </div>

        <div className="space-y-6">
          {data.questions?.map((q: any, index: number) => (
            <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-medium text-gray-900 flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-sm">
                    {index + 1}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: q.text }} className="mt-0.5" />
                </h3>
                <span className="text-sm font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  {q.marks} Marks
                </span>
              </div>
              
              {q.question_type === 'mcq' && (
                <div className="space-y-3 pl-9">
                  {['A', 'B', 'C', 'D'].map((optKey) => {
                    const optText = q[`option_${optKey.toLowerCase()}`];
                    if (!optText) return null;
                    return (
                      <label key={optKey} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                        <input type="radio" name={`q_${q.id}`} className="mt-1" />
                        <span className="text-sm text-gray-700">{optText}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {q.question_type !== 'mcq' && (
                <div className="pl-9 mt-4">
                  <textarea 
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm" 
                    rows={4} 
                    placeholder="Student answers here..."
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
