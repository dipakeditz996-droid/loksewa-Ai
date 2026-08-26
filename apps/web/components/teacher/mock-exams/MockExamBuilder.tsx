// @ts-nocheck
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
  const [taxonomy, setTaxonomy] = useState<any[]>([]);
  const [builderMode, setBuilderMode] = useState<"manual" | "auto">("manual");
  const [autoGenConfig, setAutoGenConfig] = useState({
    easy: 0,
    medium: 0,
    hard: 0,
  });

  const examTypes = [
    { value: "mock", label: "Mock Test" },
    { value: "practice", label: "Practice Test" },
    { value: "full", label: "Full-Length Exam" },
    { value: "subject", label: "Subject Test" },
  ];

  useEffect(() => {
    fetchTaxonomy();
  }, []);

  const fetchTaxonomy = async () => {
    try {
      const data = await teacherMockExamsApi.getTaxonomy();
      setTaxonomy(data);
    } catch (error) {
      console.error("Failed to fetch taxonomy:", error);
    }
  };

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

  const handleReorder = async (questionId: number, direction: 'up' | 'down') => {
    if (!examId) return;
    const sorted = [...selectedQuestions].sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex(q => q.question === questionId);
    
    if (direction === 'up' && currentIndex > 0) {
      // Swap with previous
      const tempOrder = sorted[currentIndex].order;
      sorted[currentIndex].order = sorted[currentIndex - 1].order;
      sorted[currentIndex - 1].order = tempOrder;
    } else if (direction === 'down' && currentIndex < sorted.length - 1) {
      // Swap with next
      const tempOrder = sorted[currentIndex].order;
      sorted[currentIndex].order = sorted[currentIndex + 1].order;
      sorted[currentIndex + 1].order = tempOrder;
    } else {
      return;
    }

    const orderData = sorted.map(sq => ({ question_id: sq.question, order: sq.order }));
    
    try {
      await teacherMockExamsApi.reorderQuestions(examId, orderData);
      setSelectedQuestions(sorted);
    } catch (error) {
      toast.error("Failed to reorder");
    }
  };

  const handleAutoGenerate = async () => {
    if (!examId) return;
    const total = autoGenConfig.easy + autoGenConfig.medium + autoGenConfig.hard;
    if (total === 0) {
      toast.error("Please specify at least one question to generate");
      return;
    }
    setLoading(true);
    try {
      const result = await teacherMockExamsApi.autoGenerate(examId, {
        subject_id: formData.subject,
        counts: autoGenConfig
      });
      toast.success(result.status);
      const updatedExam = await teacherMockExamsApi.getById(examId);
      setSelectedQuestions(updatedExam.questions_list || []);
      setFormData(updatedExam);
    } catch (error) {
      toast.error("Failed to auto-generate questions");
    } finally {
      setLoading(false);
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
            <Label>Category</Label>
            <Select 
              value={formData.category?.toString() || ""} 
              onValueChange={(val) => {
                setFormData({
                  ...formData, 
                  category: parseInt(val), 
                  exam: undefined, 
                  subject: undefined 
                });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
              <SelectContent>
                {taxonomy.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Exam / Position</Label>
            <Select 
              value={formData.exam?.toString() || ""} 
              onValueChange={(val) => {
                setFormData({
                  ...formData, 
                  exam: parseInt(val), 
                  subject: undefined 
                });
              }}
              disabled={!formData.category}
            >
              <SelectTrigger><SelectValue placeholder="Select Position" /></SelectTrigger>
              <SelectContent>
                {(taxonomy.find(c => c.id === formData.category)?.exams || []).map((ex: any) => (
                  <SelectItem key={ex.id} value={ex.id.toString()}>{ex.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject (Optional)</Label>
            <Select 
              value={formData.subject?.toString() || "none"} 
              onValueChange={(val) => setFormData({...formData, subject: val === "none" ? undefined : parseInt(val)})}
              disabled={!formData.exam}
            >
              <SelectTrigger><SelectValue placeholder="Select Subject (Optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Specific Subject</SelectItem>
                {(taxonomy.find(c => c.id === formData.category)?.exams.find((e: any) => e.id === formData.exam)?.subjects || []).map((sub: any) => (
                  <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Question Builder</h2>
          <p className="text-sm text-slate-500">Select and organize questions from the Central Question Bank.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <Button 
            variant={builderMode === "manual" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setBuilderMode("manual")}
            className={builderMode === "manual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}
          >
            Manual Selection
          </Button>
          <Button 
            variant={builderMode === "auto" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setBuilderMode("auto")}
            className={builderMode === "auto" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}
          >
            Auto-Generate
          </Button>
        </div>
      </div>
      
      {builderMode === "auto" && (
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Auto-Generate Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <Label>Easy Questions</Label>
                <Input 
                  type="number" 
                  min="0" 
                  value={autoGenConfig.easy} 
                  onChange={(e) => setAutoGenConfig({...autoGenConfig, easy: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Medium Questions</Label>
                <Input 
                  type="number" 
                  min="0" 
                  value={autoGenConfig.medium} 
                  onChange={(e) => setAutoGenConfig({...autoGenConfig, medium: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Hard Questions</Label>
                <Input 
                  type="number" 
                  min="0" 
                  value={autoGenConfig.hard} 
                  onChange={(e) => setAutoGenConfig({...autoGenConfig, hard: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <Button onClick={handleAutoGenerate} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Generating..." : "Generate Questions"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
        {builderMode === "manual" && (
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
        )}

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
              selectedQuestions.sort((a, b) => a.order - b.order).map((sq, idx, arr) => (
                <div key={sq.id} className="p-3 bg-white border rounded-lg flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 text-sm text-slate-700 truncate" dangerouslySetInnerHTML={{__html: sq.question_detail?.text || ""}} />
                  <div className="flex gap-1 shrink-0">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-slate-400 hover:bg-slate-100"
                      onClick={() => handleReorder(sq.question, 'up')}
                      disabled={idx === 0}
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.14645 2.14645C7.34171 1.95118 7.65829 1.95118 7.85355 2.14645L11.8536 6.14645C12.0488 6.34171 12.0488 6.65829 11.8536 6.85355C11.6583 7.04882 11.3417 7.04882 11.1464 6.85355L8 3.70711L8 12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5L7 3.70711L3.85355 6.85355C3.65829 7.04882 3.34171 7.04882 3.14645 6.85355C2.95118 6.65829 2.95118 6.34171 3.14645 6.14645L7.14645 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-slate-400 hover:bg-slate-100"
                      onClick={() => handleReorder(sq.question, 'down')}
                      disabled={idx === arr.length - 1}
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.14645 12.8536C7.34171 13.0488 7.65829 13.0488 7.85355 12.8536L11.8536 8.85355C12.0488 8.65829 12.0488 8.34171 11.8536 8.14645C11.6583 7.95118 11.3417 7.95118 11.1464 8.14645L8 11.2929L8 2.5C8 2.22386 7.77614 2 7.5 2C7.22386 2 7 2.22386 7 2.5L7 11.2929L3.85355 8.14645C3.65829 7.95118 3.34171 7.95118 3.14645 8.14645C2.95118 8.34171 2.95118 8.65829 3.14645 8.85355L7.14645 12.8536Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-red-500 hover:bg-red-50"
                      onClick={() => handleRemoveQuestion(sq.question)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
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
            <Label>Maximum Attempts (0 for unlimited)</Label>
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
              <Label className="cursor-pointer text-slate-700 font-medium">Enable Negative Marking</Label>
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

      <div className="border rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b flex items-center gap-2 font-medium text-slate-700">
          <AlertCircle className="w-4 h-4 text-slate-500"/> Exam Behavior & Results
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          <div className="space-y-2">
            <Label>Result Visibility</Label>
            <Select 
              value={formData.result_visibility || "immediate"} 
              onValueChange={(val) => setFormData({...formData, result_visibility: val})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate (After submission)</SelectItem>
                <SelectItem value="later">Later (Manual release)</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer text-slate-700 font-medium">Show Correct Answers</Label>
              <Switch 
                checked={formData.show_correct_answers} 
                onCheckedChange={val => setFormData({...formData, show_correct_answers: val})} 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer text-slate-700 font-medium">Randomize Questions</Label>
              <Switch 
                checked={formData.randomize_questions} 
                onCheckedChange={val => setFormData({...formData, randomize_questions: val})} 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer text-slate-700 font-medium">Randomize Options</Label>
              <Switch 
                checked={formData.randomize_options} 
                onCheckedChange={val => setFormData({...formData, randomize_options: val})} 
              />
            </div>
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
        {/* Mock Browser Header */}
        <div className="bg-slate-800 p-3 flex items-center gap-3 border-b border-slate-700">
          <div className="flex gap-1.5 ml-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="bg-slate-700/50 rounded-md px-3 py-1 text-xs text-slate-400 font-medium flex-1 text-center font-mono">
            loksewa.ai/exam/{formData.title?.toLowerCase().replace(/\s+/g, '-')}
          </div>
        </div>

        {/* Exam Header */}
        <div className="bg-white p-4 flex justify-between items-center border-b border-slate-200">
          <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs">LOK</span>
            {formData.title || "Untitled Exam"}
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-md font-mono font-bold flex items-center gap-2">
              <Clock className="w-4 h-4"/> 
              {String(Math.floor((formData.time_limit || 60) - 1)).padStart(2, '0')}:59
            </div>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">Submit Exam</Button>
          </div>
        </div>
        
        {/* Exam Body */}
        <div className="flex-1 overflow-hidden flex bg-slate-50">
          {/* Main Question Area */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
              {selectedQuestions.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 relative">
                  <div className="absolute top-0 right-0 bg-blue-50 text-blue-700 font-medium text-xs px-3 py-1 rounded-bl-lg rounded-tr-xl border-l border-b border-blue-100">
                    Question 1 of {selectedQuestions.length}
                  </div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div>
                        <div className="text-lg font-medium text-slate-800 mb-6" dangerouslySetInnerHTML={{__html: selectedQuestions[0]?.question_detail?.text || "Question text will appear here."}} />
                        <div className="space-y-3 mt-4">
                          {['option_a', 'option_b', 'option_c', 'option_d'].map((opt, i) => {
                            const optText = (selectedQuestions[0]?.question_detail as any)?.[opt];
                            if (!optText) return null;
                            const isSelected = i === 0; // Just mock the first option as selected
                            return (
                              <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-600' : 'border-slate-300'}`}>
                                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                                </div>
                                <span className={`text-sm ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>{optText}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-500 font-medium text-sm text-right shrink-0">
                      <div>Marks: <span className="text-green-600">+{formData.marks_per_question}</span></div>
                      {formData.negative_marking && <div>Penalty: <span className="text-red-500">-{formData.negative_marking_value}</span></div>}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-100">
                    <Button variant="outline" disabled>Previous</Button>
                    <div className="flex gap-2">
                      <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">Mark for Review</Button>
                      <Button variant="outline">Clear Response</Button>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">Save & Next</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-16 text-slate-500 bg-white rounded-xl border border-dashed">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No questions available</h3>
                  <p>Add some questions in Step 2 to see the student preview.</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Question Palette Sidebar */}
          <div className="w-64 bg-white border-l border-slate-200 p-4 flex flex-col">
            <h4 className="font-semibold text-slate-800 mb-4 text-sm">Question Palette</h4>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {Array.from({ length: selectedQuestions.length || 10 }).map((_, i) => (
                <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium cursor-pointer ${i === 0 ? 'bg-blue-600 text-white' : i === 1 || i === 3 ? 'bg-green-100 text-green-700 border border-green-200' : i === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                  {i + 1}
                </div>
              ))}
            </div>
            
            <div className="mt-auto space-y-3 text-xs text-slate-600">
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-200 rounded" /> Answered</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded" /> Marked for Review</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-100 border border-slate-200 rounded" /> Not Visited</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto py-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500" />
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-3">Exam Ready for Submission</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">Your mock exam <span className="font-semibold text-slate-700">"{formData.title}"</span> is completely configured and ready to be submitted for admin approval.</p>
        
        <div className="grid grid-cols-2 gap-4 mb-8 text-left max-w-lg mx-auto">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Total Questions</p>
            <p className="text-2xl font-bold text-slate-900">{selectedQuestions.length}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Total Marks</p>
            <p className="text-2xl font-bold text-slate-900">{formData.total_marks}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Time Limit</p>
            <p className="text-2xl font-bold text-slate-900">{formData.time_limit} <span className="text-sm font-medium text-slate-500">mins</span></p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Passing Marks</p>
            <p className="text-2xl font-bold text-slate-900">{formData.passing_marks}</p>
          </div>
        </div>
        
        <div className="flex gap-4 pt-4 max-w-md mx-auto">
          <Button variant="outline" className="w-full" onClick={() => router.push('/teacher/mock-exams')}>
            Save & Exit
          </Button>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-md gap-2" onClick={handleSubmit} disabled={loading || selectedQuestions.length === 0}>
            {loading ? "Submitting..." : <><Send className="w-4 h-4"/> Submit for Review</>}
          </Button>
        </div>
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
