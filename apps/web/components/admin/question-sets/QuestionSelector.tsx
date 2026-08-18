import { useState, useEffect } from 'react';
import { adminQuestionApi, AdminQuestion } from '@/lib/api/admin-questions';
import { Search, Filter, Loader2, Plus } from 'lucide-react';

interface QuestionSelectorProps {
  onAdd: (questionIds: number[]) => void;
  existingIds: number[];
  subjectId?: number; // Pre-filter by subject
  unitId?: number;    // Pre-filter by unit
  topicId?: number;   // Pre-filter by topic
}

export function QuestionSelector({ onAdd, existingIds, subjectId, unitId, topicId }: QuestionSelectorProps) {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchQuestions();
  }, [search, subjectId, unitId, topicId]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const queryParams: any = { search };
      if (topicId) queryParams.topic = topicId;
      else if (unitId) queryParams.topic__unit = unitId;
      else if (subjectId) queryParams.topic__unit__subject = subjectId;

      const res = await adminQuestionApi.getQuestions(queryParams);
      setQuestions(res.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleAddSelected = () => {
    onAdd(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Master Question Bank</h3>
        {selectedIds.size > 0 && (
          <button 
            onClick={handleAddSelected}
            className="px-3 py-1.5 bg-[#0B2545] text-white text-sm rounded-lg hover:bg-[#163E6C] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add {selectedIds.size} Selected
          </button>
        )}
      </div>
      
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0B2545]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No questions found.
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map(q => {
              const isExisting = existingIds.includes(q.id);
              const isSelected = selectedIds.has(q.id);
              return (
                <div 
                  key={q.id}
                  onClick={() => !isExisting && toggleSelection(q.id)}
                  className={`p-3 rounded-lg border flex gap-3 transition-colors ${
                    isExisting ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' :
                    isSelected ? 'bg-blue-50 border-blue-200 cursor-pointer' :
                    'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}
                >
                  <input 
                    type="checkbox"
                    checked={isExisting || isSelected}
                    readOnly
                    className={`mt-1 rounded ${isExisting ? 'text-gray-400' : 'text-[#0B2545]'}`}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1" dangerouslySetInnerHTML={{ __html: q.text }}></div>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 rounded">{q.difficulty}</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded">{q.question_type.toUpperCase()}</span>
                      {isExisting && <span className="text-green-600 font-medium ml-2">Already in Set</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
