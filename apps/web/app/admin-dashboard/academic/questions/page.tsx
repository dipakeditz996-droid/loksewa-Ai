'use client';

import { useState, useEffect, useRef } from 'react';
import { adminQuestionApi, AdminQuestion, QuestionStats } from '@/lib/api/admin-questions';
import { adminCollectionsApi, QuestionCollection } from '@/lib/api/admin-collections';
import { adminApi, AdminTag } from '@/lib/api/admin';
import { publicApi, PublicCourse } from '@/lib/api/public-api';
import Link from 'next/link';
import {
  CheckSquare, Plus, Search, Upload, Download,
  Edit2, Trash2, Copy, BookOpen, Layers,
  Wand2, FolderPlus, ClipboardCheck, Tag as TagIcon,
  ChevronRight, Filter, X, Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InlineLoader } from '@/components/ui/loading-states';
import { AcademicDependentSelect } from '@/components/admin/syllabus/AcademicDependentSelect';
import { QuestionTocSidebar } from '@/components/admin/questions/QuestionTocSidebar';

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [collections, setCollections] = useState<QuestionCollection[]>([]);
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedBulkTagIds, setSelectedBulkTagIds] = useState<number[]>([]);

  // Bulk Academic Mapping Modal
  const [isBulkMapModalOpen, setIsBulkMapModalOpen] = useState(false);
  const [bulkMapCourseId, setBulkMapCourseId] = useState<string>('');
  const [bulkMapCategoryId, setBulkMapCategoryId] = useState<string>('');
  const [bulkMapExamId, setBulkMapExamId] = useState<string>('');
  const [bulkMapSubjectId, setBulkMapSubjectId] = useState<string>('');
  const [bulkMapChapterId, setBulkMapChapterId] = useState<string>('');
  const [bulkMapTopicId, setBulkMapTopicId] = useState<string>('');
  const [bulkMapLoading, setBulkMapLoading] = useState(false);

  // Academic Hierarchy Context Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [activeNodeNames, setActiveNodeNames] = useState<{
    categoryName?: string;
    examName?: string;
    subjectName?: string;
    chapterName?: string;
    topicName?: string;
  }>({});

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedAiStatus, setSelectedAiStatus] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Guards against a slow earlier fetch overwriting a newer one's results.
  const latestRequestId = useRef(0);

  useEffect(() => {
    fetchStats();
    fetchCollections();
    fetchTags();
    fetchCourses();
  }, []);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch, selectedType, selectedStatus, selectedDifficulty, selectedAiStatus,
    selectedTagIds, selectedCourse, selectedCategory, selectedExam, selectedSubject,
    selectedChapter, selectedTopic
  ]);

  useEffect(() => {
    fetchQuestions();
  }, [
    page, debouncedSearch, selectedType, selectedStatus, selectedDifficulty, selectedAiStatus,
    selectedTagIds, selectedCourse, selectedCategory, selectedExam, selectedSubject,
    selectedChapter, selectedTopic
  ]);

  const fetchStats = async () => {
    try {
      const data = await adminQuestionApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  };

  const fetchCollections = async () => {
    try {
      const data = await adminCollectionsApi.getCollections();
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections', error);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await adminApi.getTags({ pageSize: 200 });
      setTags(data.results || []);
    } catch (error) {
      console.error('Failed to load tags', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await publicApi.getCourses();
      setCourses(data || []);
    } catch (error) {
      console.error('Failed to load courses', error);
    }
  };

  const fetchQuestions = async () => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    try {
      const data = await adminQuestionApi.getQuestions({
        page,
        search: debouncedSearch || undefined,
        question_type: selectedType || undefined,
        status: selectedStatus || undefined,
        difficulty: selectedDifficulty || undefined,
        ai_status: selectedAiStatus || undefined,
        tag_objects__in: selectedTagIds.length > 0 ? selectedTagIds.join(',') : undefined,
        course: selectedCourse || undefined,
        category: selectedCategory || undefined,
        exam: selectedExam || undefined,
        subject: selectedSubject || undefined,
        chapter: selectedChapter || undefined,
        topic: selectedTopic || undefined,
      });
      if (requestId !== latestRequestId.current) return;
      const results = Array.isArray(data) ? data : (data.results || []);
      setQuestions(results);
      setHasMore(!Array.isArray(data) && !!data.next);
      setSelectedIds(new Set());
    } catch (error) {
      if (requestId !== latestRequestId.current) return;
      console.error('Failed to load questions:', error);
      toast.error('Failed to load questions');
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
    setPage(1);
  };

  const handleDuplicate = async (id: number) => {
    try {
      await adminQuestionApi.duplicateQuestion(id);
      toast.success('Question duplicated as draft');
      fetchStats();
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to duplicate question');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Move this question to Trash? Historical student attempts remain safe.')) return;
    try {
      await adminQuestionApi.deleteQuestion(id);
      toast.success('Question moved to Trash');
      fetchStats();
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to move question to Trash');
    }
  };

  const handleSinglePermanentDelete = async (id: number) => {
    if (!confirm('⚠️ Are you sure you want to PERMANENTLY delete this question? This action cannot be undone and will not be moved to Trash.')) return;
    try {
      const res = await adminQuestionApi.deleteQuestion(id, true);
      toast.success(res.message || 'Question permanently deleted');
      fetchStats();
      fetchQuestions();
    } catch (error: any) {
      toast.error(error?.data?.error || error?.message || 'Failed to permanently delete question');
    }
  };
  
  const handleBulkAction = async (
    action: 'publish' | 'draft' | 'archive' | 'delete' | 'permanent_delete' | 'add_to_collection' | 'remove_from_collection' | 'add_tags' | 'remove_tags',
    collectionIds?: number[],
    tagIds?: number[]
  ) => {
    if (selectedIds.size === 0) return;
    if (action === 'delete' && !confirm(`Move ${selectedIds.size} questions to Trash?`)) return;
    if (action === 'permanent_delete' && !confirm(`⚠️ PERMANENT DELETE (Shift+Delete):\n\nAre you sure you want to PERMANENTLY delete the ${selectedIds.size} selected question(s)?\n\nThis will permanently remove them from the database without moving to Trash. This action CANNOT be undone.`)) return;

    try {
      const res = await adminQuestionApi.bulkAction(action === 'publish' ? 'approve' : action, Array.from(selectedIds), collectionIds, tagIds);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || `Successfully applied action to ${res.count} questions`);
        setSelectedIds(new Set());
        fetchStats();
        fetchQuestions();
        setIsCollectionModalOpen(false);
        setIsTagModalOpen(false);
        setSelectedBulkTagIds([]);
      }
    } catch (error: any) {
      toast.error(error?.data?.error || error?.message || `Failed to perform action`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (selectedIds.size > 0) {
        if (e.shiftKey && (e.key === 'Delete' || e.key === 'Backspace')) {
          e.preventDefault();
          handleBulkAction('permanent_delete');
        } else if (!e.shiftKey && e.key === 'Delete') {
          e.preventDefault();
          handleBulkAction('delete');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  const handleBulkMapCourseChange = (cid: string) => {
    setBulkMapCourseId(cid);
    const course = courses.find(c => String(c.id) === cid);
    if (course?.exam) {
      if (course.exam.category_id) {
        setBulkMapCategoryId(String(course.exam.category_id));
      }
      setBulkMapExamId(String(course.exam.id));
      setBulkMapSubjectId('');
      setBulkMapChapterId('');
      setBulkMapTopicId('');
    }
  };

  const handleBulkMapSubmit = async () => {
    if (selectedIds.size === 0 || !bulkMapCourseId) {
      toast.error('Please select a target course');
      return;
    }
    if (!confirm(`Are you sure you want to map ${selectedIds.size} questions to this academic scope? Question IDs, text, options, answers, and student history will be preserved.`)) return;

    setBulkMapLoading(true);
    try {
      const res = await adminQuestionApi.bulkAction(
        'map_academic',
        Array.from(selectedIds),
        undefined,
        undefined,
        {
          course_id: Number(bulkMapCourseId),
          exam_id: bulkMapExamId ? Number(bulkMapExamId) : undefined,
          subject_id: bulkMapSubjectId ? Number(bulkMapSubjectId) : undefined,
          chapter_id: bulkMapChapterId ? Number(bulkMapChapterId) : undefined,
          topic_id: bulkMapTopicId ? Number(bulkMapTopicId) : undefined,
        }
      );
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || `Successfully mapped ${res.count} questions`);
        setIsBulkMapModalOpen(false);
        setBulkMapCourseId('');
        setBulkMapExamId('');
        setBulkMapSubjectId('');
        setBulkMapChapterId('');
        setBulkMapTopicId('');
        fetchStats();
        fetchQuestions();
      }
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to apply academic mapping');
    } finally {
      setBulkMapLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDownloadTemplate = async () => {
    try {
      const type = selectedType === 'subjective' ? 'subjective' : (selectedType === 'true_false' ? 'true_false' : 'mcq');
      await adminQuestionApi.downloadTemplate(type);
      toast.success(`Downloaded ${type.toUpperCase()} template`);
    } catch {
      toast.error('Failed to download template');
    }
  };

  const buildCreateUrl = () => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedExam) params.set('position', selectedExam);
    if (selectedSubject) params.set('subject', selectedSubject);
    if (selectedChapter) params.set('chapter', selectedChapter);
    if (selectedTopic) params.set('topic', selectedTopic);
    const qs = params.toString();
    return `/admin-dashboard/academic/questions/create${qs ? `?${qs}` : ''}`;
  };

  const clearAcademicScope = () => {
    setSelectedSubject('');
    setSelectedChapter('');
    setSelectedTopic('');
    setActiveNodeNames(prev => ({
      ...prev,
      subjectName: undefined,
      chapterName: undefined,
      topicName: undefined,
    }));
  };

  const clearEntireAcademicFilter = () => {
    setSelectedCategory('');
    setSelectedExam('');
    setSelectedSubject('');
    setSelectedChapter('');
    setSelectedTopic('');
    setActiveNodeNames({});
  };

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1680px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Master Question Bank</h1>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200/60">
              Syllabus Integrated
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Organize, browse, and edit questions in physical textbook hierarchy: Preparation → Subject → Chapter → Topic.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleDownloadTemplate}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3.5 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm whitespace-nowrap shadow-sm"
            title="Download Excel Template for importing questions"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Download Template
          </button>
          <Link
            href="/admin-dashboard/academic/questions/import"
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm whitespace-nowrap shadow-sm"
          >
            <Upload className="w-4 h-4 text-gray-500" />
            Import Excel
          </Link>
          <Link
            href={buildCreateUrl()}
            className="bg-[#0B2545] hover:bg-[#163E6C] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm shadow-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </Link>
        </div>
      </div>

      {/* Academic Context Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm space-y-3 bg-gradient-to-r from-blue-50/30 via-white to-white">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-blue-700" />
            <span>Academic Preparation Scope</span>
          </div>
          {(selectedCategory || selectedExam || selectedSubject || selectedChapter || selectedTopic) && (
            <button
              onClick={clearEntireAcademicFilter}
              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear Preparation Scope
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AcademicDependentSelect
            category={selectedCategory}
            position={selectedExam}
            subject={selectedSubject}
            chapter={selectedChapter}
            topic={selectedTopic}
            onChange={(field, val) => {
              if (field === 'category') {
                setSelectedCategory(val || '');
                setSelectedExam('');
                setSelectedSubject('');
                setSelectedChapter('');
                setSelectedTopic('');
                setActiveNodeNames({});
              } else if (field === 'position' || field === 'exam') {
                setSelectedExam(val || '');
                setSelectedSubject('');
                setSelectedChapter('');
                setSelectedTopic('');
                setActiveNodeNames(prev => ({
                  ...prev,
                  subjectName: undefined,
                  chapterName: undefined,
                  topicName: undefined,
                }));
              }
            }}
            maxLevel="position"
            requiredLevels={[]}
            layout="grid"
            labels={{
              category: '1. Exam Category',
              position: '2. Preparation / Position',
            }}
          />
        </div>

        {/* Active Academic Breadcrumb Trail */}
        {(selectedCategory || selectedExam || selectedSubject || selectedChapter || selectedTopic) && (
          <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5 text-xs flex-wrap">
            <span className="text-gray-400 font-medium mr-1">Active Scope:</span>
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200/80 font-medium">
                Category #{selectedCategory}
              </span>
            )}
            {selectedExam && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 text-blue-950 border border-blue-300 font-bold">
                  Preparation #{selectedExam}
                </span>
              </>
            )}
            {selectedSubject && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 font-medium">
                  {activeNodeNames.subjectName || `Subject #${selectedSubject}`}
                  <button onClick={() => { setSelectedSubject(''); setSelectedChapter(''); setSelectedTopic(''); }} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </>
            )}
            {selectedChapter && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium">
                  {activeNodeNames.chapterName || `Chapter #${selectedChapter}`}
                  <button onClick={() => { setSelectedChapter(''); setSelectedTopic(''); }} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </>
            )}
            {selectedTopic && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                  {activeNodeNames.topicName || `Topic #${selectedTopic}`}
                  <button onClick={() => setSelectedTopic('')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Two Column Layout: Textbook TOC Sidebar + Questions Management Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Left: Textbook Curriculum TOC */}
        <div className="w-full">
          <QuestionTocSidebar
            categoryId={selectedCategory}
            examId={selectedExam}
            activeSubjectId={selectedSubject}
            activeChapterId={selectedChapter}
            activeTopicId={selectedTopic}
            onSelectNode={(node) => {
              if (node.subjectId !== undefined) setSelectedSubject(node.subjectId ? String(node.subjectId) : '');
              if (node.chapterId !== undefined) setSelectedChapter(node.chapterId ? String(node.chapterId) : '');
              if (node.topicId !== undefined) setSelectedTopic(node.topicId ? String(node.topicId) : '');
              setActiveNodeNames(prev => ({
                ...prev,
                subjectName: node.subjectName,
                chapterName: node.chapterName,
                topicName: node.topicName,
              }));
              setPage(1);
            }}
            onClearFilter={clearAcademicScope}
          />
        </div>

        {/* Right: Question Workspace */}
        <div className="space-y-4 min-w-0">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Questions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
                </div>
                <div className="p-2.5 bg-navy-50 rounded-lg">
                  <Layers className="w-5 h-5 text-navy-600" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active / Approved</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.active}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inactive / Draft</p>
                  <p className="text-2xl font-bold text-gray-700 mt-0.5">{stats.inactive ?? (stats.total - stats.active)}</p>
                </div>
                <div className="p-2.5 bg-gray-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-gray-500" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">AI Pending</p>
                  <p className="text-2xl font-bold text-amber-600 mt-0.5">{stats.ai_pending}</p>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg">
                  <Wand2 className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </div>
          )}

          {/* Search & Filters Toolbar */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center flex-wrap">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <form onSubmit={handleSearch} className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search questions, options, or answers..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-navy-500"
                />
              </form>
              {loading && questions.length > 0 && (
                <InlineLoader text="Refreshing..." className="shrink-0 text-xs" />
              )}
            </div>
            
            <div className="flex gap-2 w-full md:w-auto items-center flex-wrap">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mr-2 bg-navy-50 px-3 py-1.5 rounded-lg border border-navy-100 flex-wrap">
                  <span className="text-xs font-semibold text-navy-800">{selectedIds.size} selected</span>
                  <div className="h-4 w-px bg-navy-200 mx-1"></div>
                  <button onClick={() => setIsBulkMapModalOpen(true)} className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5"/> Reassign Academic Scope
                  </button>
                  <div className="h-4 w-px bg-navy-200 mx-1"></div>
                  <button onClick={() => setIsCollectionModalOpen(true)} className="text-xs font-medium text-indigo-700 hover:text-indigo-800 flex items-center gap-1">
                    <FolderPlus className="w-3 h-3"/> Collection
                  </button>
                  <button onClick={() => setIsTagModalOpen(true)} className="text-xs font-medium text-indigo-700 hover:text-indigo-800 flex items-center gap-1 ml-1">
                    <TagIcon className="w-3 h-3"/> Tags
                  </button>
                  <button onClick={() => handleBulkAction('publish')} className="text-xs font-medium text-green-700 hover:text-green-800 ml-1">Publish</button>
                  <button onClick={() => handleBulkAction('draft')} className="text-xs font-medium text-gray-600 hover:text-gray-800 ml-1">Draft</button>
                  <div className="h-4 w-px bg-navy-200 mx-1"></div>
                  <button onClick={() => handleBulkAction('delete')} className="text-xs font-medium text-amber-700 hover:text-amber-800 ml-1" title="Shortcut: Delete">
                    Move to Trash
                  </button>
                  <button 
                    onClick={() => handleBulkAction('permanent_delete')} 
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1 ml-1 transition-colors"
                    title="Permanently destroy selected questions (Shortcut: Shift + Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Permanent Delete</span>
                    <kbd className="text-[10px] bg-rose-200 text-rose-900 px-1 py-0.2 rounded font-mono font-bold">Shift+Del</kbd>
                  </button>
                </div>
              )}
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-navy-500 max-w-[160px]"
              >
                <option value="">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.title}</option>
                ))}
              </select>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-navy-500"
              >
                <option value="">All Types</option>
                <option value="mcq">MCQ</option>
                <option value="true_false">True / False</option>
                <option value="subjective">Subjective</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-navy-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="rejected">Rejected</option>
                <option value="archived">Archived</option>
              </select>
              <select 
                value={selectedAiStatus} 
                onChange={(e) => setSelectedAiStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-navy-500"
              >
                <option value="">All AI Status</option>
                <option value="pending">Pending AI</option>
                <option value="reviewed">AI Reviewed</option>
                <option value="approved">AI Approved</option>
              </select>
              {tags.length > 0 && (
                <details className="relative">
                  <summary className="list-none cursor-pointer border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5 text-gray-500" />
                    {selectedTagIds.length > 0 ? `${selectedTagIds.length} Tag${selectedTagIds.length > 1 ? 's' : ''}` : 'All Tags'}
                  </summary>
                  <div className="absolute right-0 mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-56 max-h-64 overflow-y-auto">
                    {tags.filter(t => t.is_active).map(t => (
                      <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedTagIds.includes(t.id)}
                          onChange={() => {
                            setSelectedTagIds(prev =>
                              prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                            );
                            setPage(1);
                          }}
                        />
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        {t.name}
                      </label>
                    ))}
                    {selectedTagIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setSelectedTagIds([]); setPage(1); }}
                        className="text-[11px] text-gray-500 hover:text-gray-700 mt-1 px-2 block"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="p-3 w-12 text-center font-semibold">S.N.</th>
                    <th className="p-3 w-10">
                      <input 
                        type="checkbox" 
                        checked={questions.length > 0 && selectedIds.size === questions.length}
                        onChange={toggleSelectAll}
                        className="rounded text-navy-600 focus:ring-navy-500 w-4 h-4"
                      />
                    </th>
                    <th className="p-3 font-semibold">Question Preview</th>
                    <th className="p-3 font-semibold">Course &amp; Academic Scope</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && questions.length === 0 ? (
                    Array.from({ length: 6 }).map((_, r) => (
                      <tr key={r} className="animate-pulse">
                        <td className="p-3 w-12 text-center"><div className="h-4 w-5 bg-gray-200 rounded mx-auto" /></td>
                        <td className="p-3 w-10"><div className="h-4 w-4 bg-gray-200 rounded" /></td>
                        <td className="p-3"><div className="h-4 w-72 bg-gray-200 rounded mb-1.5" /><div className="h-3 w-40 bg-gray-100 rounded" /></td>
                        <td className="p-3"><div className="h-4 w-36 bg-gray-200 rounded mb-1" /><div className="h-3 w-28 bg-gray-100 rounded" /></td>
                        <td className="p-3"><div className="h-5 w-16 bg-gray-200 rounded-full" /></td>
                        <td className="p-3 text-right"><div className="h-7 w-7 bg-gray-200 rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : questions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-gray-500">
                        <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mb-1">
                          {selectedTopic
                            ? `No questions found in this topic yet.`
                            : selectedChapter
                            ? `No questions found in this chapter yet.`
                            : selectedSubject
                            ? `No questions found in this subject yet.`
                            : `No questions found matching your criteria.`}
                        </p>
                        <p className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
                          Questions created or imported under this academic scope will appear here instantly.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <Link
                            href={buildCreateUrl()}
                            className="inline-flex items-center gap-2 bg-[#0B2545] hover:bg-[#163E6C] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Add Question Here
                          </Link>
                          {(selectedSubject || selectedChapter || selectedTopic) && (
                            <button
                              onClick={clearAcademicScope}
                              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors"
                            >
                              View All in Preparation
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    questions.map((q, index) => {
                      const sn = (page - 1) * 25 + index + 1;
                      return (
                        <tr key={q.id} className={`hover:bg-gray-50/80 transition-colors group ${selectedIds.has(q.id) ? 'bg-blue-50/50' : ''}`}>
                          <td className="p-3 w-12 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                            {sn}
                          </td>
                          <td className="p-3 w-10">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.has(q.id)}
                              onChange={() => toggleSelect(q.id)}
                              className="rounded text-navy-600 focus:ring-navy-500 w-4 h-4"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-start gap-2">
                              <span className="font-mono text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap shrink-0">
                                {q.question_id || `Q-${q.id.toString().padStart(6, '0')}`}
                              </span>
                              <div className="min-w-0">
                                <div className="line-clamp-2 text-sm font-medium text-gray-900 max-w-lg">
                                  {q.text}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                  <span>{q.marks} Marks • {q.expected_time_minutes} min</span>
                                  {q.usage_count > 0 && (
                                    <span className="text-blue-600 bg-blue-50 px-1.5 rounded-full flex items-center gap-1">
                                      <Layers className="w-3 h-3" /> In {q.usage_count} sets
                                    </span>
                                  )}
                                  {q.collections && q.collections.length > 0 && (
                                    <span className="text-indigo-600 bg-indigo-50 px-1.5 rounded-full flex items-center gap-1">
                                      <FolderPlus className="w-3 h-3" /> {q.collections.length} Collections
                                    </span>
                                  )}
                                  {q.tag_objects && q.tag_objects.slice(0, 3).map(t => (
                                    <span
                                      key={t.id}
                                      className="px-1.5 rounded-full text-white font-medium"
                                      style={{ backgroundColor: t.color }}
                                    >
                                      {t.name}
                                    </span>
                                  ))}
                                  {q.tag_objects && q.tag_objects.length > 3 && (
                                    <span className="text-gray-500 bg-gray-100 px-1.5 rounded-full">
                                      +{q.tag_objects.length - 3}
                                    </span>
                                  )}
                                  {q.ai_status === 'pending' && (
                                    <span className="text-amber-600 bg-amber-50 px-1.5 rounded-full flex items-center gap-1">
                                      <Wand2 className="w-3 h-3" /> AI Pending
                                    </span>
                                  )}
                                  {q.ai_status === 'approved' && (
                                    <span className="text-emerald-600 bg-emerald-50 px-1.5 rounded-full flex items-center gap-1">
                                      <Wand2 className="w-3 h-3" /> AI Generated
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-xs">
                            <div className="space-y-1 min-w-[190px]">
                              {q.course_title ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-gray-400 w-14 shrink-0 text-[11px]">Course:</span>
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200/60 truncate max-w-[190px]" title={q.course_title}>
                                    {q.course_title}
                                  </span>
                                </div>
                              ) : null}
                              <div className="flex items-baseline gap-1">
                                <span className="font-semibold text-gray-400 w-14 shrink-0 text-[11px]">Position:</span>
                                <span className={q.position_name ? "text-gray-900 font-medium truncate max-w-[190px]" : "text-gray-400 italic text-[11px]"} title={q.position_name || '—'}>
                                  {q.position_name || '—'}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="font-semibold text-gray-400 w-14 shrink-0 text-[11px]">Subject:</span>
                                <span className={q.subject_name ? "text-gray-800 font-medium truncate max-w-[190px]" : "text-gray-400 italic text-[11px]"} title={q.subject_name || '—'}>
                                  {q.subject_name || '—'}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="font-semibold text-gray-400 w-14 shrink-0 text-[11px]">Chapter:</span>
                                <span className={q.chapter_name ? "text-gray-700 truncate max-w-[190px]" : "text-gray-400 italic text-[11px]"} title={q.chapter_name || '—'}>
                                  {q.chapter_name || '—'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              q.status === 'approved' || q.status === 'published' ? 'bg-green-100 text-green-700' : 
                              q.status === 'draft' ? 'bg-gray-100 text-gray-700' : 
                              q.status === 'pending_review' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
                            }`}>
                              {q.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {q.status === 'pending_review' && (
                                <Link 
                                  href={`/admin-dashboard/questions/review/${q.id}`}
                                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                  title="Review Question"
                                >
                                  <ClipboardCheck className="w-4 h-4" />
                                </Link>
                              )}
                              {q.ai_status === 'pending' && (
                                <Link 
                                  href={`/admin-dashboard/academic/questions/${q.id}/edit`}
                                  className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded"
                                  title="Generate AI Options"
                                >
                                  <Wand2 className="w-4 h-4" />
                                </Link>
                              )}
                              <button 
                                onClick={() => handleDuplicate(q.id)}
                                className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-navy-50 rounded"
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <Link 
                                href={`/admin-dashboard/academic/questions/${q.id}/edit`}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Link>
                              <button 
                                onClick={(e) => {
                                  if (e.shiftKey) {
                                    handleSinglePermanentDelete(q.id);
                                  } else {
                                    handleDelete(q.id);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete (Hold Shift to permanently delete)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(hasMore || page > 1) && (
              <div className="flex items-center justify-center gap-4 p-3.5 border-t border-gray-100">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500 font-medium">Page {page}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore || loading}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collection Modal */}
      <Dialog open={isCollectionModalOpen} onOpenChange={setIsCollectionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {selectedIds.size} Question{selectedIds.size !== 1 ? 's' : ''} to Collection</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
            {collections.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No collections yet. <Link href="/admin-dashboard/academic/collections/create" className="text-[#0B2545] underline">Create one first.</Link>
              </p>
            ) : (
              collections.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="collection"
                    value={c.id}
                    checked={selectedCollectionId === String(c.id)}
                    onChange={() => setSelectedCollectionId(String(c.id))}
                    className="w-4 h-4 text-[#0B2545]"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c.color || '#0B2545' }}>
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.question_count ?? 0} questions</p>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCollectionModalOpen(false); setSelectedCollectionId(''); }}>Cancel</Button>
            <Button
              onClick={() => handleBulkAction('add_to_collection', selectedCollectionId ? [parseInt(selectedCollectionId)] : [])}
              disabled={!selectedCollectionId}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              Add Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Modal */}
      <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags to {selectedIds.size} Question{selectedIds.size !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-1 max-h-60 overflow-y-auto">
            {tags.filter(t => t.is_active).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No tags yet. <Link href="/admin-dashboard/academic/tags" className="text-[#0B2545] underline">Create one first.</Link>
              </p>
            ) : (
              tags.filter(t => t.is_active).map(t => (
                <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBulkTagIds.includes(t.id)}
                    onChange={() => setSelectedBulkTagIds(prev =>
                      prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                    )}
                    className="w-4 h-4"
                  />
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <p className="text-sm font-medium text-gray-800">{t.name}</p>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsTagModalOpen(false); setSelectedBulkTagIds([]); }}>Cancel</Button>
            <Button
              onClick={() => handleBulkAction('add_tags', undefined, selectedBulkTagIds)}
              disabled={selectedBulkTagIds.length === 0}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              Add Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Academic Mapping Modal */}
      <Dialog open={isBulkMapModalOpen} onOpenChange={setIsBulkMapModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Map Academic Scope for {selectedIds.size} Question{selectedIds.size !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="bg-blue-50/70 border border-blue-200 text-blue-900 text-xs p-3.5 rounded-lg space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-700" /> Safe Academic Scope Assignment
              </p>
              <p>
                The target academic hierarchy will be validated before committing. Existing question text, options, answers, question IDs, and student attempt histories are strictly preserved.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Target Course <span className="text-red-500">*</span>
              </label>
              <select
                value={bulkMapCourseId}
                onChange={(e) => handleBulkMapCourseChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 font-medium"
              >
                <option value="">Select Target Course</option>
                {courses.map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.title} {c.exam?.title ? `(${c.exam.title})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecting a course automatically scopes the academic selectors below to that course&apos;s curriculum.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <AcademicDependentSelect
                category={bulkMapCategoryId}
                position={bulkMapExamId}
                subject={bulkMapSubjectId}
                chapter={bulkMapChapterId}
                topic={bulkMapTopicId}
                onChange={(field, val) => {
                  if (field === 'category') {
                    setBulkMapCategoryId(val || '');
                    setBulkMapExamId('');
                    setBulkMapSubjectId('');
                    setBulkMapChapterId('');
                    setBulkMapTopicId('');
                  } else if (field === 'position' || field === 'exam') {
                    setBulkMapExamId(val || '');
                    setBulkMapSubjectId('');
                    setBulkMapChapterId('');
                    setBulkMapTopicId('');
                  } else if (field === 'subject') {
                    setBulkMapSubjectId(val || '');
                    setBulkMapChapterId('');
                    setBulkMapTopicId('');
                  } else if (field === 'chapter') {
                    setBulkMapChapterId(val || '');
                    setBulkMapTopicId('');
                  } else if (field === 'topic') {
                    setBulkMapTopicId(val || '');
                  }
                }}
                requiredLevels={['category', 'position']}
                maxLevel="topic"
                layout="grid"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkMapModalOpen(false)} disabled={bulkMapLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkMapSubmit}
              disabled={!bulkMapCourseId || bulkMapLoading}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              {bulkMapLoading ? 'Applying...' : `Apply Mapping (${selectedIds.size} questions)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
