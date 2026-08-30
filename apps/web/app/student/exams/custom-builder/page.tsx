'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, BookOpen, Target, Settings2, PlayCircle, CheckSquare, AlertCircle } from 'lucide-react';
import { studentExamsApi, AcademicHierarchyNode, CustomExamParams } from '@/lib/api/student-exams';

export default function CustomExamBuilder() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<AcademicHierarchyNode[]>([]);
  
  // Form State
  const [scopeMode, setScopeMode] = useState<'position' | 'category'>('position');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [randomQuestions, setRandomQuestions] = useState<boolean>(true);
  const [questionType, setQuestionType] = useState<string>('mcq');

  // Availability State
  const [availableQuestions, setAvailableQuestions] = useState<number | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    studentExamsApi.getAcademicHierarchy()
      .then(data => {
        setHierarchy(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load academic hierarchy.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Reset children when parent changes
    setSelectedPaperId(null);
    setSelectedSubjectId(null);
    setSelectedChapterId(null);
    setSelectedTopicId(null);
  }, [selectedExamId]);

  useEffect(() => {
    setSelectedSubjectId(null);
    setSelectedChapterId(null);
    setSelectedTopicId(null);
  }, [selectedPaperId]);

  useEffect(() => {
    setSelectedChapterId(null);
    setSelectedTopicId(null);
  }, [selectedSubjectId]);

  useEffect(() => {
    setSelectedTopicId(null);
  }, [selectedChapterId]);

  // Debounced Availability Check
  useEffect(() => {
    const scopeId = scopeMode === 'category' ? selectedCategoryId : selectedExamId;
    if (!scopeId) {
      setAvailableQuestions(null);
      return;
    }

    setCheckingAvailability(true);
    const timeoutId = setTimeout(() => {
      studentExamsApi.getAvailableQuestionCount({
        exam_id: scopeMode === 'position' ? selectedExamId! : undefined,
        category_id: scopeMode === 'category' ? selectedCategoryId! : undefined,
        paper_id: scopeMode === 'position' ? (selectedPaperId || undefined) : undefined,
        subject_id: scopeMode === 'position' ? (selectedSubjectId || undefined) : undefined,
        chapter_id: scopeMode === 'position' ? (selectedChapterId || undefined) : undefined,
        topic_id: scopeMode === 'position' ? (selectedTopicId || undefined) : undefined,
        difficulty,
        question_type: questionType
      }).then(count => {
        setAvailableQuestions(count);
        setCheckingAvailability(false);
      }).catch(err => {
        console.error(err);
        setCheckingAvailability(false);
      });
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [scopeMode, selectedCategoryId, selectedExamId, selectedPaperId, selectedSubjectId, selectedChapterId, selectedTopicId, difficulty, questionType]);

  const handleGenerate = async () => {
    const scopeId = scopeMode === 'category' ? selectedCategoryId : selectedExamId;
    if (!scopeId) return;
    if (availableQuestions !== null && questionCount > availableQuestions) {
      alert(`Only ${availableQuestions} questions are available. Please reduce your requested amount.`);
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const params: CustomExamParams = scopeMode === 'category'
        ? {
            category_id: selectedCategoryId!,
            difficulty,
            question_type: questionType,
            question_count: questionCount,
            random_questions: randomQuestions
          }
        : {
            exam_id: selectedExamId!,
            paper_id: selectedPaperId || undefined,
            subject_id: selectedSubjectId || undefined,
            chapter_id: selectedChapterId || undefined,
            topic_id: selectedTopicId || undefined,
            difficulty,
            question_type: questionType,
            question_count: questionCount,
            random_questions: randomQuestions
          };

      const attempt = await studentExamsApi.generateCustomExam(params);

      // Redirect seamlessly to the real examination attempt. The route's
      // [id] segment is the created Examination's id (attempt.examination),
      // not the Position/Level (Exam) the student picked - those are
      // different id spaces, and using selectedExamId here used to send
      // students to a different exam's page entirely whenever the two ids
      // happened to diverge.
      router.push(`/student/exams/${attempt.examination}/attempt/${attempt.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to generate custom exam.");
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Derive available options based on selections
  const categories = hierarchy;
  let allExams: AcademicHierarchyNode[] = [];
  categories.forEach(c => allExams.push(...(c.exams || [])));
  
  const activeExam = allExams.find(e => e.id === selectedExamId);
  const papers = activeExam?.papers || [];
  const activePaper = papers.find(p => p.id === selectedPaperId);
  const subjects = activePaper?.subjects || (activeExam ? activeExam.papers?.flatMap(p => p.subjects || []) : []);
  const activeSubject = subjects?.find(s => s.id === selectedSubjectId);
  const chapters = activeSubject?.chapters || [];
  const activeChapter = chapters.find(c => c.id === selectedChapterId);
  const topics = activeChapter?.topics || [];

  const isFormValid = scopeMode === 'category' ? selectedCategoryId !== null : selectedExamId !== null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push('/student/exams')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Custom Exam Builder</h1>
          <p className="text-muted-foreground text-sm">Design your own mock test targeting specific weak points</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column - Scope Settings */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Exam Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={scopeMode === 'position' ? 'default' : 'outline'}
                    className={`h-auto py-2.5 flex-col items-start text-left ${scopeMode === 'position' ? 'bg-primary text-white' : ''}`}
                    onClick={() => setScopeMode('position')}
                  >
                    <span className="font-semibold text-sm">One Position / Level</span>
                    <span className={`text-xs font-normal ${scopeMode === 'position' ? 'text-white/80' : 'text-muted-foreground'}`}>Narrow down to a topic if you like</span>
                  </Button>
                  <Button
                    type="button"
                    variant={scopeMode === 'category' ? 'default' : 'outline'}
                    className={`h-auto py-2.5 flex-col items-start text-left ${scopeMode === 'category' ? 'bg-primary text-white' : ''}`}
                    onClick={() => setScopeMode('category')}
                  >
                    <span className="font-semibold text-sm">Full Syllabus</span>
                    <span className={`text-xs font-normal ${scopeMode === 'category' ? 'text-white/80' : 'text-muted-foreground'}`}>Every position under a whole category</span>
                  </Button>
                </div>
              </div>

              {scopeMode === 'category' ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category <span className="text-red-500">*</span></label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={selectedCategoryId || ""}
                    onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground pt-1">
                    Pulls questions from every position under this category — e.g. every paper across Central, Provincial, or Institutional exams in it.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Exam <span className="text-red-500">*</span></label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={selectedExamId || ""}
                    onChange={(e) => setSelectedExamId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Select Exam</option>
                    {allExams.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {scopeMode === 'position' && papers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Paper (Optional)</label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={selectedPaperId || ""}
                    onChange={(e) => setSelectedPaperId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">All Papers</option>
                    {papers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {scopeMode === 'position' && (subjects?.length || 0) > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Subject (Optional)</label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={selectedSubjectId || ""}
                    onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">All Subjects</option>
                    {subjects?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {scopeMode === 'position' && chapters.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Chapter (Optional)</label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={selectedChapterId || ""}
                    onChange={(e) => setSelectedChapterId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">All Chapters</option>
                    {chapters.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {scopeMode === 'position' && topics.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Topic (Optional)</label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={selectedTopicId || ""}
                    onChange={(e) => setSelectedTopicId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">All Topics</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" /> Question Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              
              <div>
                <label className="text-sm font-medium mb-3 block">Difficulty</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'easy', 'medium', 'hard', 'mixed'].map((diff) => (
                    <Button 
                      key={diff}
                      variant={difficulty === diff ? "default" : "outline"}
                      className={`h-9 capitalize ${difficulty === diff ? 'bg-primary text-white' : ''}`}
                      onClick={() => setDifficulty(diff as any)}
                    >
                      {diff}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Number of Questions</label>
                <div className="flex flex-wrap gap-2">
                  {[10, 20, 30, 40, 50].map((num) => (
                    <Button 
                      key={num}
                      variant={questionCount === num ? "default" : "outline"}
                      className={`h-9 w-14 ${questionCount === num ? 'bg-primary text-white' : ''}`}
                      onClick={() => setQuestionCount(num)}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="random" 
                  checked={randomQuestions} 
                  onChange={(e) => setRandomQuestions(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="random" className="text-sm font-medium cursor-pointer">Randomize Questions</label>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Column - Status and Action */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="pb-4 border-b bg-muted/20">
              <CardTitle className="text-base">Availability</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-center space-y-4">
              
              {!isFormValid ? (
                <p className="text-sm text-muted-foreground">
                  {scopeMode === 'category' ? 'Select a category to check availability.' : 'Select an exam to check availability.'}
                </p>
              ) : checkingAvailability ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableQuestions === 0 ? (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-sm font-medium">No questions available</p>
                  <p className="text-xs opacity-80">Broaden your filters to find questions.</p>
                </div>
              ) : availableQuestions !== null ? (
                <div className="py-2">
                  <p className="text-4xl font-bold text-primary mb-1">{availableQuestions}</p>
                  <p className="text-sm text-muted-foreground">Available Questions</p>
                  
                  {questionCount > availableQuestions && (
                    <p className="text-xs text-red-500 mt-3 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Please select {availableQuestions} or fewer.
                    </p>
                  )}
                </div>
              ) : null}

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded text-sm text-left border border-red-100">
                  {error}
                </div>
              )}

              <Button 
                className="w-full h-11 text-sm font-semibold mt-4 shadow-md bg-[#22c55e] hover:bg-[#1ea852] text-white" 
                disabled={!isFormValid || generating || checkingAvailability || (availableQuestions !== null && availableQuestions < questionCount) || availableQuestions === 0}
                onClick={handleGenerate}
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Exam...</>
                ) : (
                  <>Generate & Start Exam <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
