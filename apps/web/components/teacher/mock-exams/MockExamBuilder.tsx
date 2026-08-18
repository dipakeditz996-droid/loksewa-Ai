"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { teacherMockExamsApi, MockExam, MockExamQuestion } from "@/lib/api/teacher-mock-exams";
import { getQuestions, QuestionData as Question } from "@/lib/api/teacher-questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { 
  ChevronRight, ChevronLeft, Save, Play, Send, 
  Search, BookOpen, Clock, AlertCircle, FileText, 
  CheckCircle, GripVertical, Trash2
} from "lucide-react";

interface MockExamBuilderProps {
  initialData?: MockExam;
  mode: "create" | "edit";
}

export function MockExamBuilder({ initialData, mode }: MockExamBuilderProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [examId, setExamId] = useState<number | null>(initialData?.id || null);
  const [formData, setFormData] = useState<Partial<MockExam>>(initialData || {
    title: "",
    description: "",
    exam_type: "mock",
    time_limit: 60,
    total_marks: 100,
    passing_marks: 40,
    marks_per_question: 1,
    negative_marking: true,
    negative_marking_value: 0.20,
    max_attempts: 1,
    allow_resume: true,
    auto_submit: true,
    result_visibility: "immediate",
    show_correct_answers: false,
    randomize_questions: false,
    randomize_options: false,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<MockExamQuestion[]>(initialData?.questions_list || []);
  const [searchQuery, setSearchQuery] = useState("");

  const examTypes = [
    { value: "mock", label: "Mock Test" },
    { value: "practice", label: "Practice Test" },
    { value: "full", label: "Full-Length Exam" },
    { value: "subject", label: "Subject Test" },
  ];

  useEffect(() => {
    if (currentStep === 2) {
      loadQuestionBank();
    }
  }, [currentStep]);

  const loadQuestionBank = async () => {
    try {
      const data = await getQuestions({ page_size: 100 });
      setQuestions(data.results.filter((q: any) => q.status === "approved"));
    } catch (error) {
      toast.error("Failed to load question bank");
    }
  };

  const saveExamDetails = async () => {
    if (!formData.title) {
      toast.error("Title is required");
      return false;
    }
    
    setLoading(true);
    try {
      let savedExam;
      if (examId) {
        savedExam = await teacherMockExamsApi.update(examId, formData);
        toast.success("Exam details updated");
      } else {
        savedExam = await teacherMockExamsApi.create(formData);
        setExamId(savedExam.id);
        toast.success("Exam created successfully");
      }
      setFormData(savedExam);
      return true;
    } catch (error) {
      toast.error("Failed to save exam details");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 || currentStep === 3) {
      const success = await saveExamDetails();
      if (!success) return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleAddQuestion = async (q: Question) => {
    if (!examId) return;
    if (selectedQuestions.some(sq => sq.question === q.id)) {
      toast.error("Question already added");
      return;
    }
    try {
      await teacherMockExamsApi.addQuestions(examId, [q.id], formData.marks_per_question || 1);
      const updatedExam = await teacherMockExamsApi.getById(examId);
      setSelectedQuestions(updatedExam.questions_list || []);
      setFormData(updatedExam);
      toast.success("Question added");
    } catch (error) {
      toast.error("Failed to add question");
    }
  };

  const handleRemoveQuestion = async (questionId: number) => {
    if (!examId) return;
    try {
      await teacherMockExamsApi.removeQuestion(examId, questionId);
      const updatedExam = await teacherMockExamsApi.getById(examId);
      setSelectedQuestions(updatedExam.questions_list || []);
      setFormData(updatedExam);
      toast.success("Question removed");
    } catch (error) {
      toast.error("Failed to remove question");
    }
  };

  const handleSubmit = async () => {
    if (!examId) return;
    setLoading(true);
    try {
      await teacherMockExamsApi.submitReview(examId);
      toast.success("Exam submitted for review!");
      router.push("/teacher/mock-exams");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to submit exam");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Basic Information</h2>
        <p className="text-sm text-slate-500">Define the core scope of your examination.</p>
      </div>
      <div className="space-y-4 max-w-2xl">
        <div className="space-y-2">
          <Label>Exam Title</Label>
          <Input 
            value={formData.title || ""} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
            placeholder="e.g., Section Officer Model Exam 2081"
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea 
            value={formData.description || ""} 
            onChange={e => setFormData({...formData, description: e.target.value})} 
            placeholder="Brief description about the exam..."
            rows={4}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Exam Type</Label>
            <Select 
              value={formData.exam_type || "mock"} 
              onValueChange={(val) => setFormData({...formData, exam_type: val})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {examTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category (Optional)</Label>
            <Input 
              type="number"
              placeholder="Category ID"
              value={formData.category || ""} 
              onChange={e => setFormData({...formData, category: parseInt(e.target.value) || 1})} 
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in h-full flex flex-col">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Question Builder</h2>
        <p className="text-sm text-slate-500">Select and organize questions from the Central Question Bank.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
        <div className="border rounded-xl bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-blue-600" /> Question Bank
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search questions..." 
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {questions
              .filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(q => (
              <div key={q.id} className="p-3 border rounded-lg hover:border-blue-300 transition-colors group">
                <div className="flex justify-between items-start gap-4">
                  <div className="text-sm text-slate-700 line-clamp-2" dangerouslySetInnerHTML={{__html: q.text}} />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="shrink-0"
                    onClick={() => handleAddQuestion(q)}
                    disabled={selectedQuestions.some(sq => sq.question === q.id)}
                  >
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-xl bg-slate-50 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-white flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" /> Selected Questions
            </h3>
            <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {selectedQuestions.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {selectedQuestions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No questions added yet.</div>
            ) : (
              selectedQuestions.sort((a, b) => a.order - b.order).map((sq, idx) => (
                <div key={sq.id} className="p-3 bg-white border rounded-lg flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 text-sm text-slate-700 truncate" dangerouslySetInnerHTML={{__html: sq.question_detail?.text || ""}} />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                    onClick={() => handleRemoveQuestion(sq.question)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 animate-in fade-in max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Exam Configuration</h2>
        <p className="text-sm text-slate-500">Configure timing, scoring, and behavior rules.</p>
      </div>
      
      <div className="border rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b flex items-center gap-2 font-medium text-slate-700">
          <Clock className="w-4 h-4 text-slate-500"/> Timing & Scheduling
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          <div className="space-y-2">
            <Label>Time Limit (minutes)</Label>
            <Input 
              type="number" 
              value={formData.time_limit} 
              onChange={e => setFormData({...formData, time_limit: parseInt(e.target.value) || 0})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum Attempts</Label>
            <Input 
              type="number" 
              value={formData.max_attempts} 
              onChange={e => setFormData({...formData, max_attempts: parseInt(e.target.value) || 1})} 
            />
          </div>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b flex items-center gap-2 font-medium text-slate-700">
          <CheckCircle className="w-4 h-4 text-slate-500"/> Scoring & Marking
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          <div className="space-y-2">
            <Label>Marks per Question</Label>
            <Input 
              type="number" 
              step="0.5"
              value={formData.marks_per_question} 
              onChange={e => setFormData({...formData, marks_per_question: parseFloat(e.target.value) || 1})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Total Marks</Label>
            <Input 
              type="number" 
              value={formData.total_marks} 
              onChange={e => setFormData({...formData, total_marks: parseFloat(e.target.value) || 0})} 
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Enable Negative Marking</Label>
              <Switch 
                checked={formData.negative_marking} 
                onCheckedChange={val => setFormData({...formData, negative_marking: val})} 
              />
            </div>
            {formData.negative_marking && (
              <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                <Label>Penalty Value (e.g. 0.20)</Label>
                <Input 
                  type="number" 
                  step="0.05"
                  value={formData.negative_marking_value} 
                  onChange={e => setFormData({...formData, negative_marking_value: parseFloat(e.target.value) || 0})} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-in fade-in h-full flex flex-col">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Student Preview</h2>
        <p className="text-sm text-slate-500">Experience the exam exactly as your students will see it.</p>
      </div>
      
      <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden flex flex-col border shadow-2xl relative">
        <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700 text-white">
          <div className="font-semibold">{formData.title}</div>
          <div className="bg-slate-700 px-3 py-1 rounded text-sm font-mono flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400"/> {formData.time_limit}:00
          </div>
        </div>
        <div className="flex-1 p-8 overflow-y-auto bg-slate-50 flex justify-center">
          <div className="max-w-2xl w-full">
            {selectedQuestions.length > 0 ? (
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-6">
                  <div className="text-lg font-medium text-slate-900 mb-6" dangerouslySetInnerHTML={{__html: selectedQuestions[0]?.question_detail?.text || ""}} />
                  <div className="space-y-3">
                    {['option_a', 'option_b', 'option_c', 'option_d'].map((opt, i) => {
                      const optText = (selectedQuestions[0]?.question_detail as any)?.[opt];
                      if (!optText) return null;
                      return (
                        <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer">
                          <div className="w-5 h-5 rounded-full border border-slate-300" />
                          <span className="text-slate-700 text-sm">{optText}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center p-12 text-slate-500 bg-white rounded-xl border">
                No questions added to preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Review & Submit</h2>
        <p className="text-slate-500 mt-2">Your mock exam is ready. Review the details below before submitting.</p>
      </div>
      
      <div className="flex gap-4 pt-4">
        <Button variant="outline" className="w-full" onClick={() => router.push('/teacher/mock-exams')}>
          Save as Draft & Exit
        </Button>
        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={loading || selectedQuestions.length === 0}>
          {loading ? "Submitting..." : "Submit for Admin Review"}
        </Button>
      </div>
    </div>
  );

  const steps = [
    { id: 1, name: "Basic Info" },
    { id: 2, name: "Questions" },
    { id: 3, name: "Configuration" },
    { id: 4, name: "Preview" },
    { id: 5, name: "Submit" },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 bg-white">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{mode === "create" ? "Create Mock Exam" : `Edit: ${initialData?.title}`}</h1>
        </div>
        <Button variant="outline" onClick={saveExamDetails} disabled={loading || !examId}>Save Draft</Button>
      </div>

      <div className="bg-slate-50 border-b px-8 py-4 flex justify-center">
        <div className="flex items-center max-w-3xl w-full justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 -z-10 transition-all duration-500" 
               style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }} />
          
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2 cursor-pointer" onClick={() => { if (examId || step.id === 1) setCurrentStep(step.id); }}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition-colors border-2 ${currentStep === step.id ? "bg-blue-600 text-white border-blue-600 shadow-md" : currentStep > step.id ? "bg-blue-100 text-blue-700 border-blue-100" : "bg-white text-slate-400 border-slate-200"}`}>
                {currentStep > step.id ? <CheckCircle className="w-4 h-4" /> : step.id}
              </div>
              <span className={`text-xs font-medium ${currentStep === step.id ? "text-blue-700" : "text-slate-500"}`}>{step.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
        <div className="max-w-6xl mx-auto h-full">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>
      </div>

      <div className="border-t px-6 py-4 bg-white flex justify-between items-center sticky bottom-0 z-10">
        <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 1} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        {currentStep < 5 && (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={handleNext}>
            Next Step <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
