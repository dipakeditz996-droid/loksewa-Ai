import { useState, useEffect } from 'react';
import { adminExamApi, Examination } from '@/lib/api/admin-exams';
import { adminQuestionSetApi, QuestionSet } from '@/lib/api/admin-question-sets';
import { adminSyllabusApi } from '@/lib/api/admin-syllabus';
import { CheckCircle2, ChevronRight, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { AcademicDependentSelect } from '@/components/admin/syllabus/AcademicDependentSelect';

interface ExamFormProps {
  initialData?: Examination;
  isEdit?: boolean;
}

export function ExamForm({ initialData, isEdit = false }: ExamFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Partial<Examination>>(initialData || {
    exam_type: 'mock',
    time_limit: 60,
    total_marks: 100,
    passing_marks: 40,
    marks_per_question: 1,
    negative_marking: false,
    negative_marking_value: 0.2,
    max_attempts: 1,
    allow_resume: true,
    auto_submit: true,
    result_visibility: 'immediate',
    show_correct_answers: false,
    randomize_questions: false,
    randomize_options: false,
  });

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dropdown data
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);

  useEffect(() => {
    if (data.subject) adminQuestionSetApi.getQuestionSets({ subject: data.subject, status: 'published' }).then(res => setQuestionSets(res.results || []));
  }, [data.subject]);

  const handleChange = (field: keyof Examination, value: any) => {
    setData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-fill configuration when a Question Set is selected
      if (field === 'question_set' && value) {
        const selectedSet = questionSets.find(s => s.id === Number(value));
        if (selectedSet) {
          newData.total_questions = selectedSet.total_questions;
          newData.time_limit = selectedSet.time_limit;
          newData.total_marks = selectedSet.total_marks;
          newData.passing_marks = selectedSet.passing_marks;
          newData.marks_per_question = selectedSet.marks_per_question;
          newData.negative_marking = selectedSet.negative_marking;
          newData.negative_marking_value = selectedSet.negative_marking_value;
          newData.randomize_questions = selectedSet.randomize_questions;
          newData.randomize_options = selectedSet.randomize_options;
        }
      }
      return newData;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!data.title) newErrors.title = 'Title is required';
      if (!data.category) newErrors.category = 'Category is required';
      if (!data.exam) newErrors.exam = 'Position is required';
      if (!data.subject) newErrors.subject = 'Subject is required';
    }
    if (currentStep === 2) {
      if (!data.question_set) newErrors.question_set = 'Please select a Question Set';
    }
    if (currentStep === 3) {
      if (!data.total_questions || data.total_questions < 1) newErrors.total_questions = 'Required';
      if (!data.time_limit || data.time_limit < 1) newErrors.time_limit = 'Required';
      if (!data.total_marks || data.total_marks < 1) newErrors.total_marks = 'Required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleSave = async (publish: boolean) => {
    // Validate all steps before publish
    if (publish) {
      for (let i = 1; i <= 4; i++) {
        if (!validateStep(i)) {
          setStep(i);
          toast.error(`Please fix errors in Step ${i}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      let savedId = data.id;
      if (isEdit && savedId) {
        await adminExamApi.updateExam(savedId, data);
      } else {
        const res = await adminExamApi.createExam(data);
        savedId = res.id;
      }
      
      if (publish && savedId) {
        await adminExamApi.publishExam(savedId);
        toast.success('Exam published successfully!');
      } else {
        toast.success('Draft saved successfully!');
      }
      
      router.push('/admin-dashboard/academic/exams');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save exam');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Basic Info' },
    { num: 2, title: 'Question Set' },
    { num: 3, title: 'Configuration' },
    { num: 4, title: 'Attempt & Schedule' },
  ];

  return (
    <div className="space-y-8">
      {/* Stepper Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm overflow-x-auto hide-scrollbar">
        <div className="flex items-center justify-between min-w-[600px] max-w-4xl mx-auto">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div 
                className={`flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                  step === s.num ? 'text-blue-600' : step > s.num ? 'text-green-600' : 'text-gray-400'
                }`}
                onClick={() => {
                  if (s.num < step || validateStep(step)) setStep(s.num);
                }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                  step === s.num ? 'border-blue-600 bg-blue-50 text-blue-600' : 
                  step > s.num ? 'border-green-600 bg-green-50 text-green-600' : 
                  'border-gray-200 bg-gray-50'
                }`}>
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span className="text-xs font-medium uppercase tracking-wider">{s.title}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-16 sm:w-24 h-0.5 mx-2 sm:mx-4 ${step > s.num ? 'bg-green-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
        {step === 1 && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Step 1: Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title *</label>
                <input 
                  type="text" 
                  value={data.title || ''} 
                  onChange={e => handleChange('title', e.target.value)}
                  className={`w-full p-2.5 border rounded-lg ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g., Section Officer Mock Test 1"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                <select 
                  value={data.exam_type} 
                  onChange={e => handleChange('exam_type', e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg"
                >
                  <option value="mock">Mock Test</option>
                  <option value="practice">Practice Test</option>
                  <option value="full">Full-Length Exam</option>
                  <option value="position">Position-Based Exam</option>
                  <option value="subject">Subject Test</option>
                  <option value="custom">Custom Exam</option>
                </select>
              </div>

              <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-100">
                <AcademicDependentSelect
                  category={data.category?.toString()}
                  position={data.exam?.toString()}
                  subject={data.subject?.toString()}
                  onChange={(field, val) => {
                    let newData = { ...data };
                    if (field === 'category') {
                      newData.category = val;
                      newData.exam = undefined;
                      newData.subject = undefined;
                    } else if (field === 'position') {
                      newData.exam = val;
                      newData.subject = undefined;
                    } else if (field === 'subject') {
                      newData.subject = val;
                    }
                    setData(newData);
                    
                    if (errors[field === 'position' ? 'exam' : field]) {
                      setErrors({ ...errors, [field === 'position' ? 'exam' : field]: '' });
                    }
                  }}
                  maxLevel="subject"
                  errors={{
                    category: errors.category || '',
                    position: errors.exam || '',
                    subject: errors.subject || ''
                  }}
                  layout="grid"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea 
                  value={data.instructions || ''} 
                  onChange={e => handleChange('instructions', e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg"
                  rows={4}
                  placeholder="Enter specific instructions for the students..."
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Step 2: Question Set Selection</h2>
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 border border-blue-100 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">
                Select an existing <strong>Published</strong> Question Set. The questions inside the set will be linked to this exam without duplicating them.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Question Set *</label>
              <select 
                value={data.question_set || ''} 
                onChange={e => handleChange('question_set', Number(e.target.value))}
                className={`w-full p-3 border rounded-lg bg-gray-50 ${errors.question_set ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">-- Choose a Question Set --</option>
                {questionSets.map(qs => (
                  <option key={qs.id} value={qs.id}>{qs.name} ({qs.total_questions} Qs, {qs.total_marks} Marks)</option>
                ))}
              </select>
              {errors.question_set && <p className="text-red-500 text-xs mt-1">{errors.question_set}</p>}
            </div>

            {data.question_set && (
              <div className="mt-8 p-6 border border-green-200 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">Set Selected Successfully</h3>
                </div>
                <p className="text-sm text-green-700 mb-2">The configuration settings (Marks, Time Limit) have been auto-filled for Step 3 based on this Question Set's defaults. You can override them in the next step if needed.</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
             <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Step 3: Exam Configuration</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions</label>
                  <input type="number" value={data.total_questions || 0} onChange={e => handleChange('total_questions', Number(e.target.value))} className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-100" readOnly />
                  <p className="text-xs text-gray-500 mt-1">Derived from Question Set.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (Minutes) *</label>
                  <input type="number" value={data.time_limit || 0} onChange={e => handleChange('time_limit', Number(e.target.value))} className={`w-full p-2.5 border rounded-lg ${errors.time_limit ? 'border-red-500' : 'border-gray-300'}`} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks *</label>
                  <input type="number" value={data.total_marks || 0} onChange={e => handleChange('total_marks', Number(e.target.value))} className="w-full p-2.5 border border-gray-300 rounded-lg" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label>
                  <input type="number" value={data.passing_marks || 0} onChange={e => handleChange('passing_marks', Number(e.target.value))} className="w-full p-2.5 border border-gray-300 rounded-lg" />
                </div>
             </div>
             
             <hr className="border-gray-100" />
             
             <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={data.negative_marking || false} onChange={e => handleChange('negative_marking', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Enable Negative Marking</span>
                </label>
                
                {data.negative_marking && (
                  <div className="pl-7">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Penalty (Marks deducted per wrong answer)</label>
                    <input type="number" step="0.01" value={data.negative_marking_value || 0} onChange={e => handleChange('negative_marking_value', Number(e.target.value))} className="w-full md:w-1/2 p-2.5 border border-gray-300 rounded-lg" />
                  </div>
                )}
             </div>

             <div className="space-y-4 pt-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={data.randomize_questions || false} onChange={e => handleChange('randomize_questions', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Randomize Question Order for Students</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={data.randomize_options || false} onChange={e => handleChange('randomize_options', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Randomize MCQ Options for Students</span>
                </label>
             </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
             <h2 className="text-xl font-bold text-gray-900 border-b pb-3">Step 4: Attempt & Schedule</h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts per Student</label>
                  <select value={data.max_attempts} onChange={e => handleChange('max_attempts', Number(e.target.value))} className="w-full p-2.5 border border-gray-300 rounded-lg">
                    <option value={1}>1 Attempt</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                    <option value={0}>Unlimited</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result Visibility</label>
                  <select value={data.result_visibility} onChange={e => handleChange('result_visibility', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg">
                    <option value="immediate">Immediately After Submission</option>
                    <option value="after_end">After Exam End Time</option>
                    <option value="manual">Manual Release</option>
                  </select>
                </div>
             </div>

             <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={data.allow_resume || false} onChange={e => handleChange('allow_resume', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Allow Resume (Auto-saving answers)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={data.auto_submit || false} onChange={e => handleChange('auto_submit', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Auto Submit when time ends</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={data.show_correct_answers || false} onChange={e => handleChange('show_correct_answers', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Show correct answers in result</span>
                </label>
             </div>

             <hr className="border-gray-100" />
             <h3 className="font-semibold text-gray-900">Scheduling (Optional)</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                  <input type="datetime-local" value={data.start_time ? new Date(data.start_time).toISOString().slice(0, 16) : ''} onChange={e => handleChange('start_time', new Date(e.target.value).toISOString())} className="w-full p-2.5 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                  <input type="datetime-local" value={data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : ''} onChange={e => handleChange('end_time', new Date(e.target.value).toISOString())} className="w-full p-2.5 border border-gray-300 rounded-lg" />
                </div>
             </div>
             <p className="text-sm text-gray-500">If no schedule is set, publishing the exam will make it instantly Live.</p>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.push('/admin-dashboard/academic/exams')}
          className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
        >
          {step > 1 ? 'Back' : 'Cancel'}
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={loading}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          
          {step < 4 ? (
            <button
              onClick={nextStep}
              className="px-6 py-2.5 bg-[#0B2545] text-white font-medium hover:bg-[#163E6C] rounded-lg transition-colors flex items-center gap-2"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 text-white font-medium hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Publish Exam
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
