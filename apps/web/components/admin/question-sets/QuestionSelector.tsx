import { useState, useEffect, useCallback } from 'react';
import { adminQuestionApi, AdminQuestion } from '@/lib/api/admin-questions';
import { Search, Loader2, Plus, Shuffle, Lock } from 'lucide-react';

interface QuestionSelectorProps {
  onAdd: (questionIds: number[]) => void;
  existingIds: number[];
  subjectId?: number; // Pre-filter by subject
  unitId?: number;    // Pre-filter by chapter/unit
  topicId?: number;   // Pre-filter by topic
  /** Target size of the set, used to decide how many to draw in random mode. */
  totalQuestions?: number;
  /** Human name of the deepest syllabus level this set is scoped to. */
  scopeLabel?: string;
}

export function QuestionSelector({
  onAdd,
  existingIds,
  subjectId,
  unitId,
  topicId,
  totalQuestions,
  scopeLabel,
}: QuestionSelectorProps) {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Random mode takes over the picking entirely: it scopes to the set's own
  // syllabus, draws the number the set still needs, and locks manual controls
  // so the two modes can't fight each other.
  const [randomMode, setRandomMode] = useState(false);

  const hasScope = Boolean(topicId || unitId || subjectId);
  const remaining = Math.max(0, (totalQuestions || 0) - existingIds.length);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const queryParams: any = { page_size: 500 };
        // Search is a manual-mode tool; random mode always draws from the full
        // scoped pool so the draw isn't silently narrowed by a stale search box.
        if (!randomMode && search) queryParams.search = search;

        if (randomMode) {
          // Keys must match the viewset's filterset_fields, which follow
          // topic -> chapter -> subject.
          if (topicId) queryParams.topic = topicId;
          else if (unitId) queryParams.topic__chapter = unitId;
          else if (subjectId) queryParams.topic__chapter__subject = subjectId;
        }

        const res = await adminQuestionApi.getQuestions(queryParams);
        setQuestions(Array.isArray(res) ? res : (res.results || []));
      } catch (e) {
        console.error('Failed to load the question bank', e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [search, randomMode, subjectId, unitId, topicId]);

  // Questions already in the set can't be added again, so they're out of both
  // the manual selection and the random draw.
  const available = questions.filter(q => !existingIds.includes(q.id));

  /** Fisher-Yates over the available pool, then take the first N. */
  const drawRandom = useCallback((count: number, pool: AdminQuestion[]) => {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i] as AdminQuestion;
      shuffled[i] = shuffled[j] as AdminQuestion;
      shuffled[j] = temp;
    }
    return new Set(shuffled.slice(0, count).map(q => q.id));
  }, []);

  // Once the scoped pool has loaded in random mode, draw straight away so the
  // admin doesn't have to press anything to see what they'll get.
  useEffect(() => {
    if (!randomMode || loading) return;
    setSelectedIds(drawRandom(remaining, available));
    // `available` is derived and changes identity each render, so key the draw
    // off the things that actually change the pool.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [randomMode, loading, questions, remaining, drawRandom]);

  const toggleRandomMode = (on: boolean) => {
    setRandomMode(on);
    setSelectedIds(new Set());
    if (on) setSearch('');
  };

  const toggleSelection = (id: number) => {
    if (randomMode) return; // Manual picking is locked while random mode is on.
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleAddSelected = () => {
    onAdd(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const selectAllAvailable = () => setSelectedIds(new Set(available.map(q => q.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const shortfall = randomMode && remaining > available.length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Master Question Bank</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {loading ? 'Loading...' : `${available.length} available · ${selectedIds.size} selected`}
          </p>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleAddSelected}
            className="px-3 py-1.5 bg-[#0B2545] text-white text-sm rounded-lg hover:bg-[#163E6C] flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add {selectedIds.size} Selected
          </button>
        )}
      </div>

      {/* Mode switch */}
      <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/40">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={randomMode}
            onChange={(e) => toggleRandomMode(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-[#0B2545]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-gray-900">Select random questions</span>
            <span className="block text-xs text-gray-600 mt-0.5">
              {randomMode ? (
                <>
                  Picking <strong>{remaining}</strong> question{remaining === 1 ? '' : 's'} at random
                  {scopeLabel ? <> from <strong>{scopeLabel}</strong></> : ' from the whole bank'}.
                  Manual selection is locked.
                </>
              ) : (
                <>
                  Automatically draw the number this set still needs
                  {scopeLabel ? <> from {scopeLabel}</> : ''}, instead of ticking each one.
                </>
              )}
            </span>
          </span>
        </label>

        {randomMode && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
            <button
              onClick={() => setSelectedIds(drawRandom(remaining, available))}
              disabled={available.length === 0}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg flex items-center gap-2"
            >
              <Shuffle className="w-4 h-4" /> Shuffle again
            </button>
            {shortfall && (
              <span className="text-xs text-amber-700">
                Only {available.length} question{available.length === 1 ? '' : 's'} available here — the set needs {remaining}.
              </span>
            )}
            {remaining === 0 && (
              <span className="text-xs text-green-700">This set already has all the questions it needs.</span>
            )}
          </div>
        )}
      </div>

      {/* Manual controls, disabled while random mode is on */}
      <div className={`p-4 border-b border-gray-100 space-y-3 ${randomMode ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={randomMode}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#0B2545] disabled:bg-gray-50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={selectAllAvailable}
            disabled={randomMode || available.length === 0}
            className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm rounded-lg"
          >
            Select All
          </button>
          <button
            onClick={clearSelection}
            disabled={randomMode || selectedIds.size === 0}
            className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm rounded-lg"
          >
            Clear
          </button>
          {randomMode && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Lock className="w-3.5 h-3.5" /> Locked by random mode
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {randomMode && hasScope
              ? 'No questions found in this set’s syllabus scope.'
              : 'No questions found.'}
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map(q => {
              const isExisting = existingIds.includes(q.id);
              const isSelected = selectedIds.has(q.id);
              const locked = randomMode || isExisting;
              return (
                <div
                  key={q.id}
                  onClick={() => !locked && toggleSelection(q.id)}
                  className={`p-3 rounded-lg border flex gap-3 transition-colors ${
                    isExisting ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' :
                    isSelected ? 'bg-blue-50 border-blue-200' :
                    'bg-white border-gray-200'
                  } ${locked ? 'cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
                >
                  <input
                    type="checkbox"
                    checked={isExisting || isSelected}
                    readOnly
                    disabled={locked}
                    className={`mt-1 rounded ${isExisting ? 'text-gray-400' : 'text-[#0B2545]'}`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 mb-1">{q.text}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {q.question_id && <span className="px-2 py-0.5 bg-gray-100 rounded">{q.question_id}</span>}
                      <span className="px-2 py-0.5 bg-gray-100 rounded">{q.difficulty}</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded">{q.question_type?.toUpperCase()}</span>
                      {isExisting && <span className="text-green-600 font-medium ml-1">Already in Set</span>}
                      {!isExisting && isSelected && randomMode && (
                        <span className="text-blue-600 font-medium ml-1">Picked</span>
                      )}
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
