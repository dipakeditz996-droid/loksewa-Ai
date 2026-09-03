// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Save, FileText, CheckCircle2, ListPlus, Settings, BookOpen, Search, Sparkles, UploadCloud, Eye, Send, GripVertical, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { teacherPracticeSetsApi, PracticeSet, QuestionSetQuestion } from "@/lib/api/teacher-practice-sets";
import * as teacherQuestionsApi from "@/lib/api/teacher-questions";
import { QuestionData as Question } from "@/lib/api/teacher-questions";
import { apiClient } from "@/lib/api/client";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";

export default function CreatePracticeSetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // State
  const [formData, setFormData] = useState<Partial<PracticeSet>>({
    name: "",
    description: "",
    set_type: "custom",
    status: "draft",
    category: 1, 
    exam: 1, 
    total_questions: 0,
    time_limit: 60,
    passing_marks: 40,
    total_marks: 100,
    marks_per_question: 1,
    negative_marking: false,
    negative_marking_value: 0.2,
    randomize_questions: false,
    randomize_options: false,
  });

  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionSetQuestion[]>([]);

  // Academic scope tree, fetched once. Each exam carries its nested subjects
  // (and each subject its chapters/topics), so no separate per-level fetch is needed.
  const [examTree, setExamTree] = useState<any[]>([]);

  // Modals
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [blueprintConfig, setBlueprintConfig] = useState({ total: 10 });
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    // Only load approved questions for practice sets
    teacherQuestionsApi.getQuestions({ search: searchQ, status: "approved" }).then((res) => {
      setAvailableQuestions(Array.isArray(res) ? res : (res.results || []));
    }).catch(() => {});
  }, [searchQ]);

  useEffect(() => {
    apiClient<any>("/exams/").then((res) => {
      setExamTree(Array.isArray(res) ? res : (res.results || []));
    }).catch(() => setExamTree([]));
  }, []);

  const selectedExam = examTree.find((e) => e.id === formData.exam);
  const subjectsForExam: any[] = selectedExam?.subjects || [];
  const selectedSubject = subjectsForExam.find((s) => s.id === formData.subject);
  const chaptersForSubject: any[] = selectedSubject?.units || selectedSubject?.chapters || [];
  const selectedChapter = chaptersForSubject.find((c) => c.id === formData.chapter);
  const topicsForChapter: any[] = selectedChapter?.topics || [];

  const handleChange = (field: keyof PracticeSet, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleExamChange = (value: string) => {
    const exam = examTree.find((e) => e.id === Number(value));
    setFormData(prev => ({
      ...prev,
      exam: Number(value),
      category: exam?.category ?? prev.category,
      subject: undefined,
      chapter: undefined,
      topic: undefined,
    }));
  };

  const handleSubjectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      subject: value === "all" ? undefined : Number(value),
      chapter: undefined,
      topic: undefined,
    }));
  };

  const handleChapterChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      chapter: value === "all" ? undefined : Number(value),
      topic: undefined,
    }));
  };

  const handleTopicChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      topic: value === "all" ? undefined : Number(value),
    }));
  };

  // Blueprint generation and bulk import both operate on an existing
  // QuestionSet on the backend, so a not-yet-saved draft needs to be
  // persisted first to get an id they can target.
  const ensurePracticeSetId = async (): Promise<number | null> => {
    if (formData.id) return formData.id as number;
    if (!formData.name?.trim()) {
      toast.error("Please enter a title in the Scope tab before adding questions.");
      return null;
    }
    if (!formData.exam) {
      toast.error("Please select an Exam / Position in the Scope tab first.");
      return null;
    }
    try {
      const payload: Partial<PracticeSet> = {
        ...formData,
        status: "draft",
        total_questions: selectedQuestions.length,
        questions_data: selectedQuestions.map(sq => ({
          question_id: sq.question,
          order: sq.order,
          marks: sq.marks,
        })),
      };
      const created = await teacherPracticeSetsApi.createPracticeSet(payload);
      setFormData(prev => ({ ...prev, id: created.id }));
      return created.id as number;
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to save the practice set draft.");
      return null;
    }
  };

  const handleSelectQuestion = (q: Question) => {
    if (selectedQuestions.some(sq => sq.question === q.id)) {
      setSelectedQuestions(prev => prev.filter(sq => sq.question !== q.id));
    } else {
      setSelectedQuestions(prev => [
        ...prev, 
        { 
          question: q.id as number, 
          question_details: q,
          order: prev.length + 1, 
          marks: formData.marks_per_question || 1 
        }
      ]);
    }
  };

  const removeQuestion = (idx: number) => {
    const newQs = [...selectedQuestions];
    newQs.splice(idx, 1);
    newQs.forEach((q, i) => q.order = i + 1);
    setSelectedQuestions(newQs);
  };

  const handleGenerateBlueprint = async () => {
    if (blueprintConfig.total <= 0) {
      toast.error("Enter how many questions to generate.");
      return;
    }
    const id = await ensurePracticeSetId();
    if (!id) return;

    setIsGenerating(true);
    try {
      const result: any = await teacherPracticeSetsApi.generateBlueprint(id, {
        total_questions: blueprintConfig.total,
      });
      if (result.questions_list) {
        setSelectedQuestions(result.questions_list);
      }
      const info = result.generation_info;
      if (info?.warnings?.length) {
        toast.error(info.warnings.join(" "));
      } else {
        toast.success(`Added ${info?.selected ?? blueprintConfig.total} question(s) from the blueprint.`);
      }
      setShowBlueprintModal(false);
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to generate blueprint.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Parses one existing approved question ID per line (or as the first
  // column of a CSV row) - matches the `id` / `question_id` path the
  // backend's bulk-import action supports.
  const parseCsvQuestionIds = (text: string): { id: number }[] => {
    return text
      .split(/\r?\n/)
      .map((line) => line.split(",")[0]?.trim())
      .filter((token): token is string => !!token && token.toLowerCase() !== "id")
      .map((token) => ({ id: Number(token) }))
      .filter((row) => !Number.isNaN(row.id));
  };

  const handleBulkImport = async () => {
    if (!csvContent.trim()) {
      toast.error("Please paste question IDs to import.");
      return;
    }
    const rows = parseCsvQuestionIds(csvContent);
    if (rows.length === 0) {
      toast.error("No valid question IDs found. Paste one approved question ID per line.");
      return;
    }
    const id = await ensurePracticeSetId();
    if (!id) return;

    setIsImporting(true);
    try {
      const result: any = await teacherPracticeSetsApi.bulkImportQuestions(id, rows);
      const updated = await teacherPracticeSetsApi.getPracticeSet(id);
      if (updated.questions_list) {
        setSelectedQuestions(updated.questions_list);
      }
      const errorCount = result.errors?.length || 0;
      toast.success(
        `Imported ${result.added_existing || 0} question(s).${errorCount ? ` ${errorCount} row(s) failed.` : ""}`
      );
      if (errorCount) {
        console.warn("Bulk import errors:", result.errors);
      }
      setShowBulkImportModal(false);
      setCsvContent("");
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to import questions.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSave = async (status: "draft" | "pending_review") => {
    if (!formData.name?.trim()) {
      toast.error("Practice Set title is required");
      return;
    }
    if (status === "pending_review" && selectedQuestions.length === 0) {
      toast.error("You must add at least one question to submit for review");
      return;
    }
    if (!formData.exam) {
      toast.error("Please select an Exam / Position in the Scope tab.");
      return;
    }

    try {
      setLoading(true);
      // status is server-controlled (read-only on the serializer, to stop a
      // teacher from PATCHing their own set straight to approved/published)
      // - sending it here is a no-op the backend silently ignores, so the
      // actual draft -> pending_review transition has to go through the
      // dedicated submit action below.
      const payload: Partial<PracticeSet> = {
        ...formData,
        total_questions: selectedQuestions.length,
        questions_data: selectedQuestions.map(sq => ({
          question_id: sq.question,
          order: sq.order,
          marks: sq.marks
        }))
      };

      // A blueprint/bulk-import run may have already created the draft.
      let savedId = formData.id;
      if (savedId) {
        await teacherPracticeSetsApi.updatePracticeSet(savedId, payload);
      } else {
        const created = await teacherPracticeSetsApi.createPracticeSet(payload);
        savedId = created.id;
      }
      if (status === "pending_review") {
        await teacherPracticeSetsApi.submitPracticeSet(savedId!);
      }
      toast.success(status === "pending_review" ? "Practice Set submitted for review!" : "Draft saved!");
      router.push("/teacher/practice-sets");
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to save practice set");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 flex flex-col min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-card p-4 rounded-xl shadow-sm border border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full bg-muted/50 hover:bg-muted">
            <Link href="/teacher/practice-sets">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Practice Set Studio</h1>
            <p className="text-sm text-muted-foreground">Draft and configure a new assessment</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={loading}>
            Save Draft
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSave("pending_review")} disabled={loading}>
            <Send className="mr-2 h-4 w-4" /> Submit for Review
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl shrink-0 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">1. Scope</TabsTrigger>
          <TabsTrigger value="questions" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            2. Questions 
            {selectedQuestions.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 h-5 px-1.5 min-w-[20px]">{selectedQuestions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">3. Config</TabsTrigger>
          <TabsTrigger value="preview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">4. Preview</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* STEP 1: SCOPE */}
          <TabsContent value="details" className="m-0 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/20 border-b pb-4">
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-blue-500" />
                    Basic Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Title <span className="text-red-500">*</span></Label>
                    <Input id="name" placeholder="e.g. Nepal History Final Mock" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} className="bg-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Brief description for students..." className="min-h-[120px] bg-muted/30" value={formData.description} onChange={(e) => handleChange("description", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Set Type</Label>
                    <Select value={formData.set_type} onValueChange={(val) => handleChange("set_type", val)}>
                      <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Set</SelectItem>
                        <SelectItem value="full_mock">Full Mock Test</SelectItem>
                        <SelectItem value="subject">Subject Wise</SelectItem>
                        <SelectItem value="chapter">Chapter Wise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/20 border-b pb-4">
                  <CardTitle className="text-lg flex items-center">
                    <BookOpen className="mr-2 h-5 w-5 text-purple-500" />
                    Academic Scope
                  </CardTitle>
                  <CardDescription>Link this set to the curriculum</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label>Exam / Position <span className="text-red-500">*</span></Label>
                    <Select value={formData.exam ? String(formData.exam) : undefined} onValueChange={handleExamChange}>
                      <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select Exam" /></SelectTrigger>
                      <SelectContent>
                        {examTree.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject (Optional)</Label>
                    <Select value={formData.subject ? String(formData.subject) : "all"} onValueChange={handleSubjectChange} disabled={!formData.exam}>
                      <SelectTrigger className="bg-muted/30"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjectsForExam.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Chapter (Optional)</Label>
                    <Select value={formData.chapter ? String(formData.chapter) : "all"} onValueChange={handleChapterChange} disabled={!formData.subject}>
                      <SelectTrigger className="bg-muted/30"><SelectValue placeholder="All Chapters" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Chapters</SelectItem>
                        {chaptersForSubject.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Topic (Optional)</Label>
                    <Select value={formData.topic ? String(formData.topic) : "all"} onValueChange={handleTopicChange} disabled={!formData.chapter}>
                      <SelectTrigger className="bg-muted/30"><SelectValue placeholder="All Topics" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Topics</SelectItem>
                        {topicsForChapter.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("questions")} className="bg-blue-600 text-white">Next: Build Questions</Button>
            </div>
          </TabsContent>

          {/* STEP 2: QUESTIONS */}
          <TabsContent value="questions" className="m-0 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <Dialog open={showBlueprintModal} onOpenChange={setShowBlueprintModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 border-purple-200">
                    <Sparkles className="mr-2 h-4 w-4" /> Smart Blueprint
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Generate Smart Blueprint</DialogTitle><DialogDescription>Auto-fill your practice set with approved questions based on criteria.</DialogDescription></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Total Questions to Generate</Label><Input type="number" value={blueprintConfig.total} onChange={e=>setBlueprintConfig({total: parseInt(e.target.value) || 0})} /></div>
                    <p className="text-xs text-muted-foreground">More advanced distribution options (by topic, difficulty) would appear here.</p>
                  </div>
                  <DialogFooter><Button variant="outline" onClick={()=>setShowBlueprintModal(false)}>Cancel</Button><Button onClick={handleGenerateBlueprint} disabled={isGenerating} className="bg-purple-600 text-white">{isGenerating ? "Generating..." : "Generate"}</Button></DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showBulkImportModal} onOpenChange={setShowBulkImportModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200">
                    <UploadCloud className="mr-2 h-4 w-4" /> Bulk Import
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Bulk Import Questions</DialogTitle><DialogDescription>Paste one approved question ID per line (or as the first column of a CSV row) to add them to this set.</DialogDescription></DialogHeader>
                  <div className="py-4"><Textarea className="min-h-[150px]" placeholder="42&#10;57&#10;103" value={csvContent} onChange={e=>setCsvContent(e.target.value)} /></div>
                  <DialogFooter><Button onClick={handleBulkImport} disabled={isImporting}>{isImporting ? "Importing..." : "Process Import"}</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-col md:flex-row gap-6 h-[600px]">
              {/* Question Bank */}
              <Card className="flex-1 flex flex-col border-border/50 shadow-sm overflow-hidden">
                <div className="p-4 bg-muted/20 border-b border-border/50">
                  <h3 className="font-semibold flex items-center justify-between mb-3">
                    <span>Approved Question Bank</span>
                    <Badge variant="outline">{availableQuestions.length}</Badge>
                  </h3>
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search bank..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} className="pl-9 h-9 bg-background" /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-muted/10">
                  {availableQuestions.map((q) => {
                    const isSelected = selectedQuestions.some(sq => sq.question === q.id);
                    return (
                      <div key={q.id} className={`p-3 rounded-lg border transition-all cursor-pointer flex gap-3 ${isSelected ? 'bg-blue-50/80 border-blue-200 shadow-sm' : 'bg-background hover:bg-muted/50 border-transparent hover:border-border'}`} onClick={() => handleSelectQuestion(q)}>
                        <div className={`mt-0.5 shrink-0 h-5 w-5 rounded-md border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-input'}`}>{isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}</div>
                        <div className="flex-1 min-w-0"><p className="text-sm line-clamp-2 text-foreground">{q.text}</p></div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Selected */}
              <Card className="flex-[1.5] flex flex-col border-border/50 shadow-sm overflow-hidden">
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800/30">
                  <h3 className="font-semibold flex items-center justify-between text-blue-900 dark:text-blue-100">
                    <span>Selected Questions</span>
                    <Badge className="bg-blue-600 text-white">{selectedQuestions.length}</Badge>
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                  {selectedQuestions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl p-8 bg-background/50">
                      <ListPlus className="h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium text-foreground">No questions added</p>
                      <p className="text-sm text-center max-w-xs mt-1">Select from the bank or use Smart Blueprint to auto-generate.</p>
                    </div>
                  ) : (
                    selectedQuestions.map((sq, idx) => (
                      <motion.div initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} key={sq.question} className="p-3 border rounded-xl bg-background shadow-sm flex items-start gap-3 group hover:border-blue-300 transition-colors">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-50 group-hover:opacity-100 cursor-grab"><GripVertical className="h-4 w-4" /><span className="text-xs font-bold">{idx + 1}</span></div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-sm font-medium text-foreground">{sq.question_details?.text}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">Marks: {sq.marks}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeQuestion(idx)} className="text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 -mr-1 -mt-1"><Trash2 className="h-4 w-4" /></Button>
                      </motion.div>
                    ))
                  )}
                </div>
              </Card>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setActiveTab("details")}>Back</Button>
              <Button onClick={() => setActiveTab("settings")} className="bg-blue-600 text-white">Next: Configuration</Button>
            </div>
          </TabsContent>

          {/* STEP 3: SETTINGS */}
          <TabsContent value="settings" className="m-0 space-y-6">
            {/* Same configuration UI as before, just restyled */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
               {/* ... Config ... */}
               <CardHeader className="bg-muted/20 border-b">
                 <CardTitle className="text-lg flex items-center"><Settings className="mr-2 h-5 w-5 text-gray-500" /> Exam Rules & Marking</CardTitle>
               </CardHeader>
               <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div><Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-3 block">Timing & Marks</Label>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between"><Label>Time Limit (mins)</Label><Input type="number" className="w-24 text-right" value={formData.time_limit} onChange={e=>handleChange('time_limit', parseInt(e.target.value))} /></div>
                      <div className="flex items-center justify-between"><Label>Total Marks</Label><Input type="number" className="w-24 text-right" value={formData.total_marks} onChange={e=>handleChange('total_marks', parseFloat(e.target.value))} /></div>
                      <div className="flex items-center justify-between"><Label>Passing Marks</Label><Input type="number" className="w-24 text-right" value={formData.passing_marks} onChange={e=>handleChange('passing_marks', parseFloat(e.target.value))} /></div>
                    </div></div>
                 </div>
                 <div className="space-y-6">
                    <div><Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-3 block">Behavior</Label>
                    <div className="space-y-5">
                      <div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Shuffle Questions</Label><p className="text-xs text-muted-foreground">Randomize order for each student</p></div><Switch checked={formData.randomize_questions} onCheckedChange={v=>handleChange('randomize_questions', v)} /></div>
                      <div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Shuffle Options</Label><p className="text-xs text-muted-foreground">Randomize MCQ choices</p></div><Switch checked={formData.randomize_options} onCheckedChange={v=>handleChange('randomize_options', v)} /></div>
                      <div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Negative Marking</Label><p className="text-xs text-muted-foreground">Penalty for wrong answers</p></div><Switch checked={formData.negative_marking} onCheckedChange={v=>handleChange('negative_marking', v)} /></div>
                    </div></div>
                 </div>
               </CardContent>
            </Card>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setActiveTab("questions")}>Back</Button>
              <Button onClick={() => setActiveTab("preview")} className="bg-blue-600 text-white">Next: Preview</Button>
            </div>
          </TabsContent>

          {/* STEP 4: PREVIEW */}
          <TabsContent value="preview" className="m-0 space-y-6">
            <Card className="border-border/50 shadow-sm bg-muted/10">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
                <Eye className="h-12 w-12 text-blue-400 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Student View Preview</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  This simulates how the student will see this practice set in the exam engine.
                </p>
                
                {selectedQuestions.length > 0 ? (
                  <div className="w-full max-w-2xl bg-background rounded-xl border shadow-sm text-left overflow-hidden">
                    <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                      <h3 className="font-semibold">{formData.name || "Untitled Practice Set"}</h3>
                      <div className="text-sm font-medium bg-blue-700 px-3 py-1 rounded-full">{formData.time_limit}:00</div>
                    </div>
                    <div className="p-6">
                      <div className="mb-6 pb-6 border-b">
                        <h4 className="font-medium text-lg mb-4 flex gap-3">
                          <span className="bg-muted text-muted-foreground h-7 w-7 rounded-full flex items-center justify-center text-sm">1</span> 
                          {selectedQuestions[0].question_details?.text}
                        </h4>
                        <div className="space-y-3 pl-10">
                          {([
                            selectedQuestions[0].question_details?.option_a,
                            selectedQuestions[0].question_details?.option_b,
                            selectedQuestions[0].question_details?.option_c,
                            selectedQuestions[0].question_details?.option_d,
                          ]).map((optionText, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 cursor-pointer">
                              <div className="h-4 w-4 rounded-full border border-primary"></div>
                              <span>{optionText}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <Button variant="outline" disabled>Previous</Button>
                        <span className="text-sm text-muted-foreground">Question 1 of {selectedQuestions.length}</span>
                        <Button disabled={selectedQuestions.length === 1}>Next</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-500 font-medium">Add questions to see the preview.</p>
                )}

              </CardContent>
            </Card>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setActiveTab("settings")}>Back</Button>
              <Button onClick={() => handleSave("pending_review")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Send className="mr-2 h-4 w-4" /> Submit to Review Queue
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
