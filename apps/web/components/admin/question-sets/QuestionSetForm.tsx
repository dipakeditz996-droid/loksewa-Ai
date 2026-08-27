import { useState, useEffect } from 'react';
import { QuestionSet } from '@/lib/api/admin-question-sets';
import { adminSyllabusApi } from '@/lib/api/admin-syllabus';
import { AcademicDependentSelect } from '@/components/admin/syllabus/AcademicDependentSelect';

interface QuestionSetFormProps {
  initialData?: Partial<QuestionSet>;
  onChange: (data: Partial<QuestionSet>) => void;
  errors?: Record<string, string>;
}

export function QuestionSetForm({ initialData, onChange, errors = {} }: QuestionSetFormProps) {
  const [subjectsForMock, setSubjectsForMock] = useState<any[]>([]);

  const [data, setData] = useState<Partial<QuestionSet>>(initialData || {
    name: '',
    description: '',
    set_type: 'custom',
    category: undefined,
    exam: undefined,
    subject: undefined,
    unit: undefined,
    topic: undefined,
    subject_distribution: {},
    total_questions: 50,
    time_limit: 45,
    passing_marks: 25,
    total_marks: 50,
    marks_per_question: 1,
    negative_marking: true,
    negative_marking_value: 0.20,
    randomize_questions: true,
    randomize_options: true,
    status: 'draft',
    difficulty_distribution: { easy: 20, medium: 50, hard: 30 }
  });

  useEffect(() => {
    // Only fetch subjects for full_mock distribution
    if (data.set_type === 'full_mock' && data.exam) {
      adminSyllabusApi.getSubjects(data.exam).then(res => setSubjectsForMock(res));
    } else {
      setSubjectsForMock([]);
    }
  }, [data?.set_type, data?.exam]);

  const handleChange = (field: keyof QuestionSet, value: any) => {
    const newData = { ...data, [field]: value };
    // Reset child fields when parent changes
    if (field === 'set_type') {
      if (value === 'position' || value === 'full_mock') {
        newData.subject = undefined;
        newData.unit = undefined;
        newData.topic = undefined;
      }
      if (value === 'subject') {
        newData.unit = undefined;
        newData.topic = undefined;
      }
      if (value === 'chapter') {
        newData.topic = undefined;
      }
    }
    setData(newData);
    onChange(newData);
  };

  const handleAcademicChange = (field: string, value: any) => {
    let internalField: keyof QuestionSet = field as keyof QuestionSet;
    if (field === 'exam' || field === 'position') internalField = 'exam';
    if (field === 'unit' || field === 'chapter') internalField = 'unit';
    
    const newData = { ...data, [internalField]: value };
    
    if (internalField === 'category') {
      newData.exam = undefined;
      newData.subject = undefined;
      newData.unit = undefined;
      newData.topic = undefined;
    } else if (internalField === 'exam') {
      newData.subject = undefined;
      newData.unit = undefined;
      newData.topic = undefined;
    } else if (internalField === 'subject') {
      newData.unit = undefined;
      newData.topic = undefined;
    } else if (internalField === 'unit') {
      newData.topic = undefined;
    }

    setData(newData);
    onChange(newData);
  };

  const handleDifficultyChange = (level: 'easy'|'medium'|'hard', val: number) => {
    const dist = { ...data.difficulty_distribution, [level]: val };
    const newData = { ...data, difficulty_distribution: dist };
    setData(newData);
    onChange(newData);
  };

  const handleSubjectDistChange = (subjectId: number, count: number) => {
    const dist = { ...(data.subject_distribution || {}) };
    dist[subjectId.toString()] = count;
    const newData = { ...data, subject_distribution: dist };
    setData(newData);
    onChange(newData);
  };

  // Determine maxLevel based on set_type
  let maxLvl: 'category' | 'position' | 'subject' | 'chapter' | 'topic' = 'topic';
  if (data.set_type === 'full_mock' || data.set_type === 'position') maxLvl = 'position';
  if (data.set_type === 'subject') maxLvl = 'subject';
  if (data.set_type === 'chapter') maxLvl = 'chapter';

  return (
    <div className="space-y-8">
      {/* SECTION A: Basic Info */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Section A — Basic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Set Name *</label>
            <input
              type="text"
              value={data.name || ''}
              onChange={e => handleChange('name', e.target.value)}
              className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="e.g. Section Officer Model Exam Set 1"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={data.description || ''}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 h-24 bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium"
              placeholder="Optional description or instructions for this set"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Set Type *</label>
            <select
              value={data.set_type || 'custom'}
              onChange={e => handleChange('set_type', e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none"
            >
              <option value="custom">Custom Set</option>
              <option value="full_mock">Full Mock Set</option>
              <option value="position">Position-wise Set</option>
              <option value="subject">Subject Set</option>
              <option value="chapter">Chapter (Unit) Set</option>
              <option value="topic">Topic Set</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={data.status || 'draft'}
              onChange={e => handleChange('status', e.target.value as any)}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
           <AcademicDependentSelect
             category={data.category}
             position={data.exam}
             subject={data.subject}
             chapter={data.unit}
             topic={data.topic}
             onChange={handleAcademicChange}
             maxLevel={maxLvl}
             errors={errors}
           />
        </div>

        {data.set_type === 'full_mock' && data.exam && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Subject Distribution *</h3>
            <p className="text-xs text-gray-500 mb-4">Set the number of questions per subject for this full mock set.</p>
            {errors.subject_distribution && <p className="text-red-500 text-xs mb-3">{errors.subject_distribution}</p>}
            
            <div className="space-y-3">
              {subjectsForMock.map(s => (
                <div key={s.id} className="flex items-center gap-4">
                  <div className="flex-1 text-sm text-gray-700">{s.name}</div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={data.subject_distribution?.[s.id.toString()] || ''}
                    onChange={(e) => handleSubjectDistChange(s.id, parseInt(e.target.value) || 0)}
                    className="w-24 p-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0B2545] bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium"
                  />
                </div>
              ))}
              <div className="flex justify-end pt-2 text-sm font-medium text-gray-900 border-t border-gray-50">
                Total Allocated: {Object.values(data.subject_distribution || {}).reduce((a, b) => a + (Number(b) || 0), 0)} / {data.total_questions || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION B: Exam Config */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Section B — Exam Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions *</label>
            <input
              type="number"
              min="1"
              value={data.total_questions || ''}
              onChange={e => handleChange('total_questions', Number(e.target.value))}
              className={`w-full p-2.5 border rounded-lg focus:outline-none bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium ${errors.total_questions ? 'border-red-500' : 'border-gray-200'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (mins) *</label>
            <input
              type="number"
              min="1"
              value={data.time_limit || ''}
              onChange={e => handleChange('time_limit', Number(e.target.value))}
              className={`w-full p-2.5 border rounded-lg focus:outline-none bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium ${errors.time_limit ? 'border-red-500' : 'border-gray-200'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={data.total_marks || ''}
              onChange={e => handleChange('total_marks', Number(e.target.value))}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={data.passing_marks || ''}
              onChange={e => handleChange('passing_marks', Number(e.target.value))}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marks Per Question</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={data.marks_per_question || ''}
              onChange={e => handleChange('marks_per_question', Number(e.target.value))}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty % (E/M/H)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={data.difficulty_distribution?.easy ?? 20}
                onChange={e => handleDifficultyChange('easy', Number(e.target.value))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-center bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium"
                title="Easy %"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={data.difficulty_distribution?.medium ?? 50}
                onChange={e => handleDifficultyChange('medium', Number(e.target.value))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-center bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium"
                title="Medium %"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={data.difficulty_distribution?.hard ?? 30}
                onChange={e => handleDifficultyChange('hard', Number(e.target.value))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-center bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium"
                title="Hard %"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.negative_marking || false}
                onChange={e => handleChange('negative_marking', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#0B2545] focus:ring-[#0B2545]"
              />
              <div>
                <span className="block text-sm font-medium text-gray-900">Enable Negative Marking</span>
                <span className="text-xs text-gray-500">Deduct marks for incorrect answers</span>
              </div>
            </label>
            
            {data.negative_marking && (
              <div className="ml-8">
                <label className="block text-xs text-gray-600 mb-1">Negative Marking Value</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.negative_marking_value || ''}
                  onChange={e => handleChange('negative_marking_value', Number(e.target.value))}
                  className="w-32 p-2 border border-gray-200 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-600 placeholder:font-medium"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.randomize_questions || false}
                onChange={e => handleChange('randomize_questions', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#0B2545] focus:ring-[#0B2545]"
              />
              <div>
                <span className="block text-sm font-medium text-gray-900">Randomize Questions</span>
                <span className="text-xs text-gray-500">Shuffle question order for each student</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.randomize_options || false}
                onChange={e => handleChange('randomize_options', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#0B2545] focus:ring-[#0B2545]"
              />
              <div>
                <span className="block text-sm font-medium text-gray-900">Randomize Options</span>
                <span className="text-xs text-gray-500">Shuffle MCQ options A/B/C/D</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
