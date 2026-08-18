"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Save, 
  Send,
  Eye, 
  ChevronLeft,
  Loader2,
  Sparkles,
  BookOpen,
  HelpCircle,
  Clock,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as teacherQuestionsApi from "@/lib/api/teacher-questions";
import toast from "react-hot-toast";

interface QuestionStudioProps {
  questionId?: string; // If provided, edit mode
}

export default function QuestionStudio({ questionId }: QuestionStudioProps) {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(!!questionId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<teacherQuestionsApi.QuestionData>>({
    text: "",
    question_type: "mcq",
    difficulty: "medium",
    marks: 1,
    negative_marks: 0,
    expected_time_minutes: 1,
    explanation: "",
    tags: "",
    reference: "",
    // MCQ specific
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A",
    // Subjective specific
    model_answer: "",
    // Will hold cascading selection ID (for mock simplicity we use topic ID direct)
    topic: 0
  });

  const [activeTab, setActiveTab] = useState("editor");

  // In a real app we'd fetch this cascading structure from APIs
  // Exam -> Subject -> Chapter -> Topic
  const [mockTopics, setMockTopics] = useState([
    { id: 1, name: "Database Normalization (Database Systems)" },
    { id: 2, name: "Sorting Algorithms (Data Structures)" },
    { id: 3, name: "Operating System Kernels (OS)" },
  ]);

  useEffect(() => {
    if (questionId) {
      const loadQuestion = async () => {
        try {
          const data = await teacherQuestionsApi.getQuestion(Number(questionId));
          setFormData(data);
        } catch (error) {
          toast.error("Failed to load question.");
          router.push("/teacher/questions");
        } finally {
          setInitialFetchLoading(false);
        }
      };
      loadQuestion();
    }
  }, [questionId, router]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      if (questionId) {
        await teacherQuestionsApi.updateQuestion(Number(questionId), formData);
        toast.success("Draft updated");
      } else {
        const created = await teacherQuestionsApi.createQuestion({ ...formData, status: 'draft' });
        toast.success("Question created as draft");
        router.push(`/teacher/questions/${created.id}/edit`);
      }
    } catch (error) {
      toast.error("Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!formData.text || !formData.topic) {
      toast.error("Please fill in question text and select a topic.");
      return;
    }

    try {
      setIsSubmitting(true);
      let targetId = questionId;
      
      // Save first
      if (questionId) {
        await teacherQuestionsApi.updateQuestion(Number(questionId), formData);
      } else {
        const created = await teacherQuestionsApi.createQuestion({ ...formData, status: 'draft' });
        targetId = created.id.toString();
      }
      
      // Then submit
      await teacherQuestionsApi.submitQuestion(Number(targetId));
      toast.success("Question submitted for review successfully");
      router.push("/teacher/questions");
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to submit for review");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initialFetchLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Prevent edits if not draft/changes requested (in case URL is bypassed)
  const isReadOnly = formData.status && !['draft', 'changes_requested'].includes(formData.status);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Studio Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/teacher/questions")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{questionId ? 'Edit Question' : 'New Question'}</h1>
            {formData.status === 'changes_requested' && (
              <Badge variant="destructive" className="mt-1">Changes Requested</Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="preview">Live Preview</TabsTrigger>
            </TabsList>
          </Tabs>

          {!isReadOnly && (
             <>
               <Button variant="outline" onClick={handleSaveDraft} disabled={loading || isSubmitting}>
                 {loading && !isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                 Save Draft
               </Button>
               <Button onClick={handleSubmitForReview} disabled={loading || isSubmitting} className="bg-primary hover:bg-primary/90">
                 {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                 Submit for Review
               </Button>
             </>
          )}
        </div>
      </div>

      {formData.status === 'changes_requested' && formData.reviewer_comment && (
        <div className="flex-shrink-0 bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-900 p-4 px-6 text-sm">
          <strong className="text-red-800 dark:text-red-300 block mb-1">Feedback from Admin:</strong>
          <span className="text-red-700 dark:text-red-400">{formData.reviewer_comment}</span>
        </div>
      )}

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Center Editor Column */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {activeTab === "editor" ? (
            <div className="max-w-4xl mx-auto space-y-8">
              
              <div className="space-y-4">
                <label className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Question Text</label>
                <Textarea 
                  placeholder="Enter your question here..." 
                  className="min-h-[150px] text-lg p-4 resize-y shadow-sm"
                  value={formData.text || ""}
                  onChange={(e) => handleChange("text", e.target.value)}
                  disabled={isReadOnly}
                />
              </div>

              {formData.question_type === 'mcq' && (
                <div className="space-y-4">
                  <label className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Options</label>
                  <div className="grid gap-4 md:grid-cols-2">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const field = `option_${letter.toLowerCase()}` as keyof typeof formData;
                      return (
                        <div key={letter} className={`p-4 rounded-lg border-2 transition-all ${formData.correct_option === letter ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border hover:border-muted-foreground/30'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-lg text-muted-foreground">Option {letter}</span>
                            <div className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                id={`correct-${letter}`}
                                name="correct_option" 
                                className="w-4 h-4 accent-emerald-600"
                                checked={formData.correct_option === letter}
                                onChange={() => handleChange("correct_option", letter)}
                                disabled={isReadOnly}
                              />
                              <label htmlFor={`correct-${letter}`} className="text-sm cursor-pointer select-none font-medium">Mark Correct</label>
                            </div>
                          </div>
                          <Textarea 
                            placeholder={`Enter Option ${letter}...`}
                            className="bg-transparent border-none shadow-none focus-visible:ring-0 p-0 resize-none min-h-[60px]"
                            value={formData[field] as string || ""}
                            onChange={(e) => handleChange(field, e.target.value)}
                            disabled={isReadOnly}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {formData.question_type === 'subjective' && (
                <div className="space-y-4">
                  <label className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Model Answer / Marking Scheme</label>
                  <Textarea 
                    placeholder="Provide a detailed model answer or marking rubric for evaluators..." 
                    className="min-h-[200px]"
                    value={formData.model_answer || ""}
                    onChange={(e) => handleChange("model_answer", e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              )}

              <div className="space-y-4">
                <label className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Explanation (Shown to students after test)</label>
                <Textarea 
                  placeholder="Explain why the correct answer is right and why others are wrong..." 
                  className="min-h-[100px]"
                  value={formData.explanation || ""}
                  onChange={(e) => handleChange("explanation", e.target.value)}
                  disabled={isReadOnly}
                />
              </div>

            </div>
          ) : (
            // Live Preview
            <div className="max-w-3xl mx-auto border rounded-xl shadow-lg bg-card overflow-hidden">
               <div className="bg-primary/5 p-4 border-b border-primary/10 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-primary">Student View Preview</span>
                 </div>
                 <div className="flex gap-2">
                    <Badge variant="outline" className="bg-background">{formData.marks} Marks</Badge>
                    <Badge variant="outline" className="bg-background">{formData.difficulty}</Badge>
                 </div>
               </div>
               <div className="p-8 space-y-8">
                 <div className="prose dark:prose-invert max-w-none text-lg">
                    {formData.text || <span className="text-muted-foreground italic">Question text will appear here...</span>}
                 </div>
                 
                 {formData.question_type === 'mcq' && (
                   <div className="space-y-3">
                     {['A', 'B', 'C', 'D'].map((letter) => {
                       const field = `option_${letter.toLowerCase()}` as keyof typeof formData;
                       const val = formData[field];
                       return (
                         <div key={letter} className="flex items-start p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
                           <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-primary/20 flex items-center justify-center font-bold text-primary mr-4">
                             {letter}
                           </div>
                           <div className="mt-1">{val || <span className="text-muted-foreground italic text-sm">Option {letter} text...</span>}</div>
                         </div>
                       )
                     })}
                   </div>
                 )}

                 {formData.question_type === 'subjective' && (
                   <div className="w-full p-4 min-h-[200px] border rounded-lg bg-muted/10 flex items-center justify-center border-dashed">
                      <span className="text-muted-foreground text-sm">Student will type or upload their answer here</span>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>

        {/* Right Configuration Column */}
        <div className="w-80 border-l bg-muted/5 flex-shrink-0 overflow-y-auto hidden lg:block custom-scrollbar">
          <div className="p-6 space-y-8">
             
             {/* Academic Mapping */}
             <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground font-semibold pb-2 border-b">
                  <BookOpen className="w-4 h-4" /> Academic Map
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Topic / Chapter / Subject</label>
                    <Select 
                      value={formData.topic?.toString()} 
                      onValueChange={(v) => handleChange("topic", Number(v))}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockTopics.map(t => (
                           <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
             </div>

             {/* Configuration */}
             <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground font-semibold pb-2 border-b">
                  <HelpCircle className="w-4 h-4" /> Configuration
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Question Type</label>
                    <Select 
                      value={formData.question_type} 
                      onValueChange={(v) => handleChange("question_type", v)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                        <SelectItem value="subjective">Subjective (Essay/Written)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Difficulty Level</label>
                    <Select 
                      value={formData.difficulty} 
                      onValueChange={(v) => handleChange("difficulty", v)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
             </div>

             {/* Scoring */}
             <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground font-semibold pb-2 border-b">
                  <Award className="w-4 h-4" /> Scoring & Timing
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Marks</label>
                    <Input 
                      type="number" 
                      min="0.5" step="0.5" 
                      value={formData.marks} 
                      onChange={(e) => handleChange("marks", parseFloat(e.target.value))}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Negative</label>
                    <Input 
                      type="number" 
                      min="0" step="0.25" 
                      value={formData.negative_marks} 
                      onChange={(e) => handleChange("negative_marks", parseFloat(e.target.value))}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Time (minutes)
                  </label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={formData.expected_time_minutes} 
                    onChange={(e) => handleChange("expected_time_minutes", parseInt(e.target.value))}
                    disabled={isReadOnly}
                  />
                </div>
             </div>

             {/* Meta */}
             <div className="space-y-4">
                 <div className="flex items-center gap-2 text-foreground font-semibold pb-2 border-b">
                  <Sparkles className="w-4 h-4" /> Meta Data
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma separated)</label>
                  <Input 
                    placeholder="e.g. core-concept, tricky" 
                    value={formData.tags || ""} 
                    onChange={(e) => handleChange("tags", e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Source / Reference</label>
                  <Input 
                    placeholder="e.g. Past Paper 2022" 
                    value={formData.reference || ""} 
                    onChange={(e) => handleChange("reference", e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
}
