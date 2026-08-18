import { useState } from 'react';
import { adminQuestionSetApi, QuestionSet } from '@/lib/api/admin-question-sets';
import { AdminQuestion } from '@/lib/api/admin-questions';
import { Sparkles, Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AiSetGeneratorProps {
  questionSetId: number;
  distribution: { easy?: number; medium?: number; hard?: number };
  onAccept: (questionIds: number[]) => void;
  onCancel: () => void;
}

export function AiSetGenerator({ questionSetId, distribution, onAccept, onCancel }: AiSetGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<AdminQuestion[]>([]);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminQuestionSetApi.generateQuestions(questionSetId);
      if (res.error) {
        setError(res.error);
      } else if (res.preview_questions) {
        setPreview(res.preview_questions);
        toast.success(`Successfully found ${res.generated_count} questions.`);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-[#0B2545] to-[#163E6C] text-white">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            AI Question Generator
          </h2>
          <p className="text-sm text-blue-100 mt-1">
            Generate a balanced question set based on your difficulty distribution:
            <span className="font-medium ml-1">E: {distribution.easy}%, M: {distribution.medium}%, H: {distribution.hard}%</span>
          </p>
        </div>
        <button onClick={onCancel} className="text-white/70 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex gap-3 items-start border border-red-100">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Generation Failed</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {preview.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-[#0B2545]" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Generate</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              The AI will select the most appropriate questions from the Master Question Bank that match your subject and difficulty criteria.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-3 bg-[#0B2545] text-white rounded-lg font-medium hover:bg-[#163E6C] transition-colors disabled:opacity-70 flex items-center gap-2 mx-auto"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading ? 'Generating...' : 'Start Generation'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900">Generated Preview ({preview.length} questions)</h3>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCwIcon />} Regenerate
              </button>
            </div>
            
            <div className="space-y-3">
              {preview.map((q, i) => (
                <div key={q.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex gap-4">
                  <div className="w-6 h-6 rounded bg-[#0B2545] text-white flex items-center justify-center text-xs font-medium shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900" dangerouslySetInnerHTML={{ __html: q.text }}></div>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-white border border-gray-200 text-xs text-gray-600 rounded">
                        {q.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
          >
            Discard
          </button>
          <button
            onClick={() => onAccept(preview.map(q => q.id))}
            className="px-6 py-2 bg-[#0B2545] text-white rounded-lg hover:bg-[#163E6C] font-medium flex items-center gap-2 transition-colors"
          >
            <Check className="w-4 h-4" />
            Accept & Add to Set
          </button>
        </div>
      )}
    </div>
  );
}

function RefreshCwIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  );
}
