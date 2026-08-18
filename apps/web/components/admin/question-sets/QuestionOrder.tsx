import { useState } from 'react';
import { QuestionSetQuestion } from '@/lib/api/admin-question-sets';
import { GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface QuestionOrderProps {
  questions: QuestionSetQuestion[];
  onReorder: (newOrder: QuestionSetQuestion[]) => void;
  onRemove: (id: number) => void;
  readOnly?: boolean;
}

export function QuestionOrder({ questions, onReorder, onRemove, readOnly = false }: QuestionOrderProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx > 0) {
      const newItems = [...questions];
      const temp = newItems[idx - 1];
      newItems[idx - 1] = newItems[idx] as QuestionSetQuestion;
      newItems[idx] = temp as QuestionSetQuestion;
      onReorder(newItems);
    } else if (direction === 'down' && idx < questions.length - 1) {
      const newItems = [...questions];
      const temp = newItems[idx + 1];
      newItems[idx + 1] = newItems[idx] as QuestionSetQuestion;
      newItems[idx] = temp as QuestionSetQuestion;
      onReorder(newItems);
    }
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;

    const newItems = [...questions];
    const item = newItems.splice(draggedIdx, 1)[0] as QuestionSetQuestion;
    newItems.splice(idx, 0, item);
    
    setDraggedIdx(idx);
    onReorder(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  if (questions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        No questions added yet. Add from the Master Question Bank or generate via AI.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((q, idx) => (
        <div 
          key={q.question}
          draggable={!readOnly}
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-4 p-3 bg-white rounded-lg border transition-all ${
            draggedIdx === idx ? 'border-[#0B2545] shadow-md opacity-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {!readOnly && (
            <div className="cursor-grab text-gray-400 hover:text-gray-600">
              <GripVertical className="w-5 h-5" />
            </div>
          )}
          
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 shrink-0">
            {idx + 1}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate" dangerouslySetInnerHTML={{ __html: q.question_details?.text || `Question ${q.question}` }}></div>
            <div className="flex gap-2 text-xs text-gray-500 mt-1">
              <span className="capitalize">{q.question_details?.difficulty || 'Unknown'}</span>
              <span>•</span>
              <span className="uppercase">{q.question_details?.question_type || 'Unknown'}</span>
            </div>
          </div>

          <div className="text-sm font-medium text-gray-700 w-16 text-right">
            {q.marks} m
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1">
              <div className="flex flex-col">
                <button 
                  onClick={() => moveQuestion(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => moveQuestion(idx, 'down')}
                  disabled={idx === questions.length - 1}
                  className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
              <button 
                onClick={() => onRemove(q.question)}
                className="p-2 ml-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove Question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
